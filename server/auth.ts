// server/auth.ts
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendConfirmationEmail } from './email';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

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
    process.env.JWT_SECRET!, // Add this to your .env file
    { expiresIn: '7d' }
  );

  res.json({ token });
});

// --- SIGNUP ---
router.post('/signup', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!, // Make sure this is set in .env
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `http://localhost:5173/subscription-success?email=${encodeURIComponent(email)}`,
      cancel_url: 'http://localhost:5173/login',
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err);
    res.status(500).json({ error: 'Failed to create Stripe session' });
  }
});

// --- WEBHOOK ---
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<any> => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle subscription completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;

      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.user.update({
            where: { email },
            data: { subscribed: true },
          });
          await sendConfirmationEmail(email);
          console.log(`✅ Marked user subscribed: ${email}`);
        } else {
          console.warn(`⚠️ User not found for email: ${email}`);
        }
      }
    }

    res.json({ received: true });
  }
);

export default router;
