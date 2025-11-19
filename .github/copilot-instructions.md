## Quick orientation

This repo is a full-stack TypeScript app (Vite + React frontend, Express + TypeScript backend) with Prisma (SQLite) for data. Key roots:

- `src/` — React app (Vite). Routes are wired in `src/App.tsx` and entry is `src/main.tsx`.
- `server/` — Express API (TypeScript). Main server file is `server/index.ts`. Most endpoints live in `server/auth.ts` (mounts at `/auth`) and `server/protected.ts` (mounts at `/api`).
- `server/prisma/` — Prisma schema, migrations and `seed.ts`.
- `uploads/` — static uploads served at `/uploads` (profile photos stored under `/uploads/profile-photos`).

Read these files first: `server/auth.ts`, `server/prisma.ts`, `server/prisma/schema.prisma`, `src/App.tsx`, `src/main.tsx`, `README.md`.

## Architecture highlights (why it looks this way)

- Monorepo-style layout but simple: frontend at repo root (`src`) and backend in `server/` folder. They are run separately during development.
- The backend is a mostly-monolithic API: `server/auth.ts` contains authentication, user/profile, programmes, workouts, referrals and Stripe integration. Look there to understand endpoints and data flows.
- Prisma is used with a local SQLite DB for development (`server/prisma/dev.db`). `server/prisma.ts` uses a global singleton pattern to avoid multiple PrismaClients in dev — preserve that pattern when touching DB access.
- Stripe webhooks are handled specially: `/webhook` is mounted with the raw body handler. Do not add a global bodyParser.json() before `/webhook` (the file `server/index.ts` shows correct ordering).
- File uploads use multer and are saved to `uploads/profile-photos`; the API exposes those files via `app.use('/uploads', express.static(...))` in `server/index.ts`.

## Developer workflows & commands (Windows PowerShell examples)

- Frontend (root):

  - Install: npm install
  - Dev: npm run dev (Vite dev server)
  - Build: npm run build

- Backend (server folder):

  - Install: cd server; npm install
  - Dev (hot reload): npm run dev (uses `ts-node-dev`)
  - Start (production): npm run start (runs built JS)

- Prisma (from `server/`):
  - Apply migrations (dev): npx prisma migrate dev
  - Run seed (uses package.json prisma.seed): npx prisma db seed
  - Generate client if needed: npx prisma generate

Run frontend and backend in two terminals. Example (PowerShell):

```powershell
# Terminal 1 (frontend)
npm install; npm run dev

# Terminal 2 (backend)
cd server; npm install; npm run dev
```

## Important environment variables

The server expects common env vars in `server/.env` (create one in dev):

- JWT_SECRET — required (used in `server/auth.ts` and token generation)
- STRIPE_SECRET_KEY, STRIPE_PRICE_ID, CLIENT_URL — Stripe session and redirects
- DATABASE_URL — Prisma connection (defaults to SQLite file under `server/prisma/dev.db` in dev)
- RESEND / EMAIL provider keys if used by `server/email.ts`.

If you change auth/token logic, keep `server/auth.ts` `/token` endpoint behavior intact — the client relies on it returning a JWT after subscription is confirmed.

## Project-specific conventions & patterns

- API contract: endpoints are under `/auth` (public + auth-protected) and `/api` (protected). The backend uses `authenticateToken` middleware (see `server/authMiddleware.ts`) to populate `req.user.userId`.
- Prisma models prefer `cuid()` ids (strings). Searches and relations in code assume string ids, unique `referralCode` on User, and many fields use `@map` for snake_case DB columns.
- DB client pattern: use the exported `prisma` singleton from `server/prisma.ts` (do not `new PrismaClient()` in multiple modules).
- Webhook handling: `server/webhook.ts` expects the raw body. If you add middleware, ensure `/webhook` remains mounted before `bodyParser.json()` as in `server/index.ts`.
- Uploads: multer stores files in `uploads/profile-photos`; the DB stores the relative path (e.g. `/uploads/profile-photos/user-<id>.jpg`). Serve path is `/uploads`.
- Progressive overload logic is centralized in `server/utils/progressiveOverloadService.ts` — use that for workout progression calculations instead of duplicating logic in routes.

## Integration points & external services

- Stripe: server creates checkout sessions (see `server/auth.ts`). Keep API version and webhook signing in mind.
- Email: `server/email.ts` uses Resend/Nodemailer — check credentials in env.
- Static files: profile photos and service worker (`sw.js`) are served from the root; ensure paths remain stable when building.

## Examples to copy/paste

- Creating a dev DB and seeding:

  - cd server
  - npx prisma migrate dev --name init
  - npx prisma db seed

- Starting both servers (two terminals):
  - npm run dev (root)
  - cd server; npm run dev

## When editing backend routes

- Prefer small focused changes in `server/auth.ts` (that's the canonical place for auth/programme/workout routes). If you split routes into new modules, update `server/index.ts` route mounts.
- Preserve the raw webhook mount and static uploads mount order in `server/index.ts`.

## Where to look for more context

- `server/auth.ts` — primary API surface (1000+ lines). Read this to learn data flows and error messages.
- `server/prisma/schema.prisma` — canonical data model and migrations in `server/prisma/migrations/`.
- `server/prisma/seed.ts` — sample data and seed logic.
- `src/services/authService.ts` and `src/utils/auth.ts` — how the frontend talks to the API.

If anything above is unclear or you want more detail (examples for common PR tasks, or a suggested test harness), tell me which areas to expand and I'll iterate.
