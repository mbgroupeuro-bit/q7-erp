import { IsUUID, IsInt, Min, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateArtikelLieferantDto {
  @IsUUID()
  lieferantId: string; // Partner mit typ = LIEFERANT oder BEIDES

  @IsInt()
  @Min(1)
  prioritaet: number; // 1 = Hauptlieferant, 2 = zweite Bezugsquelle, usw.

  @IsNumber()
  @Min(0)
  einkaufspreis: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mindestbestellmenge?: number;

  @IsOptional()
  @IsString()
  bemerkung?: string; // Freitext: Gebinde, Zahlungsziel, Servicequalität etc.
}
