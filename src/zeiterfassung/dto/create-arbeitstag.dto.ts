import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateArbeitstagDto {
  @IsNotEmpty()
  @IsString()
  mitarbeiterId: string;

  @IsNotEmpty()
  @IsDateString()
  datum: string;

  @IsOptional()
  @IsBoolean()
  gearbeitet?: boolean; // fehlt = true (gearbeitet)

  @IsOptional()
  @IsString()
  bemerkung?: string;
}
