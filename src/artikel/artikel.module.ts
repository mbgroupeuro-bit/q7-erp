import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ArtikelService } from './artikel.service';
import { ArtikelController } from './artikel.controller';
import { ArtikelExportController } from './artikel-export.controller'; // NEU (A70)
import { PrismaService } from '../common/prisma/prisma.service';
import { ErpTuersteherModule } from '../erp-tuersteher/erp-tuersteher.module'; // NEU (A70)
import { Q7ConnectorTuersteherMiddleware } from '../connector/q7-connector-tuersteher.middleware'; // NEU (A70)

@Module({
  imports: [ErpTuersteherModule],
  controllers: [ArtikelController, ArtikelExportController],
  providers: [ArtikelService, PrismaService],
  exports: [ArtikelService],
})
export class ArtikelModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Analog partner.module.ts (A69) — nur der Connector-Endpunkt läuft
    // durch den Türsteher, ArtikelController (JWT) bleibt unberührt.
    consumer
      .apply(Q7ConnectorTuersteherMiddleware)
      .forRoutes({ path: 'connector/q7/artikel', method: RequestMethod.GET });
  }
}
