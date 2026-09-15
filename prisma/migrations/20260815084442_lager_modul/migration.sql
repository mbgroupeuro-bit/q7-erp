-- CreateEnum
CREATE TYPE "LagerbewegungTyp" AS ENUM ('WARENEINGANG', 'WARENAUSGANG', 'KORREKTUR', 'BUNDLE_ABBUCHUNG');

-- CreateTable
CREATE TABLE "lagerort" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "istStandard" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lagerort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lagerbestand" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "lagerortId" TEXT NOT NULL,
    "menge" DECIMAL(12,3) NOT NULL,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lagerbestand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lagerbewegung" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "lagerortId" TEXT NOT NULL,
    "typ" "LagerbewegungTyp" NOT NULL,
    "menge" DECIMAL(12,3) NOT NULL,
    "referenz" TEXT,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lagerbewegung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lagerort_lizenznehmerId_idx" ON "lagerort"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "lagerbestand_lizenznehmerId_idx" ON "lagerbestand"("lizenznehmerId");

-- CreateIndex
CREATE UNIQUE INDEX "lagerbestand_artikelId_lagerortId_key" ON "lagerbestand"("artikelId", "lagerortId");

-- CreateIndex
CREATE INDEX "lagerbewegung_lizenznehmerId_idx" ON "lagerbewegung"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "lagerbewegung_artikelId_lagerortId_idx" ON "lagerbewegung"("artikelId", "lagerortId");

-- AddForeignKey
ALTER TABLE "lagerort" ADD CONSTRAINT "lagerort_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagerbestand" ADD CONSTRAINT "lagerbestand_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagerbestand" ADD CONSTRAINT "lagerbestand_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagerbestand" ADD CONSTRAINT "lagerbestand_lagerortId_fkey" FOREIGN KEY ("lagerortId") REFERENCES "lagerort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagerbewegung" ADD CONSTRAINT "lagerbewegung_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagerbewegung" ADD CONSTRAINT "lagerbewegung_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagerbewegung" ADD CONSTRAINT "lagerbewegung_lagerortId_fkey" FOREIGN KEY ("lagerortId") REFERENCES "lagerort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
