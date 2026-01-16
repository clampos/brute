# BRUTE - Workout Tracking Application

A full-stack TypeScript application for workout tracking and progressive overload management with Stripe subscription integration.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Stripe account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd brute
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd server
npm install
```

4. **Set up environment variables**
```bash
cd server
cp .env.example .env
# Edit .env and add your configuration (see below)
```

5. **Set up the database**
```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

6. **Start the application**

Open two terminal windows:

```bash
# Terminal 1: Start backend (from server directory)
cd server
npm run dev

# Terminal 2: Start frontend (from root directory)
npm run dev
```

The frontend will be available at `http://localhost:5173`  
The backend API will be available at `http://localhost:4242`

## 🔧 Environment Configuration

### Required Environment Variables

Create a `server/.env` file with the following variables:

```env
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Stripe Configuration (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PRICE_ID=price_your_stripe_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Application URLs
CLIENT_URL=http://localhost:5173

# Database (defaults to SQLite)
DATABASE_URL=file:./prisma/dev.db

# Email Service (Optional)
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### Stripe Setup

⚠️ **Important**: Stripe test keys can expire. If you see an "api_key_expired" error:

1. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/test/apikeys)
2. Click "Create secret key" to generate a NEW key
3. Update `STRIPE_SECRET_KEY` in `server/.env`
4. Restart the server

For complete Stripe setup instructions, see: **[docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md)**

## 📖 Documentation

- **[Stripe Setup Guide](docs/STRIPE_SETUP.md)** - Complete guide for Stripe integration and troubleshooting
- **[Frontend Workflows](docs/frontend-programmes-workflows.md)** - Frontend development patterns

## 🛠️ Development Commands

### Frontend (from root directory)
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
```

### Backend (from server directory)
```bash
npm install          # Install dependencies
npm run dev          # Start development server with hot reload
npm run start        # Start production server
```

### Database (from server directory)
```bash
npx prisma migrate dev     # Run migrations
npx prisma db seed         # Seed database with test data
npx prisma generate        # Generate Prisma client
npx prisma studio          # Open Prisma Studio GUI
```

## 🏗️ Project Structure

```
brute
├─ src/                    # Frontend React application
│  ├─ components/          # Reusable components
│  ├─ screens/            # Page components
│  ├─ services/           # API service layer
│  └─ utils/              # Utility functions
├─ server/                # Backend Express API
│  ├─ auth.ts             # Authentication & main routes
│  ├─ webhook.ts          # Stripe webhook handler
│  ├─ prisma/             # Database schema & migrations
│  └─ utils/              # Server utilities
└─ docs/                  # Documentation
```

## 🔐 Security Notes

- Never commit `.env` files to version control
- Keep your Stripe secret keys private
- Use test keys for development
- Rotate API keys periodically

## 🐛 Troubleshooting

### "api_key_expired" Error
Your Stripe API key has expired. See [Stripe Setup Guide](docs/STRIPE_SETUP.md) for solutions.

### "STRIPE_SECRET_KEY environment variable is required"
Make sure you've created `server/.env` file with all required variables.

### Webhook events not received
Ensure Stripe CLI is running: `stripe listen --forward-to localhost:4242/webhook`

For more troubleshooting help, see: [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md)

## 📝 License

[Add your license here]
```
