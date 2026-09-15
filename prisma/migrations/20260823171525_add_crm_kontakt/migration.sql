-- CreateEnum
CREATE TYPE "CrmPipelineStatus" AS ENUM ('NEU', 'KONTAKTIERT', 'ANGEBOT', 'GEWONNEN', 'VERLOREN');

-- CreateTable
CREATE TABLE "crm_kontakt" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "telefon" TEXT,
    "partnerId" TEXT,
    "pipelineStatus" "CrmPipelineStatus" NOT NULL DEFAULT 'NEU',
    "quelle" TEXT,
    "status" "Status" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_kontakt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_kontakt_lizenznehmerId_idx" ON "crm_kontakt"("lizenznehmerId");

-- AddForeignKey
ALTER TABLE "crm_kontakt" ADD CONSTRAINT "crm_kontakt_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_kontakt" ADD CONSTRAINT "crm_kontakt_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
