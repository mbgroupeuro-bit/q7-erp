import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VerguetungsArt } from '@prisma/client';

// Bewusst manuell definiert statt PartialType(CreateMitarbeiterDto)
// aus "@nestjs/mapped-types" zu nutzen — dieses Paket war in den
// bisher gesehenen Dateien (partner.controller.ts/service.ts) nicht
// erkennbar im Einsatz, daher hier keine neue Abhängigkeit unterstellt.
export class UpdateMitarbeiterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  telefon?: string;

  @IsOptional()
  @IsEnum(VerguetungsArt)
  verguetungsArt?: VerguetungsArt;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  verguetungsBetrag?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  provisionBetrag?: number;
}
