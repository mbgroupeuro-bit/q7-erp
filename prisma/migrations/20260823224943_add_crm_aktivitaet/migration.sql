-- CreateTable
CREATE TABLE "crm_aktivitaet" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "crmKontaktId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_aktivitaet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_aktivitaet_lizenznehmerId_idx" ON "crm_aktivitaet"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "crm_aktivitaet_crmKontaktId_idx" ON "crm_aktivitaet"("crmKontaktId");

-- AddForeignKey
ALTER TABLE "crm_aktivitaet" ADD CONSTRAINT "crm_aktivitaet_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_aktivitaet" ADD CONSTRAINT "crm_aktivitaet_crmKontaktId_fkey" FOREIGN KEY ("crmKontaktId") REFERENCES "crm_kontakt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
