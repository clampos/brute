import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { sendConfirmationEmail } from './email';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
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
      return;
    }

    console.log(`📦 Received event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      let email: string | null = session.customer_email ?? null;

      if (!email && session.customer) {
        try {
          const customerResult = await stripe.customers.retrieve(
            session.customer as string
          );

          if (customerResult.deleted !== true) {
            email = customerResult.email ?? null;
          }
        } catch (err) {
          console.error('❌ Failed to retrieve customer:', err);
        }
      }

      if (email) {
        console.log(`✅ User subscribed: ${email}`);
        const existingUser = await prisma.user.findUnique({ where: { email } });

if (!existingUser) {
  await prisma.user.create({
    data: {
      email,
      password: '', // User won't use this path to log in
      subscribed: true,
      firstName: 'Unknown',
      surname: 'Unknown',
    },
  });
} else {
  await prisma.user.update({
    where: { email },
    data: { subscribed: true },
  });
}


        await sendConfirmationEmail(email);
      } else {
        console.warn('⚠️ Email not found in session or customer');
      }
    }

    res.json({ received: true });
  }
);

export default router;
