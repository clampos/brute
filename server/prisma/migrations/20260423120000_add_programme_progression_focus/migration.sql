-- Add progression focus strategy for programme-specific overload logic.
ALTER TABLE "programmes"
ADD COLUMN "progression_focus" TEXT NOT NULL DEFAULT 'MUSCLE_BUILDING';

-- Backfill explicit value for all existing rows (safety + clarity).
UPDATE "programmes"
SET "progression_focus" = 'MUSCLE_BUILDING'
WHERE "progression_focus" IS NULL OR "progression_focus" = '';
