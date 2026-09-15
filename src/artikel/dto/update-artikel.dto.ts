import { PartialType } from '@nestjs/mapped-types';
import { CreateArtikelDto } from './create-artikel.dto';

export class UpdateArtikelDto extends PartialType(CreateArtikelDto) {}
