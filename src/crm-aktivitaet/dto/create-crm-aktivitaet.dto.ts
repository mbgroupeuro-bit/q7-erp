import { IsString, IsUUID } from 'class-validator';

export class CreateCrmAktivitaetDto {
  @IsUUID()
  crmKontaktId: string;

  @IsString()
  text: string;
}
