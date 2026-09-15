import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VerguetungsArt } from '@prisma/client';

export class CreateMitarbeiterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  telefon?: string;

  // GEÄNDERT (26.08.2026): ersetzt das bisherige einzelne "gehalt"-Feld.
  // Genau EINE Basis-Vergütungsart pro Mitarbeiter (Admin-Entscheidung).
  @IsEnum(VerguetungsArt)
  verguetungsArt: VerguetungsArt;

  // Reiner Referenzwert (siehe Modell-Kommentar in schema.prisma) —
  // keine Berechnungslogik im System (Payroll-Klärung, Master-Dokument
  // Abschnitt 6, Punkt 1).
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  verguetungsBetrag: number;

  // OPTIONAL, zusätzlich zur Basis-Art — freier Betrag ohne
  // Berechnungslogik (Admin-Entscheidung, 26.08.2026).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  provisionBetrag?: number;
}
