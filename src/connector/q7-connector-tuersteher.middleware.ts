// src/connector/q7-connector-tuersteher.middleware.ts
// Q7-ERP — Connector-Schicht: Türsteher-Anbindung für eingehende Q7-Anfragen (A69, KORRIGIERT)
//
// ERSETZT den ursprünglichen q7-tuersteher.middleware.ts-Entwurf, der eine
// eigene, parallele Signaturprüfung implementierte. Nach Sichtung von
// src/erp-tuersteher/ (bereits vollständig implementiert, alle 4 Ebenen aus
// Master-Dok 3.7.2) wird stattdessen die bestehende ErpTuersteherService
// wiederverwendet — keine Doppelstruktur, volle Abdeckung (Signatur, Replay,
// Rate-Limit, IP-Anomalie + Benachrichtigung), statt nur Signatur allein.
//
// Erwartetes Anfrage-Format von Q7 (Header), passend zum bestehenden
// SignierteAnfrage-Contract (signatur-pruefung.service.ts):
//   X-Lizenznehmer-Id, X-Anfrage-Id, X-Q7ERP-Timestamp, X-Q7ERP-Signature
// Signatur = HMAC-SHA256(geheimnis, `${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
//
// STATUS: ungetestet gegen echten NestJS-Request (kein Repo-Zugriff).

import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenancyStorage } from '../common/tenancy/tenancy-context';
import { ErpTuersteherService, TuersteherAnfrage } from '../erp-tuersteher/erp-tuersteher.service';

@Injectable()
export class Q7ConnectorTuersteherMiddleware implements NestMiddleware {
  constructor(private readonly tuersteher: ErpTuersteherService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lizenznehmerId = req.headers['x-lizenznehmer-id'] as string | undefined;
    const anfrageId = req.headers['x-anfrage-id'] as string | undefined;
    const zeitstempel = req.headers['x-q7erp-timestamp'] as string | undefined;
    const signatur = req.headers['x-q7erp-signature'] as string | undefined;

    if (!lizenznehmerId || !anfrageId || !zeitstempel || !signatur) {
      throw new BadRequestException(
        'Fehlende Header (X-Lizenznehmer-Id, X-Anfrage-Id, X-Q7ERP-Timestamp, X-Q7ERP-Signature).',
      );
    }

    const anfrage: TuersteherAnfrage = {
      lizenznehmerId,
      anfrageId,
      zeitstempel,
      signatur,
      ipAdresse: req.ip ?? 'unbekannt',
      quelle: 'q7-connector-a69', // TODO: sinnvolle Konstante zentral pflegen, sobald mehr Endpunkte dazukommen
    };

    // Wirft ForbiddenException bei Ablehnung — NestJS wandelt das
    // automatisch in eine 403-Antwort um, kein eigenes Error-Handling nötig.
    await this.tuersteher.pruefen(anfrage);

    // Erst NACH erfolgreicher Prüfung Kontext setzen, damit bestehende
    // Services (z.B. PartnerService.findAll()) unverändert wiederverwendet
    // werden können.
    tenancyStorage.run({ lizenznehmerId }, () => {
      next();
    });
  }
}
