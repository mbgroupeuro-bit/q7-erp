-- CreateEnum
CREATE TYPE "TuersteherErgebnis" AS ENUM ('ERLAUBT', 'BLOCKIERT', 'VERDAECHTIG_ERLAUBT_MIT_BENACHRICHTIGUNG');

-- AlterTable
ALTER TABLE "lizenznehmer" ADD COLUMN     "sicherheitsEmail" TEXT;

-- CreateTable
CREATE TABLE "zugriffshistorie" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "ipAdresse" TEXT NOT NULL,
    "quelle" TEXT NOT NULL,
    "anfrageId" TEXT NOT NULL,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ergebnis" "TuersteherErgebnis" NOT NULL,
    "grund" TEXT,

    CONSTRAINT "zugriffshistorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "q7_verbindung" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "geteiltesGeheimnis" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letzteRotation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "q7_verbindung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zugriffshistorie_anfrageId_key" ON "zugriffshistorie"("anfrageId");

-- CreateIndex
CREATE INDEX "zugriffshistorie_lizenznehmerId_zeitpunkt_idx" ON "zugriffshistorie"("lizenznehmerId", "zeitpunkt");

-- CreateIndex
CREATE INDEX "zugriffshistorie_lizenznehmerId_ipAdresse_idx" ON "zugriffshistorie"("lizenznehmerId", "ipAdresse");

-- CreateIndex
CREATE UNIQUE INDEX "q7_verbindung_lizenznehmerId_key" ON "q7_verbindung"("lizenznehmerId");

-- AddForeignKey
ALTER TABLE "zugriffshistorie" ADD CONSTRAINT "zugriffshistorie_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "q7_verbindung" ADD CONSTRAINT "q7_verbindung_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
