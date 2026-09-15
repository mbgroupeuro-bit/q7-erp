import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCrmWiedervorlageDto {
  @IsUUID()
  crmKontaktId: string;

  @IsString()
  text: string;

  @IsDateString()
  faelligkeitsDatum: string;

  @IsOptional()
  @IsBoolean()
  erledigt?: boolean;
}
