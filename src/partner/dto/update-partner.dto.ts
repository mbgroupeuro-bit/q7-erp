import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PartnerTyp } from '@prisma/client';

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(PartnerTyp)
  typ?: PartnerTyp;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefon?: string;

  @IsOptional()
  @IsString()
  strasse?: string;

  @IsOptional()
  @IsString()
  plz?: string;

  @IsOptional()
  @IsString()
  ort?: string;

  @IsOptional()
  @IsString()
  land?: string;

  // NEU (A115-Vorlauf, 21.08.2026): Gleicher A111-Regressionsfehler wie bei
  // CreatePartnerDto — beim A114-Test noch nicht aufgefallen, da dort nur
  // Anlegen (POST), nicht Bearbeiten (PATCH) getestet wurde. Beim Review
  // von update-partner.dto.ts vorsorglich mitrepariert, bevor es im
  // Dashboard zu einem PATCH-Fehler kommt.
}
