-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_programmes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "days_per_week" INTEGER NOT NULL,
    "weeks" INTEGER NOT NULL,
    "body_part_focus" TEXT NOT NULL,
    "description" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_programmes" ("body_part_focus", "created_at", "days_per_week", "description", "id", "is_custom", "name", "updated_at", "user_id", "weeks") SELECT "body_part_focus", "created_at", "days_per_week", "description", "id", "is_custom", "name", "updated_at", "user_id", "weeks" FROM "programmes";
DROP TABLE "programmes";
ALTER TABLE "new_programmes" RENAME TO "programmes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
