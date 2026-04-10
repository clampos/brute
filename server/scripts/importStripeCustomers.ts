import dotenv from 'dotenv';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { generateUniqueReferralCode } from '../utils/referralUtils';

dotenv.config();

console.log('DEBUG importStripeCustomers cwd:', process.cwd());
console.log('DEBUG importStripeCustomers __dirname:', __dirname);
console.log('DEBUG DATABASE_URL:', process.env.DATABASE_URL);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

async function customerHasActiveSubscription(customerId: string): Promise<boolean> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    return subscriptions.data.some((subscription) =>
      ['active', 'trialing'].includes(subscription.status),
    );
  } catch (error) {
    console.error(`❌ Failed to fetch subscriptions for customer ${customerId}:`, error);
    return false;
  }
}

async function importStripeCustomers() {
  console.log('🔁 Starting Stripe customer import...');

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let noEmail = 0;

  try {
    let startingAfter: string | undefined = undefined;

    while (true) {
        const customerList: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list({
          limit: 100,
          starting_after: startingAfter,
        } as Stripe.CustomerListParams) as Stripe.ApiList<Stripe.Customer>;
      console.log(`🔁 Page loaded: ${customerList.data.length} customers, has_more=${customerList.has_more}`);

      for (const customer of customerList.data) {
        if (!customer.email) {
          noEmail += 1;
          continue;
        }

        const email = customer.email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({ where: { email } });
        const activeSubscription = await customerHasActiveSubscription(customer.id);

        if (existingUser) {
          if (activeSubscription && !existingUser.subscribed) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { subscribed: true },
            });
            updated += 1;
            console.log(`✅ Marked existing user subscribed: ${email}`);
          } else {
            skipped += 1;
          }
          continue;
        }

        const fullName = customer.name || 'Unknown User';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const surname = nameParts.slice(1).join(' ') || 'User';
        const rawPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const referralCode = await generateUniqueReferralCode(firstName, surname, prisma);

        await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            surname,
            referralCode,
            subscribed: activeSubscription,
          },
        });

        imported += 1;
        console.log(`✅ Imported Stripe customer: ${email} (subscribed=${activeSubscription})`);
      }

      if (!customerList.has_more || customerList.data.length === 0) {
        break;
      }

      startingAfter = customerList.data[customerList.data.length - 1].id;
    }

    console.log('🔁 Stripe import complete');
    console.log(`Imported: ${imported}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped existing/active: ${skipped}`);
    console.log(`Skipped missing email: ${noEmail}`);
  } catch (error) {
    console.error('❌ Stripe import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importStripeCustomers();
