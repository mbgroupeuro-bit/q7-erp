-- CreateEnum
CREATE TYPE "ModulTyp" AS ENUM ('LOGISTIK', 'ZAHLUNG', 'SHOP');

-- CreateTable
CREATE TABLE "lizenznehmer_modul" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "modulTyp" "ModulTyp" NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT false,
    "aktiviertAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lizenznehmer_modul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zahlung_konfiguration" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "adapterName" TEXT NOT NULL,
    "zugangsdaten" JSONB,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zahlung_konfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistik_konfiguration" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "adapterName" TEXT NOT NULL,
    "apiSchluessel" TEXT,
    "zugangsdaten" JSONB,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistik_konfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_konfiguration" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "adapterName" TEXT NOT NULL,
    "shopUrl" TEXT,
    "apiSchluessel" TEXT,
    "zugangsdaten" JSONB,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_konfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lizenznehmer_modul_lizenznehmerId_idx" ON "lizenznehmer_modul"("lizenznehmerId");

-- CreateIndex
CREATE UNIQUE INDEX "lizenznehmer_modul_lizenznehmerId_modulTyp_key" ON "lizenznehmer_modul"("lizenznehmerId", "modulTyp");

-- CreateIndex
CREATE INDEX "zahlung_konfiguration_lizenznehmerId_idx" ON "zahlung_konfiguration"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "logistik_konfiguration_lizenznehmerId_idx" ON "logistik_konfiguration"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "shop_konfiguration_lizenznehmerId_idx" ON "shop_konfiguration"("lizenznehmerId");

-- AddForeignKey
ALTER TABLE "lizenznehmer_modul" ADD CONSTRAINT "lizenznehmer_modul_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zahlung_konfiguration" ADD CONSTRAINT "zahlung_konfiguration_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistik_konfiguration" ADD CONSTRAINT "logistik_konfiguration_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_konfiguration" ADD CONSTRAINT "shop_konfiguration_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
