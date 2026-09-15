import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ZeiterfassungController } from './zeiterfassung.controller';
import { ZeiterfassungImportController } from './zeiterfassung-import.controller'; // NEU (A147)
import { ZeiterfassungService } from './zeiterfassung.service';
import { ErpTuersteherModule } from '../erp-tuersteher/erp-tuersteher.module'; // NEU (A147) — für Q7ConnectorTuersteherMiddleware
import { Q7ConnectorTuersteherMiddleware } from '../connector/q7-connector-tuersteher.middleware'; // NEU (A147)

@Module({
  imports: [ErpTuersteherModule],
  controllers: [ZeiterfassungController, ZeiterfassungImportController],
  providers: [ZeiterfassungService],
})
export class ZeiterfassungModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Analog partner.module.ts (A69): Nur der Q7-Connector-Import-Endpunkt
    // läuft durch den Türsteher — der normale ZeiterfassungController
    // (JWT-Login-Nutzer) bleibt davon unberührt, JwtAuthGuard greift dort
    // separat. Methode POST (nicht GET wie bei Partner-Export), da hier
    // Daten von Q7 AN Q7-ERP geschickt werden, nicht umgekehrt.
    consumer
      .apply(Q7ConnectorTuersteherMiddleware)
      .forRoutes({ path: 'connector/q7/zeiterfassung', method: RequestMethod.POST });
  }
}
