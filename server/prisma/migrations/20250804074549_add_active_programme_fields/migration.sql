/*
  Warnings:

  - You are about to drop the `user_programs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `user_program_id` on the `workouts` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `workouts` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "user_programs";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "bodyweight" REAL,
    "height" REAL,
    "birthday" DATETIME,
    "gender" TEXT,
    "profilePhoto" TEXT,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "referralCredits" INTEGER NOT NULL DEFAULT 0,
    "freeMonthsEarned" INTEGER NOT NULL DEFAULT 0,
    "freeMonthsUsed" INTEGER NOT NULL DEFAULT 0,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "active_programme_id" TEXT,
    "programme_start_date" DATETIME,
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "current_day" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "User_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_active_programme_id_fkey" FOREIGN KEY ("active_programme_id") REFERENCES "programmes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("birthday", "bodyweight", "createdAt", "email", "firstName", "freeMonthsEarned", "freeMonthsUsed", "gender", "height", "id", "password", "passwordResetExpires", "passwordResetToken", "profilePhoto", "referralCode", "referralCredits", "referredBy", "subscribed", "surname", "updatedAt") SELECT "birthday", "bodyweight", "createdAt", "email", "firstName", "freeMonthsEarned", "freeMonthsUsed", "gender", "height", "id", "password", "passwordResetExpires", "passwordResetToken", "profilePhoto", "referralCode", "referralCredits", "referredBy", "subscribed", "surname", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE TABLE "new_workouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "day_number" INTEGER NOT NULL,
    "completed_at" DATETIME NOT NULL,
    "duration" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workouts" ("completed_at", "created_at", "day_number", "duration", "id", "notes", "updated_at", "week_number") SELECT "completed_at", "created_at", "day_number", "duration", "id", "notes", "updated_at", "week_number" FROM "workouts";
DROP TABLE "workouts";
ALTER TABLE "new_workouts" RENAME TO "workouts";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
