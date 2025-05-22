```
brute
├─ index.html
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ public
├─ README.md
├─ server
│  ├─ .env
│  ├─ auth.ts
│  ├─ authMiddleware.ts
│  ├─ email.ts
│  ├─ index.ts
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ prisma
│  │  ├─ dev.db
│  │  ├─ migrations
│  │  │  ├─ 20250521152123_init
│  │  │  │  └─ migration.sql
│  │  │  └─ migration_lock.toml
│  │  └─ schema.prisma
│  ├─ protected.ts
│  ├─ routes
│  │  └─ stripe.js
│  ├─ tsconfig.json
│  ├─ users.ts
│  ├─ utils.ts
│  └─ webhook.ts
├─ src
│  ├─ App.tsx
│  ├─ assets
│  │  └─ logo.png
│  ├─ components
│  │  ├─ ProtectedRoute.tsx
│  │  └─ ScreenWrapper.tsx
│  ├─ index.css
│  ├─ legacy
│  │  ├─ Footer.tsx
│  │  ├─ Header.tsx
│  │  ├─ SecondScreen.tsx
│  │  └─ SplashScreen.tsx
│  ├─ main.tsx
│  ├─ screens
│  │  ├─ Dashboard.tsx
│  │  ├─ Login.tsx
│  │  ├─ Onboarding.tsx
│  │  ├─ Signup.tsx
│  │  └─ SubscriptionSuccess.tsx
│  ├─ services
│  │  └─ authService.ts
│  └─ utils
│     └─ auth.ts
├─ tailwind.config.js
├─ tsconfig.json
└─ yarn.lock

```

Message for ChatGPT debugging:
server/auth.ts:
// server/auth.ts
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendConfirmationEmail } from './email';
import { PrismaClient } from '@prisma/client';
import { generateToken } from './utils';

const router = express.Router();
const prisma = new PrismaClient();

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: '2025-04-30.basil',
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// --- LOGIN ---
router.post('/login', async (req: Request, res: Response): Promise<any> => {
const { email, password } = req.body;

const user = await prisma.user.findUnique({ where: { email } });

if (!user || !user.password) {
return res.status(401).json({ error: 'Invalid credentials' });
}

const passwordMatch = await bcrypt.compare(password, user.password);
if (!passwordMatch) {
return res.status(401).json({ error: 'Invalid credentials' });
}

if (!user.subscribed) {
return res.status(403).json({ error: 'User not subscribed' });
}

// Generate JWT
const token = jwt.sign(
{ userId: user.id, email: user.email },
process.env.JWT_SECRET!, // Add this to your .env file
{ expiresIn: '7d' }
);

res.json({ token });
});

// --- SIGNUP ---
router.post('/signup', async (req: Request, res: Response): Promise<any> => {
const { email, password } = req.body;

const existingUser = await prisma.user.findUnique({ where: { email } });
if (existingUser) {
return res.status(400).json({ error: 'User already exists' });
}

const hashedPassword = await bcrypt.hash(password, 10);

await prisma.user.create({
data: {
email,
password: hashedPassword,
},
});

try {
const session = await stripe.checkout.sessions.create({
payment_method_types: ['card'],
mode: 'subscription',
line_items: [
{
price: process.env.STRIPE_PRICE_ID!, // Make sure this is set in .env
quantity: 1,
},
],
customer_email: email,
success_url: http://localhost:5173/subscription-success?email=${encodeURIComponent(email)},
cancel_url: 'http://localhost:5173/login',
});

    res.json({ checkoutUrl: session.url });

} catch (err) {
console.error('❌ Stripe error:', err);
res.status(500).json({ error: 'Failed to create Stripe session' });
}
});

// --- WEBHOOK ---
router.post(
'/webhook',
express.raw({ type: 'application/json' }),
async (req: Request, res: Response): Promise<any> => {
const sig = req.headers['stripe-signature'] as string;
let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed.', err.message);
      return res.status(400).send(Webhook Error: ${err.message});
    }

    // Handle subscription completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;

      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.user.update({
            where: { email },
            data: { subscribed: true },
          });
          await sendConfirmationEmail(email);
          console.log(✅ Marked user subscribed: ${email});
        } else {
          console.warn(⚠️ User not found for email: ${email});
        }
      }
    }

    res.json({ received: true });

}
);

export default router;

server/users.ts:
// server/users.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function addUser(email: string, plainPassword: string) {
const hashed = await bcrypt.hash(plainPassword, 10);
return prisma.user.create({
data: {
email,
password: hashed,
},
});
}

export async function getUser(email: string) {
return prisma.user.findUnique({
where: { email },
});
}

export async function markUserSubscribed(email: string) {
return prisma.user.update({
where: { email },
data: { subscribed: true },
});
}

server/authMiddleware.ts:
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticateToken: RequestHandler = (req, res, next) => {
const authHeader = req.headers['authorization'];
const token = authHeader?.split(' ')[1];

if (!token) {
res.sendStatus(401);
return;
}

try {
const decoded = jwt.verify(token, JWT_SECRET);
(req as any).user = decoded;
next();
} catch {
res.status(403).json({ error: 'Invalid or expired token' });
}
};

server/protected.ts:
// server/protected.ts
import express from 'express';
import {authenticateToken} from './authMiddleware';

const router = express.Router();

router.get('/dashboard', authenticateToken, (req, res) => {
const user = (req as any).user;
res.json({ message: Welcome to your dashboard, ${user.email} });
});

export default router;
