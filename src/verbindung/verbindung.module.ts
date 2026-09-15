// src/verbindung/verbindung.module.ts
// A109/A110 — Modul-Verdrahtung.
// PrismaTenantService und VerschluesselungService werden hier direkt als
// Provider registriert (analog zu PrismaService in konto.module.ts).
// Beide haben keine externen Konstruktor-Abhängigkeiten aus anderen
// Modulen, daher unproblematisch als lokale Provider.
//
// Bekannter offener Punkt (Master-Dokument, Abschnitt 6, #7): dadurch
// entsteht eine weitere unabhängige PrismaTenantService-Instanz neben
// der im Q7-Connector-Modul — funktional unkritisch, bei nächstem
// Code-Review ggf. konsolidieren.

import { Module } from '@nestjs/common';
import { VerbindungController } from './verbindung.controller';
import { VerbindungService } from './verbindung.service';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { VerschluesselungService } from '../common/crypto/verschluesselung.service';

@Module({
  controllers: [VerbindungController],
  providers: [VerbindungService, PrismaTenantService, VerschluesselungService],
})
export class VerbindungModule {}