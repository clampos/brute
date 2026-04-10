"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const stripe_1 = __importDefault(require("stripe"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const referralUtils_1 = require("../utils/referralUtils");
dotenv_1.default.config();
console.log('DEBUG importStripeCustomers cwd:', process.cwd());
console.log('DEBUG importStripeCustomers __dirname:', __dirname);
console.log('DEBUG DATABASE_URL:', process.env.DATABASE_URL);
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});
async function customerHasActiveSubscription(customerId) {
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 100,
        });
        return subscriptions.data.some((subscription) => ['active', 'trialing'].includes(subscription.status));
    }
    catch (error) {
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
        let startingAfter = undefined;
        while (true) {
            const customerList = await stripe.customers.list({
                limit: 100,
                starting_after: startingAfter,
            });
            console.log(`🔁 Page loaded: ${customerList.data.length} customers, has_more=${customerList.has_more}`);
            for (const customer of customerList.data) {
                if (!customer.email) {
                    noEmail += 1;
                    continue;
                }
                const email = customer.email.trim().toLowerCase();
                const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
                const activeSubscription = await customerHasActiveSubscription(customer.id);
                if (existingUser) {
                    if (activeSubscription && !existingUser.subscribed) {
                        await prisma_1.prisma.user.update({
                            where: { id: existingUser.id },
                            data: { subscribed: true },
                        });
                        updated += 1;
                        console.log(`✅ Marked existing user subscribed: ${email}`);
                    }
                    else {
                        skipped += 1;
                    }
                    continue;
                }
                const fullName = customer.name || 'Unknown User';
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0] || 'Unknown';
                const surname = nameParts.slice(1).join(' ') || 'User';
                const rawPassword = crypto_1.default.randomBytes(16).toString('hex');
                const hashedPassword = await bcrypt_1.default.hash(rawPassword, 10);
                const referralCode = await (0, referralUtils_1.generateUniqueReferralCode)(firstName, surname, prisma_1.prisma);
                await prisma_1.prisma.user.create({
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
    }
    catch (error) {
        console.error('❌ Stripe import failed:', error);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
importStripeCustomers();
