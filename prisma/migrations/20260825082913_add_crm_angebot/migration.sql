-- CreateEnum
CREATE TYPE "CrmAngebotStatus" AS ENUM ('ENTWURF', 'VERSENDET', 'ANGENOMMEN', 'ABGELEHNT');

-- CreateTable
CREATE TABLE "crm_angebot" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "crmKontaktId" TEXT NOT NULL,
    "status" "CrmAngebotStatus" NOT NULL DEFAULT 'ENTWURF',
    "gueltigBis" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_angebot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_angebot_position" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "crmAngebotId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "menge" DECIMAL(12,3) NOT NULL,
    "einzelpreis" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "crm_angebot_position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_angebot_lizenznehmerId_idx" ON "crm_angebot"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "crm_angebot_crmKontaktId_idx" ON "crm_angebot"("crmKontaktId");

-- CreateIndex
CREATE INDEX "crm_angebot_position_lizenznehmerId_idx" ON "crm_angebot_position"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "crm_angebot_position_crmAngebotId_idx" ON "crm_angebot_position"("crmAngebotId");

-- AddForeignKey
ALTER TABLE "crm_angebot" ADD CONSTRAINT "crm_angebot_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_angebot" ADD CONSTRAINT "crm_angebot_crmKontaktId_fkey" FOREIGN KEY ("crmKontaktId") REFERENCES "crm_kontakt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_angebot_position" ADD CONSTRAINT "crm_angebot_position_crmAngebotId_fkey" FOREIGN KEY ("crmAngebotId") REFERENCES "crm_angebot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_angebot_position" ADD CONSTRAINT "crm_angebot_position_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
