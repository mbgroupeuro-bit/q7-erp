import { PartialType } from '@nestjs/mapped-types';
import { CreateCrmKontaktDto } from './create-crm-kontakt.dto';

export class UpdateCrmKontaktDto extends PartialType(CreateCrmKontaktDto) {}
