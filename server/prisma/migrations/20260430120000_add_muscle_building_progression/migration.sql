-- Add movement pattern and rep range defaults to exercises
ALTER TABLE "exercises" ADD COLUMN "movement_pattern" TEXT;
ALTER TABLE "exercises" ADD COLUMN "default_rep_min" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "default_rep_max" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "complementary_exercise_ids" TEXT;
ALTER TABLE "exercises" ADD COLUMN "replacement_exercise_ids" TEXT;

-- Track per-user per-exercise progression state for muscle building
CREATE TABLE "user_exercise_progressions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "user_program_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "progression_phase" TEXT NOT NULL DEFAULT 'rep_progression',
    "consecutive_sessions_at_max_reps" INTEGER NOT NULL DEFAULT 0,
    "weeks_at_current_set_count" INTEGER NOT NULL DEFAULT 0,
    "last_weight_increase_at" DATETIME,
    "last_set_increase_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_exercise_progressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_exercise_progressions_user_program_id_fkey" FOREIGN KEY ("user_program_id") REFERENCES "user_programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_exercise_progressions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_exercise_progressions_user_program_id_exercise_id_key"
ON "user_exercise_progressions"("user_program_id", "exercise_id");
