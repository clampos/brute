-- Add missing workout fields
ALTER TABLE "workouts" ADD COLUMN "perceived_difficulty" INTEGER;
ALTER TABLE "workouts" ADD COLUMN "start_recovery" TEXT;
