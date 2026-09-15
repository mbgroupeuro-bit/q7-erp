-- CreateTable
CREATE TABLE "crm_wiedervorlage" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "crmKontaktId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "faelligkeitsDatum" TIMESTAMP(3) NOT NULL,
    "erledigt" BOOLEAN NOT NULL DEFAULT false,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_wiedervorlage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_wiedervorlage_lizenznehmerId_idx" ON "crm_wiedervorlage"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "crm_wiedervorlage_crmKontaktId_idx" ON "crm_wiedervorlage"("crmKontaktId");

-- AddForeignKey
ALTER TABLE "crm_wiedervorlage" ADD CONSTRAINT "crm_wiedervorlage_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_wiedervorlage" ADD CONSTRAINT "crm_wiedervorlage_crmKontaktId_fkey" FOREIGN KEY ("crmKontaktId") REFERENCES "crm_kontakt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
