import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class ImportArbeitstagDto {
  @IsNotEmpty()
  @IsString()
  mitarbeiterId: string;

  @IsNotEmpty()
  @IsDateString()
  datum: string;

  @IsOptional()
  @IsBoolean()
  gearbeitet?: boolean; // fehlt = true (gearbeitet), analog CreateArbeitstagDto

  @IsOptional()
  @IsString()
  bemerkung?: string;
}
