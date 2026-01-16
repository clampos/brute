# Quick Fix: Stripe API Key Expired Error

## The Problem
You're seeing this error:
```
FATAL Error while authenticating with Stripe: Authorization failed, status=401
"code": "api_key_expired"
"message": "Expired API Key provided: sk_test_..."
```

## ⚠️ IMPORTANT: Where is the error coming from?

This error can come from **two different places**. Check where you see the error:

### 🔴 If error appears when running `stripe listen`:
**The Stripe CLI has its own expired credentials** (most common issue!)

The CLI stores credentials separately from your server's `.env` file. Even if you updated `STRIPE_SECRET_KEY` in `.env`, the CLI won't use it.

**Solution:**
1. Stop Stripe CLI (Ctrl+C)
2. Re-authenticate the CLI:
   ```powershell
   stripe login
   ```
   (This opens your browser to authorize)
3. After successful login, restart:
   ```powershell
   stripe listen --forward-to localhost:4242/webhook
   ```
4. Copy the new `whsec_...` value from the output
5. Update in `server/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_NEW_VALUE_HERE
   ```
6. Restart your server

### 🔴 If error appears when starting your Node server:
**Your server's `.env` file has an expired key**

**Solution:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click **"Create secret key"**
3. Copy the new key (starts with `sk_test_`)
4. Update in `server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_YOUR_NEW_KEY_HERE
   ```
5. Restart the server

## Why This Happens
- Stripe test API keys expire periodically for security
- The **Stripe CLI stores its own credentials** in `~/.config/stripe/config.toml` (separate from your `.env`)
- When CLI credentials expire, you must run `stripe login` again
- Simply updating `.env` won't fix CLI authentication errors

## Quick Fix for "Key not in my .env" Issue

If you see a key ending (like `...OeLJxl`) that's not in your `.env` file, it's because:
- The error is from the **Stripe CLI**, not your server
- The CLI uses credentials stored in `~/.config/stripe/config.toml` (Windows: `%USERPROFILE%\.config\stripe\config.toml`)
- These credentials are separate from your server's `.env` file

**Fix:** Run `stripe login` to refresh CLI credentials.

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

### Subscription not activating after payment?
This usually means the webhook secret is missing or incorrect.

**Symptoms:**
- Payment goes through successfully
- User appears in Stripe dashboard
- But user can't log in (subscription not marked as active)

**Solution:**
1. Check if `STRIPE_WEBHOOK_SECRET` is set in your `server/.env` file
2. Make sure Stripe CLI is running:
   ```powershell
   stripe listen --forward-to localhost:4242/webhook
   ```
3. Copy the `whsec_...` value from the CLI output
4. Update `STRIPE_WEBHOOK_SECRET` in `server/.env` with this value
5. Restart the server

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
