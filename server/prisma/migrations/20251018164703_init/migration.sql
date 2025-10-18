/*
  Warnings:

  - You are about to drop the `bodyfat_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodyweight_entries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "bodyfat_entries";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "bodyweight_entries";
PRAGMA foreign_keys=on;
