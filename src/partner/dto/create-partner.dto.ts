import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PartnerTyp } from '@prisma/client';

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PartnerTyp)
  typ: PartnerTyp; // Pflichtfeld im Prisma-Schema

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

  // NEU (A114-Bugfix, 21.08.2026): class-validator-Decorators nachgerüstet.
  // Ohne Decorators erkannte die globale ValidationPipe (A111, whitelist:
  // true) KEIN Feld dieses DTOs als erlaubt und lehnte jede Partner-Anlage
  // mit "property X should not exist" ab — echter Produktionsfehler seit
  // dem A111-Fix, aufgedeckt durch den A114-End-to-End-Test.
}
