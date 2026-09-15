// src/partner/partner-export.controller.ts
// Q7-ERP — Connector-Schicht: Partner-Export-Endpunkt für Q7 (A69)
// Liegt in src/partner/ (nicht in src/connector/ — KORRIGIERT, siehe
// A72-Session: der ursprüngliche Kopf-Kommentar dieser Datei hatte
// fälschlich src/connector/partner-export.controller.ts behauptet, obwohl
// der reale Ordner immer src/partner/ war, analog zu
// src/artikel/artikel-export.controller.ts).
//
// Läuft hinter Q7ConnectorTuersteherMiddleware (Route-Präfix /connector/q7 —
// Middleware-Zuordnung erfolgt in app.module.ts / dem jeweiligen Modul,
// liegt mir nicht vor).
//
// Wiederverwendet PartnerService.findAll() unverändert (Kapselung, 3.1) —
// KEIN eigener Prisma-Zugriff hier. Die lizenznehmerId kommt nicht aus
// req.user (kein JWT hier), sondern aus dem tenancyStorage-Kontext, den
// Q7ConnectorTuersteherMiddleware bereits gesetzt hat.
//
// A72 (Option 2): try/catch + strukturierte Fehlerbehandlung über
// handleQ7ConnectorError() ergänzt — vorher liefen unbehandelte Fehler
// ungefangen in NestJS' Standard-Exception-Filter, ohne Fehler-ID und
// ohne garantierte Sanitisierung. Hilfsfunktion liegt in src/connector/
// (kein eigener Unterordner) — Import daher mit ../ aus src/partner/ heraus.
//
// STATUS: ungetestet gegen echten NestJS-Request (kein Repo-Zugriff).

import { Controller, Get } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { getCurrentLizenznehmerId } from '../common/tenancy/tenancy-context';
import { ConnectorEnvelope } from '../connector/types';
import { handleQ7ConnectorError } from '../connector/q7-connector-error.util';

@Controller('connector/q7/partner')
export class PartnerExportController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get()
  async exportPartner(): Promise<ConnectorEnvelope> {
    const lizenznehmerId = getCurrentLizenznehmerId();

    try {
      // findAll() erwartet aktuell lizenznehmerId als Parameter (siehe
      // partner.service.ts) UND setzt intern nochmal denselben Wert über
      // withTenantContext()/getCurrentTenantId() — beides muss übereinstimmen,
      // ist hier automatisch der Fall, da beide aus demselben tenancyStorage
      // stammen.
      const partnerListe = await this.partnerService.findAll(lizenznehmerId);

      return {
        version: '1.0',
        lizenznehmerId,
        entityType: 'Partner',
        timestamp: new Date().toISOString(),
        payload: partnerListe,
      };
    } catch (error) {
      handleQ7ConnectorError(error, 'PartnerExport.exportPartner', lizenznehmerId);
    }
  }
}
