import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { sendConfirmationEmail, sendReferralWelcomeEmail, sendReferralRewardEmail } from './email';
import { prisma } from './prisma'; 

dotenv.config();

const router = express.Router();

// Initialize Stripe instance with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

// Helper function to award referral credits
async function awardReferralCredits(referrerId: string, newUserId: string) {
  try {
    // Get referrer and new user details
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId }
    });
    
    const newUser = await prisma.user.findUnique({
      where: { id: newUserId }
    });

    if (!referrer || !newUser) {
      console.error('❌ Referrer or new user not found:', { referrerId, newUserId });
      return;
    }

    // Award 1 month credit to the referrer
    await prisma.user.update({
      where: { id: referrerId },
      data: {
        referralCredits: {
          increment: 1
        },
        freeMonthsEarned: {
          increment: 1
        }
      }
    });

    // Award 1 month credit to the new user (in addition to the discount they already got)
    await prisma.user.update({
      where: { id: newUserId },
      data: {
        referralCredits: {
          increment: 1
        }
      }
    });

    // Send reward email to referrer
    await sendReferralRewardEmail(
      referrer.email,
      referrer.firstName,
      `${newUser.firstName} ${newUser.surname}`,
      newUser.email
    );

    console.log(`✅ Referral credits awarded: Referrer ${referrer.firstName} ${referrer.surname} and New User ${newUser.firstName} ${newUser.surname}`);
  } catch (error) {
    console.error('❌ Error awarding referral credits:', error);
  }
}

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

        // Get metadata from session
        const userId = session.metadata?.userId;
        const referredBy = session.metadata?.referredBy;
        const referralCode = session.metadata?.referralCode;
        const newUserReferralCode = session.metadata?.newUserReferralCode;

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          // Mark user as subscribed
          await prisma.user.update({
            where: { email },
            data: { subscribed: true },
          });

          // Handle referral rewards - award credits to both users
          if (referredBy && referredBy !== '' && userId) {
            console.log('🎁 Processing referral rewards for:', { referredBy, userId });
            await awardReferralCredits(referredBy, userId);
            
            // Send special welcome email for referred users
            const referrer = await prisma.user.findUnique({
              where: { id: referredBy }
            });
            
            if (referrer && newUserReferralCode) {
              await sendReferralWelcomeEmail(
                email,
                `${referrer.firstName} ${referrer.surname}`,
                newUserReferralCode
              );
            }
          } else {
            // Send regular welcome email
            await sendConfirmationEmail(email, newUserReferralCode);
          }
        } else {
          // If user doesn't exist, create a placeholder account
          // This shouldn't happen with your current flow, but good to have as backup
          const newUser = await prisma.user.create({
            data: {
              email,
              password: '', // No password because user signed up via Stripe checkout
              subscribed: true,
              firstName: 'Unknown',
              surname: 'Unknown',
              referralCode: newUserReferralCode || `Unknown${Date.now()}`,
            },
          });
          
          // If this was a referral, award credits
          if (referredBy && referredBy !== '') {
            await awardReferralCredits(referredBy, newUser.id.toString());
          }
          
          await sendConfirmationEmail(email, newUserReferralCode);
        }

        // Log referral info for debugging
        if (referralCode) {
          console.log(`🎁 Referral used: ${referralCode} by ${email}`);
        }
      } else {
        console.warn('⚠️ Email not found in session or customer object.');
      }
    }

    // Handle subscription cancellations
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      
      if (subscription.customer) {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if (customer.deleted !== true && customer.email) {
            const user = await prisma.user.findUnique({ 
              where: { email: customer.email }
            });
            
            if (user) {
              await prisma.user.update({
                where: { id: user.id },
                data: { subscribed: false }
              });
              
              console.log(`❌ Subscription cancelled for: ${customer.email}`);
            }
          }
        } catch (err) {
          console.error('❌ Error handling subscription cancellation:', err);
        }
      }
    }

    else {
      console.log(`ℹ️ Ignored event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
  }
);

export default router;