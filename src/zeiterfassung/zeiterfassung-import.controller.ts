// src/zeiterfassung/zeiterfassung-import.controller.ts
// Q7-ERP — Connector-Schicht: Zeiterfassung-Import-Endpunkt für Q7 (A147)
//
// Gegenrichtung zu partner-export.controller.ts (A69): hier schickt Q7
// Daten AN Q7-ERP (z.B. "Yaseen, Peter, Hans... gearbeitet, Norman nicht"),
// nachdem Q7 die Freitext-Nachricht des Chefs bereits in strukturierte
// Einträge umgewandelt hat. Q7-ERP selbst verarbeitet hier keinen Freitext.
//
// Läuft hinter Q7ConnectorTuersteherMiddleware (modul-lokal registriert
// in zeiterfassung.module.ts, analog partner.module.ts A69) — Header-
// Prüfung identisch, kein separates Auth-Schema nötig.
//
// Pro Eintrag wird die bestehende ZeiterfassungService.create()-Logik
// wiederverwendet (Kapselung, 3.1) — inkl. IDOR-Prüfung (Mitarbeiter
// gehört zum Lizenznehmer) und @@unique([mitarbeiterId, datum])-Schutz.
//
// Bewusste Entscheidung: EIN fehlerhafter Eintrag (z.B. Tag bereits
// erfasst, unbekannte mitarbeiterId) bricht NICHT den gesamten Batch ab —
// jeder Eintrag wird einzeln verarbeitet, Erfolg/Fehler pro Eintrag im
// Response zurückgemeldet. Sonst würde ein einzelner Konflikt (z.B.
// Doppel-Meldung durch Q7) die ganze Tagesmeldung verwerfen.
//
// STATUS: ungetestet gegen echten NestJS-Request (kein Repo-Zugriff).

import { Controller, Post, Body } from '@nestjs/common';
import { ZeiterfassungService } from './zeiterfassung.service';
import { getCurrentLizenznehmerId } from '../common/tenancy/tenancy-context';
import { ConnectorEnvelope } from '../connector/types';
import { handleQ7ConnectorError } from '../connector/q7-connector-error.util';
import { ImportArbeitstagDto } from './dto/import-arbeitstag.dto';

interface ImportErgebnis {
  mitarbeiterId: string;
  datum: string;
  erfolg: boolean;
  id?: string;
  fehler?: string;
}

@Controller('connector/q7/zeiterfassung')
export class ZeiterfassungImportController {
  constructor(private readonly zeiterfassungService: ZeiterfassungService) {}

  @Post()
  async importZeiterfassung(
    @Body() eintraege: ImportArbeitstagDto[],
  ): Promise<ConnectorEnvelope> {
    const lizenznehmerId = getCurrentLizenznehmerId();

    try {
      const ergebnisse: ImportErgebnis[] = [];

      for (const eintrag of eintraege) {
        try {
          const erstellt = await this.zeiterfassungService.create(lizenznehmerId, {
            mitarbeiterId: eintrag.mitarbeiterId,
            datum: eintrag.datum,
            gearbeitet: eintrag.gearbeitet,
            bemerkung: eintrag.bemerkung,
          });
          ergebnisse.push({
            mitarbeiterId: eintrag.mitarbeiterId,
            datum: eintrag.datum,
            erfolg: true,
            id: erstellt.id,
          });
        } catch (einzelFehler) {
          ergebnisse.push({
            mitarbeiterId: eintrag.mitarbeiterId,
            datum: eintrag.datum,
            erfolg: false,
            fehler:
              einzelFehler instanceof Error
                ? einzelFehler.message
                : 'Unbekannter Fehler',
          });
        }
      }

      return {
        version: '1.0',
        lizenznehmerId,
        entityType: 'Arbeitstag',
        timestamp: new Date().toISOString(),
        payload: ergebnisse,
      };
    } catch (error) {
      handleQ7ConnectorError(
        error,
        'ZeiterfassungImport.importZeiterfassung',
        lizenznehmerId,
      );
    }
  }
}
