/*
  Warnings:

  - You are about to drop the column `gehalt` on the `mitarbeiter` table. All the data in the column will be lost.
  - Added the required column `verguetungsArt` to the `mitarbeiter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verguetungsBetrag` to the `mitarbeiter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerguetungsArt" AS ENUM ('TAGESLOHN', 'MONATSGEHALT');

-- AlterTable
ALTER TABLE "mitarbeiter" DROP COLUMN "gehalt",
ADD COLUMN     "provisionBetrag" DECIMAL(12,2),
ADD COLUMN     "verguetungsArt" "VerguetungsArt" NOT NULL,
ADD COLUMN     "verguetungsBetrag" DECIMAL(12,2) NOT NULL;
