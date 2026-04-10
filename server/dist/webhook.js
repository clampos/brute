"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// webhook.ts - Fixed version with retry logic for race conditions
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const email_1 = require("./email");
const prisma_1 = require("./prisma");
const referralUtils_1 = require("./utils/referralUtils");
dotenv_1.default.config();
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});
// Helper function to wait for user to be created (handles race condition)
async function waitForUser(email, maxRetries = 5, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (user) {
            console.log(`✅ User found on attempt ${i + 1}/${maxRetries}`);
            return user;
        }
        if (i < maxRetries - 1) {
            console.log(`⏳ User not found yet (attempt ${i + 1}/${maxRetries}), waiting ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return null;
}
async function awardReferralCredits(referrerId, newUserId) {
    try {
        console.log(`🎁 Starting referral credit award process: ${referrerId} -> ${newUserId}`);
        const referrer = await prisma_1.prisma.user.findUnique({
            where: { id: referrerId }
        });
        const newUser = await prisma_1.prisma.user.findUnique({
            where: { id: newUserId }
        });
        if (!referrer || !newUser) {
            console.error('❌ Referrer or new user not found:', { referrerId, newUserId });
            return;
        }
        // Award credits in separate transactions to prevent rollback issues
        try {
            await prisma_1.prisma.user.update({
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
        }
        catch (error) {
            console.error('❌ Failed to award referrer credits:', error);
        }
        try {
            await prisma_1.prisma.user.update({
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
        }
        catch (error) {
            console.error('❌ Failed to award new user credits:', error);
        }
        // Create Stripe billing credits (don't let this block subscription activation)
        try {
            await createStripeBillingCredit(referrer.email, 'Referral reward - you referred a friend!');
            await createStripeBillingCredit(newUser.email, 'Referral bonus - welcome to BRUTE!');
        }
        catch (error) {
            console.error('❌ Failed to create Stripe billing credits:', error);
        }
        // Send reward email (don't let this block subscription activation)
        try {
            await (0, email_1.sendReferralRewardEmail)(referrer.email, referrer.firstName, `${newUser.firstName} ${newUser.surname}`, newUser.email);
        }
        catch (error) {
            console.error('❌ Failed to send referral reward email:', error);
        }
        console.log(`✅ Referral processing completed successfully`);
    }
    catch (error) {
        console.error('❌ Error in referral credit process:', error);
    }
}
async function createStripeBillingCredit(email, description) {
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
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
        const creditAmount = price.unit_amount || 0;
        await stripe.customers.createBalanceTransaction(customer.id, {
            amount: -creditAmount,
            currency: price.currency || 'usd',
            description: description
        });
        console.log(`✅ Stripe billing credit created for ${email}: $${creditAmount / 100}`);
    }
    catch (error) {
        console.error(`❌ Failed to create Stripe billing credit for ${email}:`, error);
        throw error;
    }
}
function normalizeFieldLabel(field) {
    if (!field?.label)
        return '';
    if (typeof field.label === 'string')
        return field.label.toLowerCase().trim();
    if (field.label.custom_text?.text) {
        return field.label.custom_text.text.toLowerCase().trim();
    }
    if (field.label.type === 'custom_text' && field.label.custom_text) {
        return String(field.label.custom_text.text || '').toLowerCase().trim();
    }
    return String(field.label?.type || '').toLowerCase().trim();
}
function extractCustomFieldValue(customFields, matchers) {
    for (const field of customFields) {
        const value = field?.text?.value;
        if (!value)
            continue;
        const key = String(field?.key || '').toLowerCase().trim();
        const label = normalizeFieldLabel(field);
        if (matchers.some(matcher => matcher({ key, label }))) {
            return String(value).trim();
        }
    }
    return null;
}
function matchCustomFieldLabel(label, ...keywords) {
    return keywords.some(keyword => label.includes(keyword));
}
// Main webhook handler
router.post('/', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error('❌ Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log(`📦 Received event: ${event.type} at ${new Date().toISOString()}`);
    // Handle successful checkout session
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`💳 Processing checkout session: ${session.id}`);
        console.log(`📊 Session metadata:`, session.metadata);
        // Get email with fallback logic
        let email = session.customer_email ?? null;
        // Fallback: try metadata if present
        if (!email && session.metadata?.email) {
            email = session.metadata.email;
        }
        if (!email && session.customer) {
            try {
                const customerResult = await stripe.customers.retrieve(session.customer);
                if (customerResult.deleted !== true) {
                    email = customerResult.email ?? null;
                }
            }
            catch (err) {
                console.error('❌ Failed to retrieve customer from Stripe:', err);
            }
        }
        if (!email) {
            console.error('❌ No email found for checkout session:', session.id);
            // In development, don't fail hard
            return res.status(200).json({ received: true, warning: 'No email found' });
        }
        console.log(`✅ Processing subscription for email: ${email}`);
        try {
            // Check if user exists
            let existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!existingUser) {
                console.log(`👤 User not found, creating from Stripe payment link: ${email}`);
                // Get customer details from Stripe
                let customerDetails = session.customer_details;
                const customFields = session.custom_fields || [];
                if (!customerDetails && session.customer) {
                    try {
                        const customerResult = await stripe.customers.retrieve(session.customer);
                        if (customerResult.deleted !== true) {
                            customerDetails = {
                                email: customerResult.email || email,
                                name: customerResult.name || 'Unknown User',
                            };
                        }
                    }
                    catch (err) {
                        console.error('❌ Failed to retrieve customer details:', err);
                    }
                }
                console.log('📋 Stripe custom fields:', customFields.map((field) => ({
                    key: field?.key,
                    label: normalizeFieldLabel(field),
                    value: field?.text?.value,
                })));
                const firstNameValue = extractCustomFieldValue(customFields, [
                    ({ key, label }) => key === 'fullname' || key === 'full_name',
                    ({ label }) => matchCustomFieldLabel(label, 'name', 'full name', 'fullname'),
                ]);
                const passwordValue = extractCustomFieldValue(customFields, [
                    ({ key, label }) => key === 'setpassword' || key === 'password',
                    ({ label }) => matchCustomFieldLabel(label, 'password', 'pass'),
                ]);
                const referralValue = extractCustomFieldValue(customFields, [
                    ({ key, label }) => key === 'didanyonereferyou' || key === 'referralcode' || key === 'referral',
                    ({ label }) => matchCustomFieldLabel(label, 'referral', 'referrer', 'code'),
                ]);
                let firstName = 'Unknown';
                let surname = 'User';
                let userPassword = null;
                let referralCodeInput = null;
                // Parse full name
                if (firstNameValue) {
                    const nameParts = firstNameValue.split(' ');
                    firstName = nameParts[0] || 'Unknown';
                    surname = nameParts.slice(1).join(' ') || 'User';
                }
                else if (customerDetails?.name) {
                    const nameParts = customerDetails.name.split(' ');
                    firstName = nameParts[0] || 'Unknown';
                    surname = nameParts.slice(1).join(' ') || 'User';
                }
                // Get password
                if (passwordValue) {
                    userPassword = passwordValue;
                }
                // Get referral code
                if (referralValue) {
                    referralCodeInput = referralValue.trim();
                }
                if (!userPassword) {
                    console.error('❌ No password provided in Stripe payment link custom fields.');
                    return res.status(400).json({ error: 'Password required' });
                }
                // Validate password strength
                const hasUpperCase = /[A-Z]/.test(userPassword);
                const hasLowerCase = /[a-z]/.test(userPassword);
                const hasNumbers = /\d/.test(userPassword);
                if (userPassword.length < 8 || !hasUpperCase || !hasLowerCase || !hasNumbers) {
                    console.error('❌ Password does not meet requirements');
                    return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' });
                }
                const hashedPassword = await bcrypt_1.default.hash(userPassword, 10);
                const referralCode = await (0, referralUtils_1.generateUniqueReferralCode)(firstName, surname, prisma_1.prisma);
                // Check referral code if provided
                let referrer = null;
                if (referralCodeInput) {
                    referrer = await prisma_1.prisma.user.findUnique({
                        where: { referralCode: referralCodeInput },
                    });
                    if (!referrer) {
                        console.log(`⚠️ Invalid referral code provided: ${referralCodeInput}`);
                    }
                }
                // Create user
                existingUser = await prisma_1.prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        surname,
                        referralCode,
                        referredBy: referrer?.id,
                        subscribed: true, // Mark as subscribed immediately
                    },
                });
                const newUserId = existingUser.id;
                console.log(`✅ Created user from Stripe payment link:`, {
                    id: existingUser.id,
                    email: existingUser.email,
                    firstName: existingUser.firstName,
                    surname: existingUser.surname,
                    hasReferrer: !!referrer,
                });
                // Send welcome email
                try {
                    await (0, email_1.sendConfirmationEmail)(email, referralCode);
                    console.log(`✅ Sent welcome email to: ${email}`);
                }
                catch (error) {
                    console.error('❌ Failed to send welcome email:', error);
                }
                // Process referral if applicable
                if (referrer) {
                    setImmediate(async () => {
                        await awardReferralCredits(referrer.id, newUserId);
                    });
                }
            }
            else {
                // Existing user flow - just mark as subscribed
                console.log(`✅ Existing user found:`, {
                    id: existingUser.id,
                    email: existingUser.email,
                    subscribed: existingUser.subscribed
                });
                await prisma_1.prisma.user.update({
                    where: { email },
                    data: { subscribed: true },
                });
                console.log(`✅ User marked as subscribed: ${email}`);
            }
            // Get metadata for referral processing
            const userId = session.metadata?.userId;
            const referredBy = session.metadata?.referredBy;
            const referralCode = session.metadata?.referralCode;
            const newUserReferralCode = session.metadata?.newUserReferralCode;
            console.log(`📊 Referral metadata:`, {
                userId,
                referredBy,
                referralCode,
                newUserReferralCode,
                hasReferrer: !!(referredBy && referredBy !== '')
            });
            // Process referrals asynchronously (don't block response)
            if (referredBy && referredBy !== '' && userId) {
                console.log('🎁 Processing referral rewards (async):', { referredBy, userId });
                // Run referral processing in background
                setImmediate(async () => {
                    await awardReferralCredits(referredBy, userId);
                    // Send welcome email
                    try {
                        const referrer = await prisma_1.prisma.user.findUnique({
                            where: { id: referredBy }
                        });
                        if (referrer && newUserReferralCode) {
                            await (0, email_1.sendReferralWelcomeEmail)(email, `${referrer.firstName} ${referrer.surname}`, newUserReferralCode);
                        }
                    }
                    catch (error) {
                        console.error('❌ Failed to send referral welcome email:', error);
                    }
                });
            }
            else {
                console.log('📧 Sending regular welcome email (no referrer)');
                // Send regular welcome email asynchronously
                setImmediate(async () => {
                    try {
                        await (0, email_1.sendConfirmationEmail)(email, newUserReferralCode);
                    }
                    catch (error) {
                        console.error('❌ Failed to send confirmation email:', error);
                    }
                });
            }
            console.log(`✅ Subscription processing completed for: ${email}`);
        }
        catch (error) {
            console.error('❌ Error processing subscription:', error);
            return res.status(500).json({ error: 'Failed to process subscription' });
        }
    }
    // Handle Stripe customer creation for future syncs
    else if (event.type === 'customer.created') {
        const customer = event.data.object;
        console.log(`👤 Stripe customer created: ${customer.id}`);
        if (customer.email) {
            const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: customer.email } });
            if (!existingUser) {
                const [firstName, surname] = (customer.name || 'Unknown User').split(' ');
                const randomPassword = crypto_1.default.randomBytes(16).toString('hex');
                const hashedPassword = await bcrypt_1.default.hash(randomPassword, 10);
                const referralCode = await (0, referralUtils_1.generateUniqueReferralCode)(firstName || 'Unknown', surname || 'User', prisma_1.prisma);
                await prisma_1.prisma.user.create({
                    data: {
                        email: customer.email,
                        password: hashedPassword,
                        firstName: firstName || 'Unknown',
                        surname: surname || 'User',
                        referralCode,
                        subscribed: false,
                    },
                });
                console.log(`✅ Imported Stripe customer as local user: ${customer.email}`);
            }
            else {
                console.log(`ℹ️ Local user already exists for Stripe customer: ${customer.email}`);
            }
        }
        else {
            console.log('⚠️ Stripe customer created without email; cannot create local user');
        }
    }
    // Handle subscription cancellations
    else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        if (subscription.customer) {
            try {
                const customer = await stripe.customers.retrieve(subscription.customer);
                if (customer.deleted !== true && customer.email) {
                    const user = await prisma_1.prisma.user.findUnique({
                        where: { email: customer.email }
                    });
                    if (user) {
                        await prisma_1.prisma.user.update({
                            where: { id: user.id },
                            data: { subscribed: false }
                        });
                        console.log(`❌ Subscription cancelled for: ${customer.email}`);
                    }
                }
            }
            catch (err) {
                console.error('❌ Error handling subscription cancellation:', err);
            }
        }
    }
    else {
        console.log(`ℹ️ Ignored event type: ${event.type}`);
    }
    // Always acknowledge receipt quickly
    res.json({ received: true });
});
exports.default = router;
