import { PartialType } from '@nestjs/mapped-types';
import { CreateCrmWiedervorlageDto } from './create-crm-wiedervorlage.dto';

export class UpdateCrmWiedervorlageDto extends PartialType(CreateCrmWiedervorlageDto) {}
