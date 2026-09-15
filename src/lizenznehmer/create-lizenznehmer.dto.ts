// src/lizenznehmer/create-lizenznehmer.dto.ts

import { IsEnum, IsOptional, IsString } from 'class-validator';

enum Lizenzstufe {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateLizenznehmerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  rechtsform?: string;

  @IsOptional()
  @IsString()
  adresseStrasse?: string;

  @IsOptional()
  @IsString()
  adressePlz?: string;

  @IsOptional()
  @IsString()
  adresseOrt?: string;

  @IsOptional()
  @IsString()
  adresseLand?: string;

  @IsOptional()
  @IsString()
  steuernummer?: string;

  @IsOptional()
  @IsString()
  ustId?: string;

  @IsOptional()
  @IsEnum(Lizenzstufe)
  lizenzstufe?: Lizenzstufe;
}
