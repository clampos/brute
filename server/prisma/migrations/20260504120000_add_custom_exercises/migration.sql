-- Add custom exercise fields to exercises table
ALTER TABLE "exercises" ADD COLUMN "is_custom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "exercises" ADD COLUMN "created_by_user_id" TEXT;
