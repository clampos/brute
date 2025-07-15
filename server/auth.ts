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

const router = express.Router();

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

// GET /auth/token?email=...
router.get('/token', async (req: Request, res: Response): Promise<any> => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.subscribed) {
    return res.status(403).json({ error: 'User not found or not subscribed' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );

  res.json({ token });
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


export default router;