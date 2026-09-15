import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateBausteinOptionDto {
  @IsString()
  @IsNotEmpty()
  optionsName: string;

  @IsOptional()
  @IsNumber()
  preisaufschlag?: number; // Prisma-Feld ist Decimal(12,2), Default 0 — als number im DTO, Prisma konvertiert

  // NEU (A115-Vorlauf, 21.08.2026): Gleicher A111-Regressionsfehler wie bei
  // CreatePartnerDto/CreateArtikelDto — Decorators nachgerüstet.
}
