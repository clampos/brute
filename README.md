```
brute
├─ index.html
├─ manifest.json
├─ my-favicon
│  ├─ apple-touch-icon.png
│  ├─ favicon-96x96.png
│  ├─ favicon.ico
│  ├─ favicon.svg
│  ├─ site.webmanifest
│  ├─ web-app-manifest-192x192.png
│  └─ web-app-manifest-512x512.png
├─ package-lock.json
├─ package.json
├─ postcss.config.js
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
│  │  │  ├─ 20250523083816_add_name_fields
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20250618153358_add_referral_fields
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20250702144903_add_password_reset_fields
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20250707141705_add_workout_and_programme_fields
│  │  │  │  └─ migration.sql
│  │  │  └─ migration_lock.toml
│  │  └─ schema.prisma
│  ├─ prisma.ts
│  ├─ programmes.ts
│  ├─ protected.ts
│  ├─ routes
│  │  └─ stripe.js
│  ├─ tsconfig.json
│  ├─ utils
│  │  └─ referralUtils.ts
│  └─ webhook.ts
├─ src
│  ├─ App.tsx
│  ├─ assets
│  │  ├─ icon_placeholder.png
│  │  └─ logo.png
│  ├─ components
│  │  ├─ AuthLayout.tsx
│  │  ├─ BottomBar.tsx
│  │  ├─ BubblesBackground.tsx
│  │  ├─ InstallPrompt.tsx
│  │  ├─ OvalProgressIcon.tsx
│  │  ├─ ProtectedRoute.tsx
│  │  ├─ ResetPassword.tsx
│  │  └─ ScreenWrapper.tsx
│  ├─ index.css
│  ├─ main.tsx
│  ├─ screens
│  │  ├─ Dashboard.tsx
│  │  ├─ Login.tsx
│  │  ├─ Onboarding.tsx
│  │  ├─ ProgrammeEditor.tsx
│  │  ├─ Programmes.tsx
│  │  ├─ Settings.tsx
│  │  ├─ Signup.tsx
│  │  └─ SubscriptionSuccess.tsx
│  ├─ services
│  │  └─ authService.ts
│  └─ utils
│     └─ auth.ts
├─ sw.js
├─ tailwind.config.js
├─ tsconfig.json
└─ yarn.lock

```
