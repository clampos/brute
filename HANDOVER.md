## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Running](#setup--running)
5. [Architecture Highlights](#architecture-highlights)
6. [Key Features](#key-features)
7. [Code Patterns & Conventions](#code-patterns--conventions)
8. [Important Files to Know](#important-files-to-know)
9. [Common Development Tasks](#common-development-tasks)
10. [Known Issues & Gotchas](#known-issues--gotchas)
11. [API Endpoints Reference](#api-endpoints-reference)
12. [Next Steps for Development](#next-steps-for-development)

---

## Project Overview

**BRUTE** is built with React + TypeScript (frontend) and Express + TypeScript (backend). It allows users to:

- Create and manage fitness programmes (customizable workout plans)
- Log daily workouts with sets, reps, and weight
- Track progress and see weekly performance stats
- View personal records (PRs) and metrics
- Manage user profiles and settings
- Subscribe and manage plans via Stripe

**Target Users:** Fitness enthusiasts who want detailed workout tracking and progressive overload management.

---

## Tech Stack

### Frontend

- **Framework:** React 19.1.0 with React Router v7.6.0
- **Language:** TypeScript
- **Build Tool:** Vite 6.3.5
- **UI Library:** Tailwind CSS 3.4.1
- **Icons:** Lucide React + custom PNG icons
- **State Management:** React hooks (useState, useEffect, useRef, useContext)
- **API Client:** Fetch API (no external libraries)

### Backend

- **Framework:** Express.js with TypeScript
- **Database:** SQLite with Prisma ORM
- **Authentication:** JWT-based (localStorage on frontend, Bearer tokens in requests)
- **Payment:** Stripe integration for subscriptions
- **File Uploads:** Multer for profile photo uploads
- **Hot Reload (Dev):** ts-node-dev

### Development Tools

- **Package Manager:** npm
- **TypeScript:** 5.8.3
- **Build Process:** `tsc && vite build` (compiles TS, then bundles with Vite)

---

## Project Structure

```
brute/
├── src/                          # Frontend (React app)
│   ├── screens/                  # Page components (ONLY edit .tsx files)
│   │   ├── Dashboard.tsx         # Main dashboard with overview & performance tabs
│   │   ├── Workouts.tsx          # Daily workout page with exercise tracking
│   │   ├── Programmes.tsx        # Browse & manage fitness programmes
│   │   ├── ProgrammeEditor.tsx   # Create/edit exercise schedules
│   │   ├── Metrics.tsx           # View personal records & analytics
│   │   ├── Settings.tsx          # User profile & preferences
│   │   ├── Login.tsx / Signup.tsx
│   │   ├── SubscriptionSuccess.tsx
│   │   └── MuscleIcons.tsx       # Reference screen for muscle group icons
│   ├── components/               # Reusable React components
│   │   ├── TopBar.tsx           # Navigation header with menu
│   │   ├── BottomBar.tsx        # Tab navigation footer
│   │   ├── MuscleIcon.tsx       # Displays body part icons (uses PNG images)
│   │   ├── WorkoutCompletionPopup.tsx
│   │   ├── ProtectedRoute.tsx   # Requires authentication
│   │   └── [other components]
│   ├── services/                 # API communication
│   │   └── authService.ts       # Auth-related API calls
│   ├── utils/                    # Utilities
│   │   ├── auth.ts              # JWT & auth helpers
│   │   └── unitConversions.ts   # Weight/measurement conversions
│   ├── contexts/
│   │   └── MenuContext.tsx      # Global menu state
│   ├── assets/
│   │   ├── Icons/               # PNG icons for muscle groups
│   │   │   ├── Chest Icon.png
│   │   │   ├── Back Icon Muscle.png
│   │   │   ├── Shoulder Icon.png
│   │   │   ├── Bicep Icon.png
│   │   │   ├── Leg Icon.png
│   │   │   └── Calves Icon.png
│   │   └── [other images]
│   ├── App.tsx                  # Main app + route definitions
│   ├── main.tsx                 # Entry point
│   └── index.css               # Global styles

server/                          # Backend (Express + Prisma)
├── auth.ts                      # Authentication & main API routes (1000+ lines)
├── protected.ts                 # Protected API routes
├── programmes.ts               # Programme-related logic
├── authMiddleware.ts            # JWT verification middleware
├── webhook.ts                   # Stripe webhook handler
├── email.ts                     # Email service (Resend/Nodemailer)
├── index.ts                     # Express app setup
├── prisma.ts                    # Prisma client singleton
├── utils/
│   ├── progressiveOverloadService.ts  # Calculates workout progression
│   └── referralUtils.ts
├── prisma/
│   ├── schema.prisma           # Data model & migrations
│   ├── seed.ts                 # Populate dev database
│   ├── dev.db                  # SQLite database
│   └── migrations/             # Schema version history
└── package.json

├── package.json                # Frontend dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind CSS customization
├── vite.config.ts              # Vite bundler config
├── index.html                  # HTML entry point
├── .env                        # Environment variables (frontend - mostly empty)
└── README.md
```

**IMPORTANT FILE SYNC NOTE:**

- `/src/screens/` contains ONLY `.tsx` files (TypeScript source)
- `.js` files are **auto-generated** during build (`npm run build`)
- **Always edit `.tsx` files, never manually edit `.js` files**
- If files become out of sync, delete the `.js` files and rebuild

---

## Setup & Running

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 10+

### Initial Setup

```powershell
# Clone/open the project
cd brute

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install

# Create .env file in server/ with required variables:
# JWT_SECRET=your_jwt_secret_here
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PRICE_ID=price_...
# CLIENT_URL=http://localhost:5174
# DATABASE_URL=file:./prisma/dev.db

# (Optional) Set up Prisma and seed database
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

### Running in Development

**Terminal 1 (Frontend):**

```powershell
cd brute
npm run dev
# Vite dev server runs at http://localhost:5174
```

**Terminal 2 (Backend):**

```powershell
cd brute/server
npm run dev
# Express runs at http://localhost:4242
# Uses ts-node-dev for hot reload
```

### Building for Production

```powershell
cd brute

# Frontend
npm run build
# Outputs to dist/

# Backend
cd server
npm run build
npm run start
```

### Common Commands

```powershell
# Frontend
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build locally

# Backend
npm run dev       # Start dev server with hot reload
npm run build     # Compile TypeScript
npm run start     # Start compiled server
npm run lint      # Check for errors (if configured)
```

---

## Architecture Highlights

### 1. Frontend Architecture

**React + Router + Context API**

- Routes defined in `src/App.tsx`
- Protected routes via `ProtectedRoute.tsx` component
- Persistent state stored in localStorage (JWT token, workout sessions)
- Each screen is a full page with top/bottom navigation

**Key State Management Pattern:**

```tsx
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:4242/api/endpoint", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### 2. Backend Architecture

**Monolithic Express API**

- Main route handler in `server/auth.ts` (contains ~70% of endpoints)
- Mounted at `/auth` and `/api` prefixes in `server/index.ts`
- Prisma ORM with SQLite database
- `authenticateToken` middleware checks JWT and populates `req.user.userId`

**Key Patterns:**

```typescript
// Middleware pattern
app.post("/endpoint", authenticateToken, async (req, res) => {
  const userId = req.user.userId; // From middleware
  // ... logic
});

// Database access
import { prisma } from "./prisma";
const user = await prisma.user.findUnique({ where: { id: userId } });

// Error handling
try {
  // ...
} catch (error) {
  res.status(500).json({ error: "Descriptive message" });
}
```

### 3. Authentication Flow

1. User signs up via `Signup.tsx` → calls `POST /auth/signup`
2. Backend creates user with hashed password (bcrypt)
3. Returns JWT token
4. Frontend stores JWT in `localStorage.getItem("token")`
5. All subsequent requests include `Authorization: Bearer {jwt}`
6. `authenticateToken` middleware verifies token and extracts `userId`
7. On logout, frontend removes token from localStorage

### 4. Database Schema Highlights

Key models:

- **User:** id, email, password, firstName, surname, profilePhoto, referralCode
- **Programme:** id, name, weeks, daysPerWeek, bodyPartFocus, exercises
- **UserProgram:** id, userId, programmeId, status (ACTIVE/COMPLETED/CANCELLED), currentWeek, currentDay
- **Workout:** id, userId, userProgramId, date, duration, exercises
- **WorkoutSet:** id, workoutId, exerciseId, weight, reps, completed
- **Exercise:** id, name, muscleGroup (used in recommendations)

Prisma uses CUID for string IDs and snake_case in DB via `@map`.

### 5. Stripe Integration

- Webhook at `/webhook` (must be before `bodyParser.json()`)
- Handles `subscription` events
- Updates user subscription status when payment confirmed
- `POST /auth/create-checkout-session` initiates checkout

### 6. File Uploads

- Multer stores files in `uploads/profile-photos`
- Express serves via `app.use('/uploads', express.static(...))`
- Database stores relative path: `/uploads/profile-photos/user-{id}.jpg`

---

## Key Features

### 1. Dashboard (Overview Tab)

- Shows today's workout from active programme
- Quick action button to start workout
- Active programme banner with progress info

### 2. Dashboard (Performance Tab)

- "Workouts This Week" bar chart with exercises/sets breakdown
- Side-by-side bars: green (exercises) vs purple (sets)
- Common max scaling so bars show proportional heights
- Hover tooltips show exact counts
- Singular/plural logic ("1 Exercise" vs "2 Exercises")

### 3. Workouts Page

- Displays current day's exercises from active programme
- Timer for workout duration
- Set tracking: weight, reps, completion checkbox
- "Complete Workout" button shows stats modal after completion
- Loads next day's exercises without page reload
- Saves workout session to localStorage (persists if browser closes)
- Warning modal if leaving mid-workout

### 4. Programmes

- Lists all fitness programmes grouped by body part focus
- Active programme highlighted with green checkmark
- Warning modal if switching to different programme
- Can edit or start a programme
- Completed programmes shown in "Previous" tab

### 5. Programme Editor

- Visual day/exercise schedule builder
- Add/remove/reorder exercises
- Set reps and sets per exercise

### 6. Metrics

- Personal records (1RM, 2RM, 3RM, 5RM, 10RM) for each exercise
- Filter by muscle group using icon buttons
- Shows exercises you've tracked

### 7. Settings

- User profile editing (first name, surname, profile photo)
- Password change
- Subscription management

---

## Code Patterns & Conventions

### TypeScript Naming

- Components: PascalCase (`Dashboard.tsx`)
- Functions: camelCase (`fetchUserProgram()`)
- Constants: UPPER_SNAKE_CASE (`REP_CAP = 15`)
- Interfaces/Types: PascalCase (`UserProgram`, `WeeklyStats`)

### React Component Pattern

```tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  onClose: () => void;
}

export default function MyComponent({ title, onClose }: Props) {
  const [state, setState] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Setup/cleanup
  }, []);

  return <div>{/* JSX */}</div>;
}
```

### Styling

- All components use Tailwind CSS class names
- Dark theme colors:
  - Background: `#0A0E1A` (darkest)
  - Surface: `#1C1F26` (dark cards)
  - Border: `#2F3544` (subtle divider)
  - Text muted: `#5E6272` (gray)
  - Text normal: `white`
- Accent colors:
  - Green: `#00FFAD` (highlights, success)
  - Blue: `#246BFD` (primary, buttons)
  - Purple: `#9C6BFF` (secondary)
  - Pink: `#FBA3FF` (tertiary)

### API Response Pattern

```typescript
// Successful response
{ success: true, data: {...} }

// Error response
{ error: "Descriptive message" }

// Status codes: 200, 400, 401, 403, 404, 500
```

### Database Access Pattern

```typescript
// Always use the prisma singleton from server/prisma.ts
import { prisma } from "./prisma";

// Find operations
const user = await prisma.user.findUnique({ where: { id: userId } });
const programmes = await prisma.programme.findMany();

// Create/Update operations
const newUser = await prisma.user.create({ data: {...} });
const updated = await prisma.user.update({ where: {...}, data: {...} });

// Relationships
const userWithProgram = await prisma.userProgram.findUnique({
  where: { id: userProgramId },
  include: { programme: true, // Load related programme
             workouts: true }
});
```

---

## Important Files to Know

### Frontend Critical Files

**`src/App.tsx`**

- Route definitions
- All navigation paths defined here
- ProtectedRoute wrapper for auth-required pages

**`src/screens/Dashboard.tsx`**

- Main landing page after login
- Two-tab interface
- Bar chart for weekly performance (uses common max scaling)
- Check here for performance data structure

**`src/screens/Workouts.tsx`** (1400+ lines)

- Most complex page
- Exercise set tracking with localStorage persistence
- Timer management
- Workout completion modal with stats
- Key functions: `saveWorkout()`, `advanceToNextDay()`, `loadProgressionRecommendations()`

**`src/screens/Programmes.tsx`**

- Fetches all programmes grouped by bodyPartFocus
- Shows active programme banner
- Warning modal when switching programmes
- Clears localStorage when starting new programme

**`src/components/MuscleIcon.tsx`**

- Displays PNG icons for muscle groups
- Maps muscle group strings to image files
- Used in Workouts, Metrics, ProgrammeEditor, ExercisePRs

**`src/utils/auth.ts`**

- `getAuthHeader()`: Returns Bearer token for API calls
- `isAuthenticated()`: Checks if token exists
- Used throughout for consistent auth pattern

### Backend Critical Files

**`server/auth.ts`** (~1000 lines)

- `POST /auth/signup` — User registration
- `POST /auth/login` — Authentication
- `POST /auth/workouts` — Save completed workout
- `POST /auth/user-programs` — Start a new programme
- `GET /auth/user-programs` — List user's programmes
- `POST /auth/workouts/complete-day` — Advance to next day
- `GET /auth/workouts/recommendations` — Progressive overload suggestions
- `GET /auth/workouts/weekly-stats` — Dashboard performance data
- `POST /auth/create-checkout-session` — Stripe subscription

**`server/prisma.ts`**

- Global Prisma singleton (MUST use this, not `new PrismaClient()`)
- Prevents multiple client instances in development

**`server/prisma/schema.prisma`**

- Data model source of truth
- Relations between tables
- Database column mappings (@map for snake_case DB columns)

**`server/utils/progressiveOverloadService.ts`**

- Calculates recommended weight/reps for next workout
- Rules: rep caps, weight increases, overperformance detection
- Replaces manual calculations throughout codebase

**`server/index.ts`**

- Express app initialization
- Route mounting order matters (webhook before bodyParser.json())
- Static file serving for uploads

**`server/authMiddleware.ts`**

- `authenticateToken`: Verifies JWT and extracts userId
- Applied to protected routes

---

## Common Development Tasks

### Adding a New API Endpoint

1. **Backend (`server/auth.ts` or `server/protected.ts`):**

```typescript
app.post("/new-endpoint", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { data } = req.body;

    // Validate input
    if (!data) return res.status(400).json({ error: "Missing data" });

    // Database operation
    const result = await prisma.user.update({
      where: { id: userId },
      data: {
        /* ... */
      },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process" });
  }
});
```

2. **Frontend (`src/screens/YourScreen.tsx`):**

```typescript
const fetchData = async () => {
  try {
    const response = await fetch("http://localhost:4242/auth/new-endpoint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ data: value }),
    });
    if (!response.ok) throw new Error("Failed");
    const result = await response.json();
    setData(result.data);
  } catch (error) {
    setError(error.message);
  }
};
```

### Adding a New Screen/Page

1. Create `src/screens/NewScreen.tsx`:

```typescript
export default function NewScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0E1A]">
      <TopBar title="New Screen" pageIcon={<Icon />}
        menuItems={[...]} />
      {/* Content */}
      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
```

2. Add route in `src/App.tsx`:

```typescript
<Routes>
  <Route path="/new-screen" element={
    <ProtectedRoute>
      <NewScreen />
    </ProtectedRoute>
  } />
</Routes>
```

### Modifying Bar Chart (Dashboard Performance)

Key file: `src/screens/Dashboard.tsx` lines ~500-570

Important scaling variable:

```typescript
const commonMax = Math.max(
  ...weeklyStats.dailyStats.flatMap((d) => [d.exercises, d.sets]),
  1,
);
```

This ensures both bars use the same maximum so they're proportionally accurate.

### Building & Deploying

1. **Before building:** Ensure no `.js` files are manually edited in `src/screens/`
2. **Build production:**

```powershell
npm run build  # Frontend
cd server && npm run build  # Backend
```

3. **Environment variables:** Update `server/.env` for production
4. **Database:** Run migrations: `npx prisma migrate deploy`
5. **Start server:** `npm run start` in server folder

---

## Known Issues & Gotchas

### 1. File Sync Issue

- **Problem:** `.js` and `.tsx` versions can become out of sync if manually edited
- **Solution:** Only edit `.tsx` files, delete `.js` files if corrupted, rebuild with `npm run build`
- **Note:** This was a problem once before (Feb 2026) when formatter corrupted `.js` files

### 2. Import Paths

- **Important:** In backend, use `../prisma.js` (with .js extension) for ES modules
- Relative path without extension can fail in Node.js ES module context

### 3. Workout Session Persistence

- **localStorage Key:** `workoutSession` stores current workout state
- **Gotcha:** When switching programmes, must clear this or old programme data persists
- **Fix:** `localStorage.removeItem("workoutSession")` when starting new programme

### 4. Bar Chart Scaling

- **Issue (Feb 2026):** Bars showed identical height despite different values
- **Root Cause:** Used independent maximums (1 exercise max 100%, 4 sets max 100%)
- **Solution:** Use common max across both metrics
- **Code:** See `commonMax` formula in Dashboard.tsx

### 5. NaN Percentage Display

- **Issue:** Completion modal showed "NaN%" for improvement stats
- **Cause:** Missing `isNaN()` check before displaying percentages
- **Fix:** Check `!isNaN(value)` before rendering stat components

### 6. Muscle Icon Display (Fixed April 2026)

- **Was using:** Generated SVG icons
- **Now uses:** PNG image files from `src/assets/Icons/`
- **Why:** Visual consistency and design control
- **Files:** MuscleIcon.tsx imports PNG files and maps muscle groups to images

### 7. Programmes/Workouts Sync

- **Issue:** Active programme shown in Programmes didn't match Workouts
- **Cause:** Workouts restored old programme from localStorage
- **Solution:** Clear `workoutSession` when switching programmes

---

## API Endpoints Reference

### Authentication

- `POST /auth/signup` → Register new user
- `POST /auth/login` → Login with email/password
- `GET /auth/logout` → Logout (client-side, just remove token)

### User

- `GET /api/dashboard` → User name, greeting, basic info
- `GET /auth/user/profile` → Profile photo and details
- `PATCH /auth/user/profile` → Update profile info
- `POST /auth/user/change-password` → Change password

### Programmes

- `GET /auth/programmes` → List all programmes
- `GET /auth/programmes/{id}` → Get specific programme with exercises
- `POST /auth/programmes` → Create new programme
- `PATCH /auth/programmes/{id}` → Update programme

### User Programmes (Active/Tracking)

- `GET /auth/user-programs` → List user's programmes (ACTIVE/COMPLETED/CANCELLED)
- `POST /auth/user-programs` → Start a new programme
- `PATCH /auth/user-programs/{id}` → Update status

### Workouts

- `POST /auth/workouts` → Save completed workout with sets
- `GET /auth/workouts/weekly-stats` → Dashboard performance data
- `POST /auth/workouts/complete-day` → Advance to next day, get next day's exercises
- `GET /auth/workouts/recommendations` → Progressive overload suggestions for exercises

### Exercises

- `GET /auth/exercises/all` → List all exercises (name, muscleGroup)
- `GET /auth/exercises/random?focus={muscleGroup}` → Random exercise in that group

### Metrics

- `GET /auth/metrics/personal-records` → PRs for each exercise (1RM-10RM)

### Stripe

- `POST /auth/create-checkout-session` → Create Stripe checkout link
- `POST /webhook` → Stripe webhook (raw body, handles subscription events)

### Referrals (if implemented)

- `GET /auth/user/referral-stats` → Referral information

---

## Next Steps for Development

### High Priority (Bugs/Fixes)

- [ ] Test programme switching on multiple browsers
- [ ] Verify bar chart different-height bars display correctly
- [ ] Check completion modal stats don't show NaN (fixed Feb 2026, verify stable)
- [ ] Test localStorage persistence across browser sessions

### Medium Priority (Features)

- [ ] Add exercise substitution history
- [ ] Implement "rest day" in weekly schedule
- [ ] Add workout notes/comments feature
- [ ] Export workout data (CSV/PDF)
- [ ] Implement custom muscle group categories
- [ ] Add workout templates/quick-start

### Low Priority (Nice-to-Have)

- [ ] Add dark/light theme toggle (currently always dark)
- [ ] Implement social features (share workouts, follow friends)
- [ ] Add workout photos/video recording
- [ ] Implement AI-powered workout suggestions
- [ ] Add mobile app (React Native)
- [ ] Implement offline mode with sync

### Technical Debt

- [ ] Add comprehensive test suite (no tests currently)
- [ ] Extract reusable API fetch pattern into utility
- [ ] Add error boundary component for better error handling
- [ ] Separate large components (Workouts is 1400+ lines)
- [ ] Add JSDoc comments to complex functions
- [ ] Consider state management library (Redux/Zustand) if complexity grows

### Performance Improvements

- [ ] Add pagination to Programmes and Metrics lists
- [ ] Optimize bar chart rendering (currently recalculates every render)
- [ ] Add image optimization for muscle group icons
- [ ] Implement data caching strategy
- [ ] Add service worker for offline capability

---

## Useful Commands & Tips

```powershell
# View database schema
cd server
npx prisma studio  # Opens GUI at http://localhost:5555

# Check TypeScript errors without building
npx tsc --noEmit

# Format code (if prettier installed)
npx prettier --write "src/**/*.ts{,x}"

# Debug backend with console logs
# Backend: npm run dev already shows console.log()
# Frontend: Open browser DevTools (F12) → Console tab

# Database operations
npx prisma db seed                    # Seed with test data
npx prisma migrate dev --name "description"  # Create migration
npx prisma migrate reset              # Reset DB (dev only!)
npx prisma generate                   # Regenerate Prisma client

# Stop servers
# Ctrl+C in terminal

# Clean rebuild
npm run build  # Frontend - deletes dist/ first
cd server && npm run build  # Backend
```

---

## Contact/Questions

**For clarification on:**

- **Architecture decisions:** Check HANDOVER.md (this file) and comments in key files
- **Specific features:** Search for feature name in codebase, main logic usually in one file
- **Database schema:** Check `server/prisma/schema.prisma`
- **API contracts:** Check endpoint implementation in `server/auth.ts` and frontend calls

**Key Files to Reference:**

- `server/auth.ts` - Most endpoints here
- `src/screens/Dashboard.tsx` - Data structures (WeeklyStats, UserProgram)
- `src/App.tsx` - Route definitions
- `Handover.md` - This file

---

**The codebase is well-structured and should be straightforward to continue building on. Feel free to refactor and improve as you go.**

**Last updated:** April 1, 2026
