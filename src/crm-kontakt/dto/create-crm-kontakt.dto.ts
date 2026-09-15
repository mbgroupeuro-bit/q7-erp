import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CrmPipelineStatus } from '@prisma/client';

export class CreateCrmKontaktDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefon?: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsEnum(CrmPipelineStatus)
  pipelineStatus?: CrmPipelineStatus;

  @IsOptional()
  @IsString()
  quelle?: string;
}
