import { Module } from '@nestjs/common';
import { CrmAngebotService } from './crm-angebot.service';
import { CrmAngebotController } from './crm-angebot.controller';

@Module({
  controllers: [CrmAngebotController],
  providers: [CrmAngebotService],
})
export class CrmAngebotModule {}
