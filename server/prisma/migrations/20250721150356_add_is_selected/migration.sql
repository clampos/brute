-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_programme_exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programme_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '8-12',
    "rest_seconds" INTEGER,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "programme_exercises_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "programme_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_programme_exercises" ("day_number", "exercise_id", "id", "notes", "order_index", "programme_id", "reps", "rest_seconds", "sets") SELECT "day_number", "exercise_id", "id", "notes", "order_index", "programme_id", "reps", "rest_seconds", "sets" FROM "programme_exercises";
DROP TABLE "programme_exercises";
ALTER TABLE "new_programme_exercises" RENAME TO "programme_exercises";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
