import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class WareneingangDto {
  @IsString()
  @IsNotEmpty()
  artikelId: string;

  @IsNumber()
  @IsPositive()
  menge: number;

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
