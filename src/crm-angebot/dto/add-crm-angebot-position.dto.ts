import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class AddCrmAngebotPositionDto {
  @IsUUID()
  artikelId: string;

  @IsNumber()
  @IsPositive()
  menge: number;
}
