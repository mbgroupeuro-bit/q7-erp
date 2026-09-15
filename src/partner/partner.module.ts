import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { PartnerExportController } from './partner-export.controller'; // NEU (A69)
import { PrismaService } from '../common/prisma/prisma.service';
import { ErpTuersteherModule } from '../erp-tuersteher/erp-tuersteher.module'; // NEU (A69) — für Q7ConnectorTuersteherMiddleware
import { Q7ConnectorTuersteherMiddleware } from '../connector/q7-connector-tuersteher.middleware'; // NEU (A69)

@Module({
  imports: [ErpTuersteherModule],
  controllers: [PartnerController, PartnerExportController],
  providers: [PartnerService, PrismaService],
  exports: [PartnerService],
})
export class PartnerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Nur der Q7-Connector-Endpunkt läuft durch den Türsteher — der normale
    // PartnerController (JWT-Login-Nutzer) bleibt davon unberührt, da der
    // JwtAuthGuard auf PartnerController bereits separat greift.
    consumer
      .apply(Q7ConnectorTuersteherMiddleware)
      .forRoutes({ path: 'connector/q7/partner', method: RequestMethod.GET });
  }
}
