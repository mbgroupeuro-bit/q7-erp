import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateArtikelDto {
  @IsString()
  @IsNotEmpty()
  artikelnummer: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  grundpreis: number; // Prisma-Feld ist Decimal(12,2) — als number im DTO, Prisma konvertiert

  @IsString()
  @IsNotEmpty()
  einheit: string;

  @IsOptional()
  @IsString()
  beschreibung?: string;

  @IsOptional()
  @IsUUID()
  elternArtikelId?: string; // Stufe 2 (Varianten) — optional, erst später aktiv genutzt

  @IsOptional()
  @IsBoolean()
  istBundle?: boolean; // NEU (A62b, 16.08.2026): Stufe 3 — markiert Artikel als Bundle,
                        // Voraussetzung für Stückliste (BundlePosition) und bundleVerkaufBuchen()

  @IsOptional()
  @IsBoolean()
  istKonfigurierbar?: boolean; // NEU (A97-Bugfix, 19.08.2026): Stufe 4 — markiert Artikel als
                                // konfigurierbar, Voraussetzung für Baustein-Gruppen/-Optionen.

  @IsOptional()
  @IsNumber()
  @Min(0)
  mindestbestand?: number; // NEU (A148, 29.08.2026): Schwellenwert für automatischen
                            // Bestellvorschlag. Kein Wert = Artikel wird im
                            // Bestellvorschlag nicht berücksichtigt.

  @IsOptional()
  @IsBoolean()
  lagerrelevant?: boolean; // NEU (A148, 29.08.2026): false = Artikel nie im
                            // Bestellvorschlag (z.B. Dienstleistungen). Default true.

  // NEU (A114-Bugfix, 21.08.2026): class-validator-Decorators nachgerüstet.
  // Ohne Decorators erkannte die globale ValidationPipe (A111, whitelist:
  // true) KEIN Feld dieses DTOs als erlaubt und lehnte jede Artikel-Anlage
  // mit "property X should not exist" ab — echter Produktionsfehler seit
  // dem A111-Fix, aufgedeckt durch den A114-End-to-End-Test.
}
