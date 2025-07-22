/*
  Warnings:

  - You are about to drop the column `fitnessGoal` on the `User` table. All the data in the column will be lost.

*/
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
    "age" INTEGER,
    "gender" TEXT,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "referralCredits" INTEGER NOT NULL DEFAULT 0,
    "freeMonthsEarned" INTEGER NOT NULL DEFAULT 0,
    "freeMonthsUsed" INTEGER NOT NULL DEFAULT 0,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    CONSTRAINT "User_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("age", "bodyweight", "createdAt", "email", "firstName", "freeMonthsEarned", "freeMonthsUsed", "gender", "height", "id", "password", "passwordResetExpires", "passwordResetToken", "referralCode", "referralCredits", "referredBy", "subscribed", "surname", "updatedAt") SELECT "age", "bodyweight", "createdAt", "email", "firstName", "freeMonthsEarned", "freeMonthsUsed", "gender", "height", "id", "password", "passwordResetExpires", "passwordResetToken", "referralCode", "referralCredits", "referredBy", "subscribed", "surname", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
