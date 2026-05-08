-- Performance indexes: eliminate full-table scans on the hottest query paths

-- user_programs: looked up by userId + status on every page load
CREATE INDEX IF NOT EXISTS "user_programs_user_id_status_idx" ON "user_programs"("user_id", "status");

-- workouts: joined via userProgramId, sorted/filtered by completedAt
CREATE INDEX IF NOT EXISTS "workouts_user_program_id_completed_at_idx" ON "workouts"("user_program_id", "completed_at");

-- workout_exercises: joined from workouts and exercises in every workout fetch
CREATE INDEX IF NOT EXISTS "workout_exercises_workout_id_idx" ON "workout_exercises"("workout_id");
CREATE INDEX IF NOT EXISTS "workout_exercises_exercise_id_idx" ON "workout_exercises"("exercise_id");

-- programme_exercises: fetched by programmeId for every programme load
CREATE INDEX IF NOT EXISTS "programme_exercises_programme_id_idx" ON "programme_exercises"("programme_id");

-- bodyweight_entries / bodyfat_entries: filtered by userId
CREATE INDEX IF NOT EXISTS "bodyweight_entries_user_id_idx" ON "bodyweight_entries"("user_id");
CREATE INDEX IF NOT EXISTS "bodyfat_entries_user_id_idx" ON "bodyfat_entries"("user_id");

-- exercises: filtered by muscleGroup in exercise-picker queries
CREATE INDEX IF NOT EXISTS "exercises_muscle_group_idx" ON "exercises"("muscle_group");
