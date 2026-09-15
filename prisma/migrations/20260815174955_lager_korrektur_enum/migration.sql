/*
  Warnings:

  - The values [KORREKTUR] on the enum `LagerbewegungTyp` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LagerbewegungTyp_new" AS ENUM ('WARENEINGANG', 'WARENAUSGANG', 'KORREKTUR_AUFWAERTS', 'KORREKTUR_ABWAERTS', 'BUNDLE_ABBUCHUNG');
ALTER TABLE "lagerbewegung" ALTER COLUMN "typ" TYPE "LagerbewegungTyp_new" USING ("typ"::text::"LagerbewegungTyp_new");
ALTER TYPE "LagerbewegungTyp" RENAME TO "LagerbewegungTyp_old";
ALTER TYPE "LagerbewegungTyp_new" RENAME TO "LagerbewegungTyp";
DROP TYPE "public"."LagerbewegungTyp_old";
COMMIT;
