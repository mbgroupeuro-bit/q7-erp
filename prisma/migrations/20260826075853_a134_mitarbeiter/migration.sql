-- CreateTable
CREATE TABLE "mitarbeiter" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telefon" TEXT,
    "gehalt" DECIMAL(12,2) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mitarbeiter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mitarbeiter_lizenznehmerId_idx" ON "mitarbeiter"("lizenznehmerId");

-- AddForeignKey
ALTER TABLE "mitarbeiter" ADD CONSTRAINT "mitarbeiter_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
