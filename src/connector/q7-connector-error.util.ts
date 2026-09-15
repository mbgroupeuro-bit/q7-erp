// src/connector/q7-connector-error.util.ts
//
// Gemeinsame Fehlerbehandlung für alle Q7-Connector-Export-Endpunkte
// (aktuell: artikel-export.controller.ts, partner-export.controller.ts).
// A72, Option 2 — NestJS-Exception-Stil, da beide Controller reine
// Rückgabewerte nutzen (kein @Res() injiziert).
//
// KORRIGIERT: liegt direkt in src/connector/, NICHT in einem eigenen
// src/connector/common/-Unterordner — src hat bereits einen Top-Level
// common/-Ordner (Tenancy etc.), ein zweiter, verschachtelter common/-Ordner
// nur für den Connector wäre verwechslungsträchtig gewesen.
//
// Zweck:
// - Einheitliches, strukturiertes Server-Logging bei Fehlern im Connector-Pfad
// - Nach außen (Richtung Q7) NIE interne Details (Stacktrace, DB-Fehlermeldung,
//   Tabellennamen aus Prisma-Fehlern) durchreichen — nur eine sanitisierte,
//   generische Fehlerantwort mit stabiler Fehler-ID zur Nachverfolgung im Log
//
// Sicherheitsbezug (Master-Dokument 3.7.2, ERP-Türsteher):
// Der Connector ist die Schnittstelle nach außen zu Q7. Ungefilterte Fehlerdetails
// hier sind ein Informationsleck, unabhängig von der Signaturprüfung davor.

import { Logger, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';

const logger = new Logger('Q7Connector');

/**
 * Loggt einen Fehler aus einem Q7-Connector-Export-Endpunkt strukturiert
 * server-seitig und wirft anschließend eine sanitisierte NestJS-Exception
 * (wird von NestJS automatisch in eine 500-Antwort umgewandelt — passt
 * damit zum bestehenden Stil der Export-Controller, die keine eigene
 * Response-Behandlung machen).
 *
 * Verwendung im Controller:
 *   try {
 *     ...
 *   } catch (error) {
 *     handleQ7ConnectorError(error, 'ArtikelExport.exportArtikel', lizenznehmerId);
 *   }
 *
 * Wirft immer — daher Rückgabetyp `never`, TS erkennt damit, dass nach
 * dem Aufruf im catch-Block kein Code mehr erreichbar ist.
 *
 * @param error           Der gefangene Fehler (unbekannter Typ, catch liefert `unknown`)
 * @param context         Kurzer, fester Bezeichner der Stelle (z.B. "ArtikelExport.exportArtikel"),
 *                        NICHT dynamisch aus Nutzereingaben gebildet
 * @param lizenznehmerId  Falls zu diesem Zeitpunkt bereits bekannt, sonst undefined —
 *                        landet nur im Server-Log, nie in der Antwort an Q7
 */
export function handleQ7ConnectorError(
  error: unknown,
  context: string,
  lizenznehmerId?: string,
): never {
  const fehlerId = randomUUID();

  const nachricht = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Server-seitig: vollständig, mit Kontext — landet NICHT in der Antwort an Q7
  logger.error(
    `[${fehlerId}] ${context} — lizenznehmerId=${lizenznehmerId ?? 'unbekannt'} — ${nachricht}`,
    stack,
  );

  // Client-seitig (Richtung Q7): bewusst generisch, keine internen Details.
  // NestJS wandelt diese Exception automatisch in HTTP 500 um.
  throw new InternalServerErrorException({
    fehler: 'INTERNER_FEHLER',
    meldung:
      'Bei der Verarbeitung der Anfrage ist ein Fehler aufgetreten. Bitte mit der fehlerId beim Support melden.',
    fehlerId,
  });
}
