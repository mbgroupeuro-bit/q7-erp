import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * D04/D05 — eine Position innerhalb einer neuen Bestellung.
 * mwstSatz wird pro Position mitgegeben (D03, Entscheidung 5) — nicht
 * einmalig auf Bestellebene, um gemischt besteuerte Bestellungen zu
 * ermöglichen.
 */
export class CreateBestellPositionDto {
  @IsString()
  artikelId: string;

  @IsNumber()
  @Min(0.001)
  menge: number;

  @IsNumber()
  @Min(0)
  einzelpreis: number;

  @IsNumber()
  @Min(0)
  mwstSatz: number;
}

/**
 * D05 — Eingabe zum Anlegen einer neuen Bestellung.
 *
 * Kundendaten bewusst inline (D03, Entscheidung 1) — kein crmKontaktId-Feld.
 * zahlartAdapterName als freier String (D01, Entscheidung 4, gilt analog
 * für Bestellung) — z.B. "cod" im MVP.
 * carrierAdapterName/sendungsnummer/lagerortId werden hier NICHT gesetzt —
 * die kommen erst beim tatsächlichen Versand hinzu (D11+), nicht beim
 * Anlegen der Bestellung.
 */
export class CreateBestellungDto {
  @IsString()
  quelle: string; // z.B. "manuell", "shop", "facebook", "whatsapp"

  @IsOptional()
  @IsString()
  externeBestellId?: string;

  @IsString()
  kundeName: string;

  @IsOptional()
  @IsString()
  kundeTelefon?: string;

  @IsOptional()
  @IsString()
  kundeAdresse?: string;

  @IsString()
  zahlartAdapterName: string;

  @IsOptional()
  @IsString()
  lagerortId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBestellPositionDto)
  positionen: CreateBestellPositionDto[];
}
