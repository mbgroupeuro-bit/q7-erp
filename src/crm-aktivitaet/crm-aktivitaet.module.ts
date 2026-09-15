import { Module } from '@nestjs/common';
import { CrmAktivitaetService } from './crm-aktivitaet.service';
import { CrmAktivitaetController } from './crm-aktivitaet.controller';

@Module({
  controllers: [CrmAktivitaetController],
  providers: [CrmAktivitaetService],
})
export class CrmAktivitaetModule {}
