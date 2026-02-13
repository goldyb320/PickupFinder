/*
  Warnings:

  - You are about to drop the column `geom` on the `Location` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Location_geom_idx";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "geom";
