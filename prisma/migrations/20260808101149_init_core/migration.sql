-- CreateEnum
CREATE TYPE "Lizenzstufe" AS ENUM ('SMALL', 'MEDIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AKTIV', 'INAKTIV');

-- CreateEnum
CREATE TYPE "PartnerTyp" AS ENUM ('KUNDE', 'LIEFERANT', 'BEIDES');

-- CreateEnum
CREATE TYPE "ArtikelStatus" AS ENUM ('AKTIV', 'INAKTIV', 'AUSLAUFEND');

-- CreateEnum
CREATE TYPE "Kontotyp" AS ENUM ('AKTIV_KONTO', 'PASSIV_KONTO', 'ERTRAG', 'AUFWAND');

-- CreateTable
CREATE TABLE "lizenznehmer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rechtsform" TEXT,
    "adresseStrasse" TEXT,
    "adressePlz" TEXT,
    "adresseOrt" TEXT,
    "adresseLand" TEXT,
    "steuernummer" TEXT,
    "ustId" TEXT,
    "lizenzstufe" "Lizenzstufe" NOT NULL DEFAULT 'SMALL',
    "status" "Status" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lizenznehmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "typ" "PartnerTyp" NOT NULL,
    "name" TEXT NOT NULL,
    "ansprechpartner" TEXT,
    "adresseStrasse" TEXT,
    "adressePlz" TEXT,
    "adresseOrt" TEXT,
    "adresseLand" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "steuernummer" TEXT,
    "ustId" TEXT,
    "zahlungszielTage" INTEGER DEFAULT 30,
    "status" "Status" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artikel" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "artikelnummer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "grundpreis" DECIMAL(12,2) NOT NULL,
    "einheit" TEXT NOT NULL,
    "elternArtikelId" TEXT,
    "istBundle" BOOLEAN NOT NULL DEFAULT false,
    "istKonfigurierbar" BOOLEAN NOT NULL DEFAULT false,
    "status" "ArtikelStatus" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artikel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artikel_merkmal" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "merkmalName" TEXT NOT NULL,
    "merkmalWert" TEXT NOT NULL,

    CONSTRAINT "artikel_merkmal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_position" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "bundleArtikelId" TEXT NOT NULL,
    "bestandteilArtikelId" TEXT NOT NULL,
    "menge" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bundle_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baustein_gruppe" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "gruppenName" TEXT NOT NULL,
    "pflichtfeld" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "baustein_gruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baustein_option" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,
    "optionsName" TEXT NOT NULL,
    "preisaufschlag" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "baustein_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konfigurationsregel" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "wennOptionId" TEXT NOT NULL,
    "dannAusschlussOptionId" TEXT NOT NULL,

    CONSTRAINT "konfigurationsregel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konten" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "kontonummer" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "kontotyp" "Kontotyp" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'AKTIV',

    CONSTRAINT "konten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_lizenznehmerId_idx" ON "partner"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "artikel_lizenznehmerId_idx" ON "artikel"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "artikel_merkmal_lizenznehmerId_idx" ON "artikel_merkmal"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "bundle_position_lizenznehmerId_idx" ON "bundle_position"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "baustein_gruppe_lizenznehmerId_idx" ON "baustein_gruppe"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "baustein_option_lizenznehmerId_idx" ON "baustein_option"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "konfigurationsregel_lizenznehmerId_idx" ON "konfigurationsregel"("lizenznehmerId");

-- CreateIndex
CREATE INDEX "konten_lizenznehmerId_idx" ON "konten"("lizenznehmerId");

-- AddForeignKey
ALTER TABLE "partner" ADD CONSTRAINT "partner_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artikel" ADD CONSTRAINT "artikel_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artikel" ADD CONSTRAINT "artikel_elternArtikelId_fkey" FOREIGN KEY ("elternArtikelId") REFERENCES "artikel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artikel_merkmal" ADD CONSTRAINT "artikel_merkmal_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_position" ADD CONSTRAINT "bundle_position_bundleArtikelId_fkey" FOREIGN KEY ("bundleArtikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_position" ADD CONSTRAINT "bundle_position_bestandteilArtikelId_fkey" FOREIGN KEY ("bestandteilArtikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baustein_gruppe" ADD CONSTRAINT "baustein_gruppe_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baustein_option" ADD CONSTRAINT "baustein_option_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "baustein_gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konten" ADD CONSTRAINT "konten_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
