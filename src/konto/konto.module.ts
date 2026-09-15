import { Module } from '@nestjs/common';
import { KontoService } from './konto.service';
import { KontoController } from './konto.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [KontoController],
  providers: [KontoService, PrismaService],
  exports: [KontoService],
})
export class KontoModule {}
