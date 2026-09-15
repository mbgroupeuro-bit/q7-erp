import { Module } from '@nestjs/common';
import { CrmKontaktService } from './crm-kontakt.service';
import { CrmKontaktController } from './crm-kontakt.controller';

@Module({
  controllers: [CrmKontaktController],
  providers: [CrmKontaktService],
})
export class CrmKontaktModule {}
