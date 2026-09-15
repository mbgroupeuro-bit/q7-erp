// src/connector/adapters/q7/q7-connector.module.ts
// Q7-ERP — Connector-Schicht: Verdrahtung für den Q7-Adapter (A74)
//
// Erstes Modul, das Q7Adapter tatsächlich instanziiert (A67 hatte den
// Adapter nur als freistehende Klasse ohne @Module — siehe Fund zum
// fehlenden DI-Token in q7-verbindung-repository.token.ts).
//
// Importiert PartnerModule, um PartnerService für PartnerWebhookListener
// per Dependency Injection zu bekommen. PrismaTenantService und
// VerschluesselungService werden hier NOCHMAL als eigene Provider
// registriert (gleiches Muster wie in erp-tuersteher.module.ts) — beide
// sind zustandslos genug, dass eine zweite Instanz pro Modul unkritisch
// ist (kein Singleton-Zwang zwischen Modulen in NestJS ohne @Global()).

import { Module } from '@nestjs/common';
import { PartnerModule } from '../../../partner/partner.module';
import { PrismaTenantService } from '../../../common/tenancy/prisma-tenant.service';
import { VerschluesselungService } from '../../../common/crypto/verschluesselung.service';
import { Q7Adapter } from './q7.adapter';
import { Q7VerbindungPrismaRepository } from './q7-verbindung.repository';
import { Q7_VERBINDUNG_REPOSITORY } from './q7-verbindung-repository.token';
import { PartnerWebhookListener } from '../../listeners/partner-webhook.listener';

@Module({
  imports: [PartnerModule],
  providers: [
    PrismaTenantService,
    VerschluesselungService,
    {
      provide: Q7_VERBINDUNG_REPOSITORY,
      useClass: Q7VerbindungPrismaRepository,
    },
    Q7Adapter,
    PartnerWebhookListener,
  ],
  exports: [Q7Adapter],
})
export class Q7ConnectorModule {}
