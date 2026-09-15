import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum Kontotyp {
  AKTIV_KONTO = 'AKTIV_KONTO',
  PASSIV_KONTO = 'PASSIV_KONTO',
  ERTRAG = 'ERTRAG',
  AUFWAND = 'AUFWAND',
}

export class CreateKontoDto {
  @IsString()
  @IsNotEmpty()
  kontonummer: string;

  @IsString()
  @IsNotEmpty()
  bezeichnung: string;

  @IsEnum(Kontotyp)
  kontotyp: Kontotyp;

  @IsOptional()
  @IsString()
  status?: string;
}
