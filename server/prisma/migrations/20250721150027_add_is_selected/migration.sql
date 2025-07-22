-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_exercises" ("category", "created_at", "equipment", "id", "instructions", "muscle_group", "name", "updated_at") SELECT "category", "created_at", "equipment", "id", "instructions", "muscle_group", "name", "updated_at" FROM "exercises";
DROP TABLE "exercises";
ALTER TABLE "new_exercises" RENAME TO "exercises";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
