-- CreateTable
CREATE TABLE "arbeitstag" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "mitarbeiterId" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arbeitstag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "arbeitstag_lizenznehmerId_idx" ON "arbeitstag"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "arbeitstag_mitarbeiterId_idx" ON "arbeitstag"("mitarbeiterId");

-- CreateIndex
CREATE UNIQUE INDEX "arbeitstag_mitarbeiterId_datum_key" ON "arbeitstag"("mitarbeiterId", "datum");

-- AddForeignKey
ALTER TABLE "arbeitstag" ADD CONSTRAINT "arbeitstag_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbeitstag" ADD CONSTRAINT "arbeitstag_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "mitarbeiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
