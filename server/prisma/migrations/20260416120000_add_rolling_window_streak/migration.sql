-- Add rolling window consistency streak fields to User
ALTER TABLE "User" ADD COLUMN "streak_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "streak_goal" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "User" ADD COLUMN "current_window_start" DATETIME;
ALTER TABLE "User" ADD COLUMN "current_window_workouts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "streak_freeze_available" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "last_workout_at" DATETIME;
