// src/artikel/artikel-export.controller.ts
// Q7-ERP — Connector-Schicht: Artikel-Export-Endpunkt für Q7 (A70)
// Analog zu partner-export.controller.ts (A69) — wiederverwendet
// ArtikelService.findAll() unverändert (Kapselung, 3.1), geschützt durch
// dieselbe Q7ConnectorTuersteherMiddleware (bestehender ErpTuersteherService).
//
// A72 (Option 2): try/catch + strukturierte Fehlerbehandlung über
// handleQ7ConnectorError() ergänzt. Hilfsfunktion liegt direkt in
// src/connector/ (kein eigener Unterordner) — Import daher mit ../
// aus src/artikel/ heraus.
//
// STATUS: ungetestet gegen echten NestJS-Request (kein Repo-Zugriff).
// Hinweis: grundpreis ist Prisma Decimal — sollte über die eingebaute
// toJSON()-Serialisierung von Decimal.js sauber als String im JSON landen,
// aber tatsächlich noch nicht am echten Response geprüft (Laufzeit-Test
// steht aus, siehe Master-Dok).

import { Controller, Get } from '@nestjs/common';
import { ArtikelService } from './artikel.service';
import { getCurrentLizenznehmerId } from '../common/tenancy/tenancy-context';
import { ConnectorEnvelope } from '../connector/types';
import { handleQ7ConnectorError } from '../connector/q7-connector-error.util';

@Controller('connector/q7/artikel')
export class ArtikelExportController {
  constructor(private readonly artikelService: ArtikelService) {}

  @Get()
  async exportArtikel(): Promise<ConnectorEnvelope> {
    const lizenznehmerId = getCurrentLizenznehmerId();

    try {
      const artikelListe = await this.artikelService.findAll(lizenznehmerId);

      return {
        version: '1.0',
        lizenznehmerId,
        entityType: 'Artikel',
        timestamp: new Date().toISOString(),
        payload: artikelListe,
      };
    } catch (error) {
      handleQ7ConnectorError(error, 'ArtikelExport.exportArtikel', lizenznehmerId);
    }
  }
}
