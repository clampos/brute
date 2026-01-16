# Stripe Setup and Troubleshooting Guide

## Initial Setup

### 1. Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Verify your email address
3. You'll automatically be in **Test Mode** (recommended for development)

### 2. Get Your API Keys
1. Navigate to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/test/apikeys)
2. You'll see two types of keys:
   - **Publishable key** (starts with `pk_test_`) - used in frontend (not needed for this project)
   - **Secret key** (starts with `sk_test_`) - used in backend ⚠️ Keep this private!

### 3. Create a Product and Price
1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Click **"Add product"**
3. Fill in:
   - **Name**: "BRUTE Monthly Subscription" (or your preferred name)
   - **Description**: Optional
   - **Pricing**: Choose "Recurring"
   - **Price**: Set your monthly price (e.g., $9.99)
   - **Billing period**: Monthly
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_`) - you'll need this for `.env`

### 4. Set Up Webhook Endpoint (For Development)

#### Option A: Using Stripe CLI (Recommended for local development)
```powershell
# Install Stripe CLI (Windows)
# Download from: https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:4242/webhook
```

This will output a webhook signing secret that starts with `whsec_`. Copy this for your `.env` file.

#### Option B: Using Stripe Dashboard (For deployed applications)
1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your endpoint URL: `https://yourdomain.com/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 5. Configure Environment Variables
1. Copy `server/.env.example` to `server/.env`
2. Fill in your values:
```env
JWT_SECRET=your-random-secret-here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PRICE_ID=price_your_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
CLIENT_URL=http://localhost:5173
```

### 6. Test Your Setup
```powershell
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Listen for webhooks (if using Stripe CLI)
stripe listen --forward-to localhost:4242/webhook

# Terminal 3: Start the frontend
npm run dev
```

## Common Issues and Solutions

### ❌ "api_key_expired" Error

**Error Message:**
```
FATAL Error while authenticating with Stripe: Authorization failed, status=401, body={
  "error": {
    "code": "api_key_expired",
    "message": "Expired API Key provided: sk_test_..."
  }
}
```

**Important:** This error can come from two different places:

#### If the error occurs when starting your server:
Your server's API key has expired.

**Solution:**
1. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/test/apikeys)
2. Click **"Create secret key"** to generate a NEW key
3. Give it a name (e.g., "Development Key")
4. Copy the new secret key (starts with `sk_test_`)
5. Update `server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_NEW_KEY_HERE
   ```
6. **Restart your server** (the old process still has the expired key in memory)

#### If the error occurs when running `stripe listen`:
**This is the most common issue!** The Stripe CLI has its own stored credentials that are separate from your server's `.env` file.

**Solution:**
1. Stop the Stripe CLI (Ctrl+C)
2. Re-authenticate the CLI:
   ```powershell
   stripe login
   ```
   This will open your browser to authorize the CLI with your Stripe account
3. After successful login, restart the webhook listener:
   ```powershell
   stripe listen --forward-to localhost:4242/webhook
   ```
4. Copy the new `whsec_...` value and update `STRIPE_WEBHOOK_SECRET` in `server/.env`
5. Restart your server

**Note:** The Stripe CLI stores its credentials in `~/.config/stripe/config.toml` (Linux/Mac) or `%USERPROFILE%\.config\stripe\config.toml` (Windows). When these expire, you must run `stripe login` again.

### ❌ "No signatures found matching the expected signature for payload"

**Cause:** Webhook signature verification is failing.

**Solution:**
1. Make sure you're using the correct webhook secret in `.env`
2. If using Stripe CLI, copy the `whsec_` value from the CLI output
3. Restart your server after updating `.env`

### ❌ "STRIPE_SECRET_KEY environment variable is required"

**Cause:** The `.env` file is missing or not being loaded.

**Solution:**
1. Make sure `server/.env` file exists
2. Check that `STRIPE_SECRET_KEY` is set in the file
3. Restart the server
4. Verify the server is loading the `.env` file (check startup logs)

### ❌ Webhook Events Not Being Received

**Causes:**
- Stripe CLI not running
- Wrong port in webhook URL
- Webhook secret mismatch

**Solution:**
1. Check Stripe CLI is running:
   ```powershell
   stripe listen --forward-to localhost:4242/webhook
   ```
2. Verify your server is running on port 4242
3. Check `STRIPE_WEBHOOK_SECRET` matches the CLI output
4. Look for webhook events in Stripe CLI output

### ❌ "Resource missing" or "No such price"

**Cause:** The `STRIPE_PRICE_ID` in `.env` doesn't exist or is incorrect.

**Solution:**
1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/test/products)
2. Find your product and copy the **Price ID** (starts with `price_`)
3. Update `STRIPE_PRICE_ID` in `server/.env`
4. Restart the server

## Test vs Live Mode

### Test Mode (Development)
- Keys start with `sk_test_` and `pk_test_`
- No real charges are made
- Use test card numbers (e.g., `4242 4242 4242 4242`)
- Access at: [https://dashboard.stripe.com/test](https://dashboard.stripe.com/test)

### Live Mode (Production)
- Keys start with `sk_live_` and `pk_live_`
- Real charges are made ⚠️
- Requires business verification
- Access at: [https://dashboard.stripe.com/live](https://dashboard.stripe.com/live)

**Never commit live keys to version control!**

## Useful Stripe CLI Commands

```powershell
# Login to Stripe
stripe login

# Listen for webhooks
stripe listen --forward-to localhost:4242/webhook

# Trigger a test webhook event
stripe trigger checkout.session.completed

# View recent events
stripe events list

# Test a payment
stripe trigger payment_intent.succeeded
```

## Security Best Practices

1. **Never commit** `.env` file to git (it's in `.gitignore`)
2. **Never share** your secret key publicly
3. **Use test keys** for development
4. **Rotate keys** periodically for security
5. **Use different keys** for each environment (dev, staging, prod)
6. **Restrict key permissions** in Stripe Dashboard when possible

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)
- [Error Codes Reference](https://stripe.com/docs/error-codes)
