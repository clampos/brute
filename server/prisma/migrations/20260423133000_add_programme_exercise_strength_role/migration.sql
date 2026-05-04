-- Add strength role tagging for exercises in a programme.
ALTER TABLE "programme_exercises"
ADD COLUMN "strength_role" TEXT NOT NULL DEFAULT 'ACCESSORY';

-- Backfill explicitly for clarity and cross-environment safety.
UPDATE "programme_exercises"
SET "strength_role" = 'ACCESSORY'
WHERE "strength_role" IS NULL OR "strength_role" = '';
