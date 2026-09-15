import { Module } from '@nestjs/common';
import { LagerService } from './lager.service';
import { LagerController } from './lager.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [LagerController],
  providers: [LagerService, PrismaService],
  exports: [LagerService],
})
export class LagerModule {}
