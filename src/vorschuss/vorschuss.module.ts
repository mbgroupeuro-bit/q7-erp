import { Module } from '@nestjs/common';
import { VorschussService } from './vorschuss.service';
import { VorschussController } from './vorschuss.controller';

@Module({
  controllers: [VorschussController],
  providers: [VorschussService],
})
export class VorschussModule {}
