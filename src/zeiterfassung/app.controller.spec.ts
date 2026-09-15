import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateArbeitstagDto {
  @IsString()
  @IsNotEmpty()
  mitarbeiterId: string;

  @IsDateString()
  datum: string;

  @IsOptional()
  @IsString()
  bemerkung?: string;
}
