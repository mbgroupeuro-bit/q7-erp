// src/erp-tuersteher/erp-tuersteher.module.ts
// AKTUALISIERT (A71-Fix, vollständig) — sowohl ErpTuersteherService als auch
// SignaturPruefungService nutzen jetzt PrismaTenantService (RLS-Session-
// Variable wird korrekt gesetzt). Der normale PrismaService wird in diesem
// Modul dadurch nicht mehr gebraucht.

import { Module } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { ErpTuersteherService } from './erp-tuersteher.service';
import { SicherheitsBenachrichtigungService } from './sicherheits-benachrichtigung.service';
import { SignaturPruefungService } from './signatur-pruefung.service';
import { VerschluesselungService } from '../common/crypto/verschluesselung.service';

@Module({
  providers: [
    PrismaTenantService,
    ErpTuersteherService,
    SicherheitsBenachrichtigungService,
    SignaturPruefungService,
    VerschluesselungService,
  ],
  exports: [ErpTuersteherService],
})
export class ErpTuersteherModule {}
