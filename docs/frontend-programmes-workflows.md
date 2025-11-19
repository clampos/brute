Date: 2025-11-19

This document collects a deep-dive of the three frontend screens that control programmes and workouts, explains their data contracts, lifecycle, edge cases, and provides concrete recommendations. It also includes a diagnosis for why seeding hundreds of new exercises could make `Programmes.tsx` show fewer programmes/exercises.

---

## High-level summary (shared patterns)

- The frontend stores JWT in `localStorage.token` and sends it in Authorization headers for API calls.
- API base URL is hardcoded as `http://localhost:4242` across files (no central API client).
- Many operations are multi-step: client composes multiple REST calls (delete then create) rather than using single transactional endpoints.
- Progressive overload logic and recommendations are calculated server-side (see `server/utils/progressiveOverloadService.ts`) and returned by `POST /auth/workouts`.

---

## Programmes.tsx — logical flow

What it does

- Shows available programmes grouped by `bodyPartFocus`.
- Shows current active user programme banner when present.
- Lets users start a programme (cancels existing active programme, creates a new userProgram) and jump to Workouts.

Main state

- `programmesData: Record<bodyPartFocus, Programme[]>` — from `GET /auth/programmes`.
- `activeUserProgram` — from `GET /auth/user-programs` (finds status === 'ACTIVE').
- `openSections` tracks UI expand/collapse.

Lifecycle & API calls (mount)

1. verify token; if missing -> navigate to `/login`
2. `GET /api/dashboard` -> sets user first/surname
3. `GET /auth/user-programs` -> select active
4. `GET /auth/programmes` -> groups by bodyPartFocus and sets initial openSections

Start programme flow

1. If an active programme exists: `PATCH /auth/user-programs/:id` with { status: 'CANCELLED' }
2. `POST /auth/user-programs` with { programmeId, startDate }
3. on success: alert + navigate('/workouts')

Edge cases & suggestions

- Race/failure: if cancellation succeeds but create fails, user may have no active programme. Consider server-side atomic endpoint to replace active program with new one.
- Hardcoded base URL makes environment switching harder; centralize API client and base URL via env (e.g., VITE_API_URL).
- Add UI disabled/loading states to avoid duplicate submissions.

---

## ProgrammeEditor.tsx — logical flow

What it does

- Loads a programme (`GET /auth/programmes/:id`) and its programme exercises.
- For each day, displays selected exercises and recommended exercise options.
- Lets user add local (temp) exercises and then 'Confirm Day' to persist changes.

Main state

- `days: ProgrammeDay[]` where each day contains selected exercises, initial `exerciseOptions` (3), `availableExercises` (full list for that focus), `hasChanges`, and toggles.
- `allExercises` caches the exercises fetched for the focus.

Lifecycle & key functions

- On mount: fetch programme, group programme.exercises by day, build `days` (1..daysPerWeek), then call `loadInitialExerciseOptions` for each day.
- `loadInitialExerciseOptions` calls `getMuscleGroupsForFocus(bodyFocus)` then parallel `GET /auth/exercises?muscleGroup=<group>` requests; dedupes and picks 3 random options.
- Add/remove: modify day's `exercises` with temporary IDs (prefix `temp-`) and set `hasChanges=true`.
- Confirm Day: deletes all server-side exercises for day via `DELETE /auth/programmes/:id/exercises/day/:dayNumber`, then iteratively `POST /auth/programmes/:id/exercises` for each selected exercise. After success, replace `day.exercises` with persisted rows and clear `hasChanges`.

Edge cases & suggestions

- Confirm Day is destructive and not atomic: if POSTs fail mid-loop the day may be partially saved. Add a server-side batch replace API: `PUT /auth/programmes/:id/day/:dayNumber/exercises` that performs the replace in a single transaction.
- Initial per-day loading is sequential (the component awaits each day's `loadInitialExerciseOptions` in a loop). Parallelize with Promise.all to speed startup.
- Log or surface missing exercise matches when seeding (see seed diagnosis below).

---

## Workouts.tsx — logical flow

What it does

- Loads active user program and programme details, builds today's workout from programme exercises (for currentDay).
- Provides a workout timer, input fields for weight/reps for each set, toggles set completion, and allows adding sets.
- Saves workout (`POST /auth/workouts`) — sends only completed sets with weight+reps; receives recommendations; then `POST /auth/workouts/complete-day` to advance.

Main state points

- Timer: `timerRunning`, `secondsElapsed`, `workoutStartTime`
- `userProgram`, `todayExercises` — initial sets are created from `programme.exercises` for the current day.

Lifecycle & API calls

- On mount: `GET /auth/user-programs` -> choose active program; then `GET /auth/programmes/:id` to fetch programme details. Build today's exercises.
- After `userProgram` + `todayExercises` present: `GET /auth/workouts/recommendations?exerciseIds=` to attach recommendations.
- Save: compute `workoutData` (only sets where completed && weight && reps), duration via workoutStartTime, `POST /auth/workouts`; then call `POST /auth/workouts/complete-day`.

Edge cases & suggestions

- `saveWorkout` requires `workoutStartTime` to be set; consider auto-setting start time when the user edits the first set.
- `loadProgressionRecommendations` triggers when `userProgram.currentDay` changes; it might be desirable to re-run when `todayExercises` changes or when exercises are added/removed.
- `window.location.reload()` after advancing to next day is heavy-handed; prefer re-fetching user-programs and programme data.
- Timer typing uses `NodeJS.Timeout` (browser timers return numbers) — minor TS typing mismatch.

---

## Cross-file server endpoints used (for reference)

- GET /api/dashboard
- GET /auth/programmes
- GET /auth/programmes/:id
- GET /auth/exercises?muscleGroup=
- GET /auth/user-programs
- POST /auth/user-programs
- PATCH /auth/user-programs/:id
- DELETE /auth/programmes/:id/exercises/day/:dayNumber
- POST /auth/programmes/:id/exercises
- GET /auth/workouts/recommendations?exerciseIds=
- POST /auth/workouts
- POST /auth/workouts/complete-day

These endpoints are implemented in `server/auth.ts` and rely on the Prisma models defined in `server/prisma/schema.prisma`.

---

## Why seeding hundreds of exercises can make `Programmes.tsx` show fewer items — diagnosis

What likely happened

1. You ran `npx prisma migrate reset` in `server/`, which drops and recreates the development database and runs `prisma.seed` (runs `server/prisma/seed.ts`).
2. The seed script first deletes existing `exercise` rows and inserts a large list of new exercises.
3. `seedProgrammes()` then calls `prisma.exercise.findMany()` and uses a helper `byName = (name) => exercises.find(e => e.name === name)` to match programme exercise names to the freshly seeded exercise records.
4. If the new exercises use slightly different names (punctuation, hyphens, plurals, synonyms — e.g., `Pushups` vs `Push-ups`, `Barbell Full Squat` vs `Squats`), `byName()` will fail to find many names. The programme creation loop silently skips unmatched names when creating `programmeExercise` rows.

Result: programmes are created but have far fewer associated `programme_exercises` (because many were skipped), so the UI shows fewer exercises or programmes appear less populated.

How to confirm quickly

- Check the server seed output after running `npx prisma migrate reset`; look for `Seeded X exercises.` and `Seeded Y programmes.` messages.
- Run a quick DB query or use Prisma Studio (cd server; npx prisma studio) to inspect `programme_exercises` and look for missing associations.
- In Node REPL or a small script, print `exercises.map(e => e.name)` and compare to the programme exercise names used in the seed (search for duplicates/mismatch).

Suggested fixes (pick one)

1. Make name matching robust in `seed.ts` (recommended quick fix)

- Replace strict equality with a normalization function: lowercase, remove non-alphanumeric characters, collapse spaces. Example algorithm:
  - const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  - const byName = name => exercises.find(e => normalize(e.name) === normalize(name));
- Log names that still do not match so you can fix the canonical names or the programme templates.

2. Seed programmes using explicit exercise IDs or a mapping table

- Maintain a small mapping object in the seed that maps programme exerciseName -> canonical exercise seeded name, or seed exercises with canonical names used by programmes.

3. Make programme seeding tolerant and report misses

- When `byName` fails, accumulate and print the missing names so they can be fixed manually rather than silently being skipped.

4. Long-term: switch programme seeding to reference exercises by a stable slug or code (e.g., `slug: 'barbell-bench-press'`). This avoids fragile natural-language matching.

---

## Example patch (quick and safe): normalize `byName` and log misses in `server/prisma/seed.ts`

Instead of strict `byName`, use:

```ts
const normalize = (s?: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const byName = (name: string) =>
  exercises.find((e) => normalize(e.name) === normalize(name));
// When creating programme exercises, if (!exercise) console.warn('Missing', exerciseData.exerciseName);
```

This change will make the seed more tolerant to punctuation/plural differences and print unmatched names for manual review.

---

## Concrete recommended next steps I can implement

- Add `docs/frontend-programmes-workflows.md` (this file) — done.
- Patch `server/prisma/seed.ts` to normalize name matching and log missing names — low-risk, quick.
- Add `.env.example` and a small `src/services/api.ts` wrapper to centralize base URL and token injection in the frontend.
- Implement a batch `PUT /auth/programmes/:id/day/:dayNumber/exercises` server endpoint to atomically replace a day's exercises.

Tell me which of the recommended changes you want me to make next (I can apply the seed.ts normalization patch first to get you immediate visibility on missing names).
