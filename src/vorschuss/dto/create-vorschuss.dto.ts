import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateVorschussDto {
  @IsString()
  @IsNotEmpty()
  mitarbeiterId: string;

  @IsNumber()
  @Min(0.01)
  betrag: number;

  @IsDateString()
  datum: string;

  @IsOptional()
  @IsString()
  bemerkung?: string;
}
