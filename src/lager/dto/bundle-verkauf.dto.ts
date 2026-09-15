import { IsString, IsNumber, IsOptional, IsPositive } from 'class-validator';

/**
 * DTO für den Bundle-Verkauf (A58/A59).
 * menge = Anzahl verkaufter BUNDLES, nicht Einzelteile.
 * Die tatsächlich abzubuchende Menge je Bestandteil ergibt sich aus
 * BundlePosition.menge * menge (siehe LagerService.bundleVerkaufBuchen).
 */
export class BundleVerkaufDto {
  @IsString()
  artikelId: string; // ID des Bundle-Artikels (Artikel mit istBundle = true)

  @IsNumber()
  @IsPositive()
  menge: number; // Anzahl verkaufter Bundles

  @IsOptional()
  @IsString()
  lagerortId?: string;

  @IsOptional()
  @IsString()
  referenz?: string;

  @IsOptional()
  @IsString()
  bemerkung?: string;
}
