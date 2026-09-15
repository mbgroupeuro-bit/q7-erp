import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateCrmAngebotPositionDto {
  @IsUUID()
  artikelId: string;

  @IsNumber()
  @IsPositive()
  menge: number;
}

export class CreateCrmAngebotDto {
  @IsUUID()
  crmKontaktId: string;

  @IsOptional()
  @IsDateString()
  gueltigBis?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCrmAngebotPositionDto)
  positionen: CreateCrmAngebotPositionDto[];
}
