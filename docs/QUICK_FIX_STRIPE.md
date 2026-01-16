# Quick Fix: Stripe API Key Expired Error

## The Problem
You're seeing this error:
```
FATAL Error while authenticating with Stripe: Authorization failed, status=401
"code": "api_key_expired"
"message": "Expired API Key provided: sk_test_..."
```

## Why This Happens
Your Stripe test API key has expired. Stripe periodically expires test keys for security reasons. Simply updating the same expired key in your `.env` file won't work - you need a **NEW** key from Stripe.

## Quick Fix (5 minutes)

### Step 1: Generate a New Stripe Key
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click **"Create secret key"**
3. Give it a name (e.g., "Development Key - January 2026")
4. Copy the new key (starts with `sk_test_`)

### Step 2: Update Your .env File
1. Open `server/.env` in your editor
2. Replace the old `STRIPE_SECRET_KEY` value with your new key:
   ```env
   STRIPE_SECRET_KEY=sk_test_YOUR_NEW_KEY_HERE
   ```
3. Save the file

### Step 3: Restart Everything
```powershell
# Stop your running server (Ctrl+C)

# Restart the server
cd server
npm run dev

# In another terminal, restart Stripe CLI webhook listener
stripe listen --forward-to localhost:4242/webhook
```

## Verify It's Working
When you restart the server, you should see:
```
🚀 Server running at http://localhost:4242

📌 Environment:
   - JWT_SECRET: ✓ Set
   - STRIPE_SECRET_KEY: ✓ Set
   - STRIPE_WEBHOOK_SECRET: ✓ Set
```

## Still Having Issues?

### "No signatures found matching the expected signature"
Your webhook secret might also need updating:
1. Copy the `whsec_` value from your Stripe CLI output
2. Update `STRIPE_WEBHOOK_SECRET` in `server/.env`
3. Restart the server

### Need More Help?
See the full troubleshooting guide: [docs/STRIPE_SETUP.md](STRIPE_SETUP.md)

## Prevention Tips
- **Test keys expire** - this is normal Stripe behavior for security
- Keep a backup of your `.env.example` file
- When you see expiration errors, always generate a **new** key
- Consider rotating keys every few months
- Use descriptive names when creating keys so you can track them

---

**Need to set up Stripe from scratch?** See: [docs/STRIPE_SETUP.md](STRIPE_SETUP.md)
