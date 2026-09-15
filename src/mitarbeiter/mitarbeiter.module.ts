import { Module } from '@nestjs/common';
import { MitarbeiterController } from './mitarbeiter.controller';
import { MitarbeiterService } from './mitarbeiter.service';

@Module({
  controllers: [MitarbeiterController],
  providers: [MitarbeiterService],
})
export class MitarbeiterModule {}
