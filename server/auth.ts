// server/auth.ts
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendConfirmationEmail, sendReferralWelcomeEmail, sendReferralRewardEmail } from './email';
import { prisma } from './prisma'; 
import { authenticateToken } from './authMiddleware';
import { generateUniqueReferralCode } from './utils/referralUtils';
import {sendPasswordResetEmail} from '../server/email';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();


// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/profile-photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const userId = (req as any).user.userId;
    cb(null, `user-${userId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// --- LOGIN ---
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.subscribed) {
    return res.status(403).json({ error: 'User not subscribed' });
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET!,
    { expiresIn: '1d' }
  );

  res.json({ token });
});

// --- SIGNUP --- (Updated version)
router.post('/signup', async (req: Request, res: Response): Promise<any> => {
  const { email, password, firstName, surname, referralCode } = req.body;

  console.log('🔄 Signup attempt:', { email, firstName, surname, referralCode });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if referral code is valid
  let referrer = null;
  if (referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode }
    });
    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referral code.' });
    }
    console.log('✅ Valid referral code found:', referralCode, 'Referrer:', referrer.firstName, referrer.surname);
  }

  // Generate unique referral code for new user
  const newUserReferralCode = await generateUniqueReferralCode(firstName, surname, prisma);
  console.log('🆔 Generated referral code for new user:', newUserReferralCode);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      surname,
      referralCode: newUserReferralCode,
      referredBy: referrer?.id,
    },
  });

  console.log('👤 New user created:', newUser.id);

  try {
    // Base session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${process.env.CLIENT_URL}/subscription-success?email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.CLIENT_URL}/login`,
      metadata: {
        userId: newUser.id.toString(),
        referredBy: referrer?.id?.toString() || '',
        referralCode: referralCode || '',
        newUserReferralCode: newUserReferralCode,
      },
      // Add trial period for ALL users (30 days free trial)
      subscription_data: {
        trial_period_days: 30,
      }
    };

    // Apply ADDITIONAL referral discount if user was referred
    // This gives them ANOTHER free month on top of the 30-day trial
    if (referrer) {
      console.log('🎁 Applying additional referral discount');
      sessionConfig.discounts = [{
        coupon: 'BFLS4uO9' // Your referral discount coupon - should be for 1 month free
      }];
    }

    console.log('🔄 Creating Stripe session with config:', JSON.stringify(sessionConfig, null, 2));

    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    console.log('✅ Stripe session created successfully:', session.id);
    
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err);
    
    // Clean up user if Stripe session creation fails
    await prisma.user.delete({ where: { id: newUser.id } });
    
    res.status(500).json({ 
      error: 'Failed to create Stripe session',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Add this improved version to your auth.ts file

// GET /auth/token?email=...
router.get('/token', async (req: Request, res: Response): Promise<any> => {
  const email = req.query.email as string;

  console.log(`🔍 Token request for email: ${email} at ${new Date().toISOString()}`);

  if (!email) {
    console.error('❌ Token request missing email');
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        subscribed: true,
        createdAt: true,
        firstName: true,
        surname: true
      }
    });

    console.log(`📊 User found:`, {
      id: user?.id,
      email: user?.email,
      subscribed: user?.subscribed,
      createdAt: user?.createdAt,
      name: user ? `${user.firstName} ${user.surname}` : 'N/A'
    });

    if (!user) {
      console.error(`❌ User not found for email: ${email}`);
      return res.status(404).json({ 
        error: 'User not found',
        debug: { email, timestamp: new Date().toISOString() }
      });
    }

    if (!user.subscribed) {
      console.error(`❌ User not subscribed: ${email}`, {
        userId: user.id,
        subscribed: user.subscribed,
        createdAt: user.createdAt
      });
      return res.status(403).json({ 
        error: 'User not subscribed',
        debug: { 
          email, 
          userId: user.id, 
          subscribed: user.subscribed,
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    console.log(`✅ Token generated successfully for: ${email}`);
    res.json({ token });
    
  } catch (error) {
    console.error('❌ Database error in token endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      debug: { email, timestamp: new Date().toISOString() }
    });
  }
});

// Get user's referral stats
router.get('/referrals', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referredUsers: {
        select: {
          firstName: true,
          surname: true,
          createdAt: true,
          subscribed: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    referralCode: user.referralCode,
    referralCredits: user.referralCredits || 0,
    freeMonthsEarned: user.freeMonthsEarned || 0,
    referredUsers: user.referredUsers,
    totalReferrals: user.referredUsers.length,
    activeReferrals: user.referredUsers.filter(u => u.subscribed).length
  });
});

// Add these endpoints to your auth.ts file

// Change Password endpoint
router.post('/change-password', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { password: true }
    });

    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    console.log(`✅ Password changed for user: ${userId}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password endpoint
router.post('/forgot-password', async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If that email is registered, we\'ve sent a reset link' });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Store reset token in database (you might want to add a passwordResetToken field to your User model)
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        // Add these fields to your Prisma schema:
        // passwordResetToken: String?
        // passwordResetExpires: DateTime?
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour from now
      }
    });

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    console.log(`✅ Password reset email sent to: ${email}`);
    res.json({ message: 'If that email is registered, we\'ve sent a reset link' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password endpoint (for when user clicks link in email)
router.post('/reset-password', async (req: Request, res: Response): Promise<any> => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(token, JWT_SECRET!) as { 
      userId: string, 
      email: string, 
      type: string 
    };

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Check if token exists in database and hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset token is invalid or has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    console.error('❌ Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /auth/delete-account
router.delete('/delete-account', authenticateToken, async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    // Optional: You could first cancel the user's Stripe subscription here if you store subscription ID

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`🗑️ Account deleted for user: ${userId}`);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.get('/dashboard', authenticateToken, async (req, res): Promise<any> => {
  const userId = (req as any).user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        surname: true,
        subscribed: true,
        referralCode: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.subscribed) {
      return res.status(403).json({ error: 'Subscription required' });
    }

    res.json({
      firstName: user.firstName,
      surname: user.surname,
      message: `Welcome back, ${user.firstName}!`,
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/settings
router.get('/settings', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        surname: true,
        email: true,
        subscribed: true,
        referralCode: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/settings
router.get('/workouts', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        surname: true,
        email: true,
        subscribed: true,
        referralCode: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/user/profile-photo - Upload profile photo
router.post(
  "/user/profile-photo",
  authenticateToken,
  upload.single("profilePhoto"),
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create the relative path that will be stored in the database
      const profilePhotoPath = `/uploads/profile-photos/${req.file.filename}`;

      // Update user's profile photo in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          profilePhoto: profilePhotoPath,
        },
      });

      console.log(`✅ Profile photo uploaded for user ${userId}: ${profilePhotoPath}`);
      
      res.json({ 
        message: "Profile photo uploaded successfully",
        profilePhoto: profilePhotoPath 
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);
      res.status(500).json({ error: "Failed to upload profile photo" });
    }
  }
);

// DELETE /auth/user/profile-photo - Remove profile photo
router.delete(
  "/user/profile-photo",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as any).user.userId;

    try {
      // Get current profile photo path
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePhoto: true }
      });

      if (user?.profilePhoto) {
        // Delete the file from filesystem
        const filePath = path.join(__dirname, "../../", user.profilePhoto);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Update database to remove profile photo
      await prisma.user.update({
        where: { id: userId },
        data: {
          profilePhoto: null,
        },
      });

      console.log(`✅ Profile photo removed for user ${userId}`);
      
      res.json({ message: "Profile photo removed successfully" });
    } catch (error) {
      console.error("Profile photo removal error:", error);
      res.status(500).json({ error: "Failed to remove profile photo" });
    }
  }
);

// GET /user/profile
router.get("/user/profile", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).user.userId;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bodyweight: true,
        height: true,
        birthday: true,
        gender: true,
        profilePhoto: true, // Make sure to include profilePhoto
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /user/profile - Updated to handle profile data without photo upload
router.put(
  "/user/profile",
  authenticateToken,
  async (req: Request, res: Response): Promise<any> => {
    const { bodyweight, height, birthday, gender } = req.body;
    const userId = (req as any).user.userId;

    try {
      let birthdayDate = null;
      if (birthday) {
        birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
          return res.status(400).json({ error: "Invalid birthday format" });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          bodyweight: bodyweight || null,
          height: height || null,
          birthday: birthdayDate,
          gender: gender || null,
        },
        select: {
          bodyweight: true,
          height: true,
          birthday: true,
          gender: true,
          profilePhoto: true,
        },
      });

      res.status(200).json({ 
        message: "Profile updated successfully", 
        ...updatedUser 
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Update failed" });
    }
  }
);

// GET /auth/programmes
router.get('/programmes', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const programmes = await prisma.programme.findMany({
      include: {
        exercises: true, // optional, remove if you only want base data
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(programmes);
  } catch (error) {
    console.error('Error fetching programmes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/programmes/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const programme = await prisma.programme.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: [
            { dayNumber: 'asc' },
            { orderIndex: 'asc' },
          ],
        },
      },
    });

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    res.json(programme);
  } catch (error) {
    console.error('Error fetching programme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/programmes', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { name, daysPerWeek, weeks, bodyPartFocus, description } = req.body;

  if (!name || !daysPerWeek || !weeks || !bodyPartFocus) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const programme = await prisma.programme.create({
      data: {
        name,
        daysPerWeek,
        weeks,
        bodyPartFocus,
        description,
      },
    });

    res.status(201).json(programme);
  } catch (error) {
    console.error('Error creating programme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/programmes/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name, daysPerWeek, weeks, bodyPartFocus, description } = req.body;

  try {
    const updated = await prisma.programme.update({
      where: { id },
      data: {
        name,
        daysPerWeek,
        weeks,
        bodyPartFocus,
        description,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating programme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/programmes/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    await prisma.programme.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting programme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get("/random", authenticateToken, async (req, res): Promise<any> => {
  const focus = req.query.focus as string;

  if (!focus) {
    return res.status(400).json({ error: "Missing focus parameter" });
  }

  try {
    const exercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: {
          equals: focus,
        },
      },
    });

    if (exercises.length === 0) {
      return res.status(404).json({ error: "No exercises found for this focus" });
    }

    const random = exercises[Math.floor(Math.random() * exercises.length)];
    res.json(random);
  } catch (err) {
    console.error("Failed to fetch random exercise", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// POST /auth/programmes/:programmeId/exercises
router.post("/programmes/:programmeId/exercises", authenticateToken, async (req, res): Promise<any> => {
  const { programmeId } = req.params;
  const { exerciseId, dayNumber, sets, reps } = req.body;

  if (!exerciseId || !dayNumber) {
    return res.status(400).json({ error: "exerciseId and dayNumber are required" });
  }

  try {
    const newProgrammeExercise = await prisma.programmeExercise.create({
      data: {
        programmeId,
        exerciseId,
        dayNumber,
        sets: sets ?? 3,
        reps: reps ?? "10",
        orderIndex: 0, // could be dynamically calculated later
      },
    });

    return res.status(201).json(newProgrammeExercise);
  } catch (err) {
    console.error("Error adding programme exercise:", err);
    return res.status(500).json({ error: "Failed to add exercise" });
  }
});

// routes/programmeRoutes.ts
router.delete("/exercises/:id", async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    await prisma.programmeExercise.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting programme exercise:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /auth/exercises/random?focus=Lower%20Body

router.get("/exercises/random", authenticateToken, async (req, res): Promise<any> => {
  const { focus } = req.query;

  try {
  const matchingExercises = await prisma.exercise.findMany({
  where: {
    muscleGroup: {
      equals: focus as string,
    },
  },
});


    if (matchingExercises.length === 0) {
      return res.status(404).json({ error: "No exercises found for that focus" });
    }

    const randomIndex = Math.floor(Math.random() * matchingExercises.length);
    const randomExercise = matchingExercises[randomIndex];

    return res.json(randomExercise);
  } catch (err) {
    console.error("Error fetching random exercise:", err);
    return res.status(500).json({ error: "Failed to get random exercise" });
  }
});

// Add these endpoints to your auth.ts file

// GET /auth/exercises - Get exercises by muscle group
router.get("/exercises", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { muscleGroup, category, equipment } = req.query;

  try {
    const whereClause: any = {};

    if (muscleGroup) {
      whereClause.muscleGroup = {
        equals: muscleGroup as string,
        mode: 'insensitive',
      };
    }

    if (category) {
      whereClause.category = {
        equals: category as string,
        mode: 'insensitive',
      };
    }

    if (equipment) {
      whereClause.equipment = {
        equals: equipment as string,
        mode: 'insensitive',
      };
    }

    const exercises = await prisma.exercise.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    });

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/exercises/all - Get all exercises
router.get("/exercises/all", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const exercises = await prisma.exercise.findMany({
      orderBy: [
        { muscleGroup: 'asc' },
        { name: 'asc' }
      ],
    });

    res.json(exercises);
  } catch (error) {
    console.error('Error fetching all exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/exercises - Create new exercise (for admin use)
router.post("/exercises", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { name, muscleGroup, category, equipment, instructions } = req.body;

  if (!name || !muscleGroup || !category) {
    return res.status(400).json({ error: 'Name, muscleGroup, and category are required' });
  }

  try {
    const exercise = await prisma.exercise.create({
      data: {
        name,
        muscleGroup,
        category,
        equipment,
        instructions,
      },
    });

    res.status(201).json(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/muscle-groups - Get all unique muscle groups
router.get("/muscle-groups", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await prisma.exercise.findMany({
      select: {
        muscleGroup: true,
      },
      distinct: ['muscleGroup'],
      orderBy: {
        muscleGroup: 'asc',
      },
    });

    const muscleGroups = result.map(r => r.muscleGroup);
    res.json(muscleGroups);
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/user-programs
router.post("/user-programs", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { programmeId, startDate } = req.body;
  const userId = (req as any).user.userId; // Assuming user ID is available from auth middleware

  try {
    const userProgram = await prisma.userProgram.create({
      data: {
        userId,
        programmeId,
        startDate: new Date(startDate),
        status: 'ACTIVE',
      },
    });

    res.status(201).json(userProgram);
  } catch (error) {
    console.error('Error creating user program:', error);
    res.status(500).json({ error: 'Failed to create user program' });
  }
});

export default router;