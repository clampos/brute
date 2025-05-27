import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { sendConfirmationEmail } from './email';
import { prisma } from './prisma'; 

dotenv.config();

const router = express.Router();

// Initialize Stripe instance with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

// Stripe webhook endpoint
router.post(
  '/',
  express.raw({ type: 'application/json' }), // Raw body parser required by Stripe
  async (req: Request, res: Response): Promise<any> => {
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    // Verify that the event came from Stripe
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed.', err.message);
      return res.sendStatus(400);
    }

    console.log(`📦 Received event: ${event.type}`);

    // Handle successful checkout session
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Attempt to get email directly from session
      let email: string | null = session.customer_email ?? null;

      // Fallback: retrieve customer details if email is not present
      if (!email && session.customer) {
        try {
          const customerResult = await stripe.customers.retrieve(
            session.customer as string
          );

          if (customerResult.deleted !== true) {
            email = customerResult.email ?? null;
          }
        } catch (err) {
          console.error('❌ Failed to retrieve customer from Stripe:', err);
        }
      }

      if (email) {
        console.log(`✅ User subscribed: ${email}`);

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
          // If user doesn't exist, create a placeholder account
          await prisma.user.create({
            data: {
              email,
              password: '', // No password because user signed up via Stripe checkout
              subscribed: true,
              firstName: 'Unknown',
              surname: 'Unknown',
            },
          });
        } else {
          // If user exists, mark them as subscribed
          await prisma.user.update({
            where: { email },
            data: { subscribed: true },
          });
        }

        // Send a welcome/confirmation email
        await sendConfirmationEmail(email);
      } else {
        console.warn('⚠️ Email not found in session or customer object.');
      }
    } else {
      console.log(`ℹ️ Ignored event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
  }
);

export default router;
