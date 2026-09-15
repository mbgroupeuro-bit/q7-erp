import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class BestandskorrekturDto {
  @IsString()
  @IsNotEmpty()
  artikelId: string;

  @IsNumber()
  @Min(0)
  neueMenge: number;

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
