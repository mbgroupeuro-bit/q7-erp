-- CreateTable
CREATE TABLE "vorschuss" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "mitarbeiterId" TEXT NOT NULL,
    "betrag" DECIMAL(12,2) NOT NULL,
    "datum" DATE NOT NULL,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vorschuss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vorschuss_lizenznehmerId_idx" ON "vorschuss"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "vorschuss_mitarbeiterId_idx" ON "vorschuss"("mitarbeiterId");

-- AddForeignKey
ALTER TABLE "vorschuss" ADD CONSTRAINT "vorschuss_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vorschuss" ADD CONSTRAINT "vorschuss_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "mitarbeiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
