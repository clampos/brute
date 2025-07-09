-- CreateTable
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "days_per_week" INTEGER NOT NULL,
    "weeks" INTEGER NOT NULL,
    "body_part_focus" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" TEXT,
    "instructions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "programme_exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programme_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '8-12',
    "rest_seconds" INTEGER,
    "notes" TEXT,
    CONSTRAINT "programme_exercises_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "programme_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_programs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "current_day" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_programs_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_program_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "day_number" INTEGER NOT NULL,
    "completed_at" DATETIME NOT NULL,
    "duration" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workouts_user_program_id_fkey" FOREIGN KEY ("user_program_id") REFERENCES "user_programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workout_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workout_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workout_exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "weight" REAL,
    "reps" INTEGER NOT NULL,
    "rpe" INTEGER,
    "rest_seconds" INTEGER,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "workout_sets_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
