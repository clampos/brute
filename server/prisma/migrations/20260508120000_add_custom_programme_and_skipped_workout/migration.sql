-- Add is_custom and user_id to programmes
ALTER TABLE "programmes" ADD COLUMN "is_custom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "programmes" ADD COLUMN "user_id" TEXT;

-- Add skipped to workouts
ALTER TABLE "workouts" ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false;
