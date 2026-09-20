/*
  Warnings:

  - You are about to drop the column `gesamtbetrag` on the `bestellung` table. All the data in the column will be lost.
  - Added the required column `gesamtbetragBrutto` to the `bestellung` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gesamtbetragNetto` to the `bestellung` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bestellung" DROP COLUMN "gesamtbetrag",
ADD COLUMN     "gesamtbetragBrutto" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "gesamtbetragNetto" DECIMAL(12,2) NOT NULL;
