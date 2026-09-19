import { Module } from '@nestjs/common';
import { BestellungService } from './bestellung.service';
import { BestellungController } from './bestellung.controller';

@Module({
  controllers: [BestellungController],
  providers: [BestellungService],
  exports: [BestellungService],
})
export class BestellungModule {}
