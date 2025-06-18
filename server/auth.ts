// server/auth.ts
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendConfirmationEmail } from './email';
import { prisma } from './prisma'; 
import { authenticateToken } from './authMiddleware';
import { generateUniqueReferralCode } from './utils/referralUtils';

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

// --- SIGNUP ---
router.post('/signup', async (req: Request, res: Response): Promise<any> => {
  const { email, password, firstName, surname, referralCode } = req.body;

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
  }

  // Generate unique referral code for new user
  const newUserReferralCode = await generateUniqueReferralCode(firstName, surname, prisma);

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
      }
    };

    // Apply referral discount if user was referred
    if (referrer) {
      sessionConfig.discounts = [{
        promotion_code: 'FREEMONTHFORFRIENDS'
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err);
    
    // Clean up user if Stripe session creation fails
    await prisma.user.delete({ where: { id: newUser.id } });
    
    res.status(500).json({ error: 'Failed to create Stripe session' });
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

export default router;