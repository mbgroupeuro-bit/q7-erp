import { Module } from '@nestjs/common';
import { EinkaufService } from './einkauf.service';
import { EinkaufController } from './einkauf.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [EinkaufController],
  providers: [EinkaufService, PrismaService],
  exports: [EinkaufService],
})
export class EinkaufModule {}
