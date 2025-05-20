import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { addUser, getUser } from './users';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const user = getUser(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.subscribed) {
    return res.status(403).json({ error: "User not subscribed" });
  }

  const token = `fake-jwt-token-${email}`; // Use real JWT in production
  res.json({ token });
});

// Signup
router.post('/signup', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (getUser(email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  addUser(email, password); // User starts unsubscribed

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: 'your_stripe_price_id', // Replace with your actual Stripe price ID
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: 'http://localhost:5173/dashboard',
      cancel_url: 'http://localhost:5173/login',
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create Stripe session' });
  }
});

export default router;
