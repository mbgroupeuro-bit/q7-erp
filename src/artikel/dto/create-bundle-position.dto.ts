import { IsUUID, IsNumber, IsPositive } from 'class-validator';

export class CreateBundlePositionDto {
  @IsUUID()
  bestandteilArtikelId: string;

  @IsNumber()
  @IsPositive()
  menge: number; // Prisma-Feld ist Decimal(10,2) — als number im DTO, Prisma konvertiert

  // NEU (A114-Bugfix, 21.08.2026): class-validator-Decorators nachgerüstet,
  // gleicher Grund wie bei CreatePartnerDto/CreateArtikelDto (siehe dort).
}
