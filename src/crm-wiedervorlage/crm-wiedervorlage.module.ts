import { Module } from '@nestjs/common';
import { CrmWiedervorlageService } from './crm-wiedervorlage.service';
import { CrmWiedervorlageController } from './crm-wiedervorlage.controller';

@Module({
  controllers: [CrmWiedervorlageController],
  providers: [CrmWiedervorlageService],
})
export class CrmWiedervorlageModule {}
