-- CreateTable
CREATE TABLE "benutzer" (
    "id" TEXT NOT NULL,
    "lizenznehmerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'AKTIV',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benutzer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "benutzer_email_key" ON "benutzer"("email");

-- CreateIndex
CREATE INDEX "benutzer_lizenznehmerId_idx" ON "benutzer"("lizenznehmerId");

-- AddForeignKey
ALTER TABLE "benutzer" ADD CONSTRAINT "benutzer_lizenznehmerId_fkey" FOREIGN KEY ("lizenznehmerId") REFERENCES "lizenznehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
