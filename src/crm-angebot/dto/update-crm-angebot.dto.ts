import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CrmAngebotStatus } from '@prisma/client';

export class UpdateCrmAngebotDto {
  @IsOptional()
  @IsEnum(CrmAngebotStatus)
  status?: CrmAngebotStatus;

  @IsOptional()
  @IsDateString()
  gueltigBis?: string;
}
