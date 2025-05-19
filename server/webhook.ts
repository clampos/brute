import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { addUser } from './users';

dotenv.config();

const router = express.Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: '2025-04-30.basil',
  }
);

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response): void => {
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed.', err.message);
      res.sendStatus(400);
      return; // Important to exit early
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;

      if (email) {
        console.log(`✅ User subscribed: ${email}`);
        addUser(email);
      }
    }

    res.json({ received: true });
  }
);


export default router;
