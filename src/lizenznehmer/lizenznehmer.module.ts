// src/lizenznehmer/lizenznehmer.module.ts

import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LizenznehmerService } from './lizenznehmer.service';
import { LizenznehmerController } from './lizenznehmer.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LizenznehmerController],
  providers: [PrismaService, LizenznehmerService],
  exports: [LizenznehmerService],
})
export class LizenznehmerModule {}
