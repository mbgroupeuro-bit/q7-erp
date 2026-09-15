-- AlterTable
ALTER TABLE "artikel" ADD COLUMN     "lagerrelevant" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mindestbestand" DECIMAL(12,3);

-- CreateTable
CREATE TABLE "artikel_lieferant" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "lieferantId" TEXT NOT NULL,
    "prioritaet" INTEGER NOT NULL,
    "einkaufspreis" DECIMAL(12,2) NOT NULL,
    "mindestbestellmenge" DECIMAL(12,3),
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artikel_lieferant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artikel_lieferant_lizenznehmerId_idx" ON "artikel_lieferant"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "artikel_lieferant_artikelId_idx" ON "artikel_lieferant"("artikelId");

-- AddForeignKey
ALTER TABLE "artikel_lieferant" ADD CONSTRAINT "artikel_lieferant_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artikel_lieferant" ADD CONSTRAINT "artikel_lieferant_lieferantId_fkey" FOREIGN KEY ("lieferantId") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
