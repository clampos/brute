// webhook.ts - Improved version with better error handling
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { sendConfirmationEmail, sendReferralWelcomeEmail, sendReferralRewardEmail } from './email';
import { prisma } from './prisma'; 

dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

// Improved helper function with better error handling
async function awardReferralCredits(referrerId: string, newUserId: string) {
  try {
    console.log(`🎁 Starting referral credit award process: ${referrerId} -> ${newUserId}`);
    
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

    // Award credits in separate transactions to prevent rollback issues
    try {
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
      console.log(`✅ Referrer credits awarded: ${referrer.firstName} ${referrer.surname}`);
    } catch (error) {
      console.error('❌ Failed to award referrer credits:', error);
    }

    try {
      await prisma.user.update({
        where: { id: newUserId },
        data: {
          referralCredits: {
            increment: 1
          },
          freeMonthsEarned: {
            increment: 1
          }
        }
      });
      console.log(`✅ New user credits awarded: ${newUser.firstName} ${newUser.surname}`);
    } catch (error) {
      console.error('❌ Failed to award new user credits:', error);
    }

    // Create Stripe billing credits (don't let this block subscription activation)
    try {
      await createStripeBillingCredit(referrer.email, 'Referral reward - you referred a friend!');
      await createStripeBillingCredit(newUser.email, 'Referral bonus - welcome to BRUTE!');
    } catch (error) {
      console.error('❌ Failed to create Stripe billing credits:', error);
      // Don't throw - this shouldn't prevent subscription from activating
    }

    // Send reward email (don't let this block subscription activation)
    try {
      await sendReferralRewardEmail(
        referrer.email,
        referrer.firstName,
        `${newUser.firstName} ${newUser.surname}`,
        newUser.email
      );
    } catch (error) {
      console.error('❌ Failed to send referral reward email:', error);
      // Don't throw - this shouldn't prevent subscription from activating
    }

    console.log(`✅ Referral processing completed successfully`);
  } catch (error) {
    console.error('❌ Error in referral credit process:', error);
    // Don't throw - this shouldn't prevent subscription from activating
  }
}

async function createStripeBillingCredit(email: string, description: string) {
  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.error(`❌ No Stripe customer found for email: ${email}`);
      return;
    }

    const customer = customers.data[0];
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
    const creditAmount = price.unit_amount || 0;

    await stripe.customers.createBalanceTransaction(customer.id, {
      amount: -creditAmount,
      currency: price.currency || 'usd',
      description: description
    });

    console.log(`✅ Stripe billing credit created for ${email}: $${creditAmount/100}`);
  } catch (error) {
    console.error(`❌ Failed to create Stripe billing credit for ${email}:`, error);
    throw error; // Let caller handle this
  }
}

// Improved webhook handler
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<any> => {
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
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📦 Received event: ${event.type} at ${new Date().toISOString()}`);

    // Handle successful checkout session
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`💳 Processing checkout session: ${session.id}`);

      // Get email with fallback logic
      let email: string | null = session.customer_email ?? null;

      if (!email && session.customer) {
        try {
          const customerResult = await stripe.customers.retrieve(session.customer as string);
          if (customerResult.deleted !== true) {
            email = customerResult.email ?? null;
          }
        } catch (err) {
          console.error('❌ Failed to retrieve customer from Stripe:', err);
        }
      }

      if (!email) {
        console.error('❌ No email found for checkout session:', session.id);
        return res.status(400).json({ error: 'No email found' });
      }

      console.log(`✅ Processing subscription for email: ${email}`);

      try {
        // CRITICAL: Mark user as subscribed FIRST, before any other processing
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
          console.error(`❌ User not found for email: ${email}`);
          return res.status(400).json({ error: 'User not found' });
        }

        // Update subscription status immediately
        await prisma.user.update({
          where: { email },
          data: { subscribed: true },
        });

        console.log(`✅ User marked as subscribed: ${email}`);

        // Get metadata for referral processing
        const userId = session.metadata?.userId;
        const referredBy = session.metadata?.referredBy;
        const referralCode = session.metadata?.referralCode;
        const newUserReferralCode = session.metadata?.newUserReferralCode;

        // Process referrals asynchronously (don't block response)
        if (referredBy && referredBy !== '' && userId) {
          console.log('🎁 Processing referral rewards (async):', { referredBy, userId });
          
          // Run referral processing in background
          setImmediate(async () => {
            await awardReferralCredits(referredBy, userId);
            
            // Send welcome email
            try {
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
            } catch (error) {
              console.error('❌ Failed to send referral welcome email:', error);
            }
          });
        } else {
          // Send regular welcome email asynchronously
          setImmediate(async () => {
            try {
              await sendConfirmationEmail(email, newUserReferralCode);
            } catch (error) {
              console.error('❌ Failed to send confirmation email:', error);
            }
          });
        }

        console.log(`✅ Subscription processing completed for: ${email}`);

      } catch (error) {
        console.error('❌ Error processing subscription:', error);
        return res.status(500).json({ error: 'Failed to process subscription' });
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

    // Always acknowledge receipt quickly
    res.json({ received: true });
  }
);

export default router;