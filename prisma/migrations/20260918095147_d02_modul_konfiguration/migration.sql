-- CreateEnum
CREATE TYPE "BestellStatus" AS ENUM ('NEU', 'IN_BEARBEITUNG', 'VERSANDT', 'ABGESCHLOSSEN', 'STORNIERT');

-- CreateTable
CREATE TABLE "bestellung" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "quelle" TEXT NOT NULL,
    "externeBestellId" TEXT,
    "status" "BestellStatus" NOT NULL DEFAULT 'NEU',
    "kundeName" TEXT NOT NULL,
    "kundeTelefon" TEXT,
    "kundeAdresse" TEXT,
    "zahlartAdapterName" TEXT NOT NULL,
    "carrierAdapterName" TEXT,
    "sendungsnummer" TEXT,
    "lagerortId" TEXT,
    "gesamtbetrag" DECIMAL(12,2) NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bestellung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bestell_position" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "bestellungId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "menge" DECIMAL(12,3) NOT NULL,
    "einzelpreis" DECIMAL(12,2) NOT NULL,
    "mwstSatz" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "bestell_position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bestellung_lizenznehmerId_idx" ON "bestellung"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "bestellung_lizenznehmerId_status_idx" ON "bestellung"("lizenznehmerId", "status");

-- CreateIndex
CREATE INDEX "bestell_position_lizenznehmerId_idx" ON "bestell_position"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "bestell_position_bestellungId_idx" ON "bestell_position"("bestellungId");

-- AddForeignKey
ALTER TABLE "bestellung" ADD CONSTRAINT "bestellung_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellung" ADD CONSTRAINT "bestellung_lagerortId_fkey" FOREIGN KEY ("lagerortId") REFERENCES "lagerort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestell_position" ADD CONSTRAINT "bestell_position_bestellungId_fkey" FOREIGN KEY ("bestellungId") REFERENCES "bestellung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestell_position" ADD CONSTRAINT "bestell_position_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
