// src/erp-tuersteher/signatur-pruefung.service.ts
// KORRIGIERT (A71-Fix, 17.08.2026) — nutzte bisher den normalen
// PrismaService ohne RLS-Session-Variable. Die Policy
// tenant_isolation_q7_verbindung filtert SELECT-Zugriffe still auf 0 Zeilen,
// wenn app.current_lizenznehmer_id nicht gesetzt ist — das führte zu
// "Keine aktive Q7-Verbindung für diesen Lizenznehmer.", obwohl der
// Datensatz tatsächlich existierte. Fix: PrismaTenantService.withExplicitTenantContext(),
// analog zu q7-verbindung.repository.ts und dem A71-Fix in erp-tuersteher.service.ts.
//
// Beantwortet Bedrohungsmodell-Szenario 1: "gehört die lizenznehmerId
// wirklich zum anfragenden Q7?" — unabhängig von IP, Häufigkeit, etc.
//
// Funktionsweise (HMAC-SHA256, symmetrisches Verfahren):
//  - A15 kennt das geteilte Geheimnis des jeweiligen Lizenznehmers
//  - A15 berechnet: signatur = HMAC-SHA256(geheimnis, lizenznehmerId + anfrageId + zeitstempel)
//  - Türsteher berechnet dieselbe Signatur mit dem in der DB gespeicherten
//    (und hier entschlüsselten) Geheimnis und vergleicht — nur wer das
//    Geheimnis kennt, kann eine gültige Signatur erzeugen
//  - Zeitstempel wird zusätzlich geprüft, damit eine (auch signierte)
//    Anfrage nicht beliebig lange gültig bleibt
//
// timingSafeEqual verhindert Timing-Angriffe beim Vergleich.

import { Injectable, ForbiddenException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { VerschluesselungService } from '../common/crypto/verschluesselung.service';

const SIGNATUR_GUELTIGKEIT_MS = 5 * 60 * 1000; // 5 Minuten

export interface SignierteAnfrage {
  lizenznehmerId: string;
  anfrageId: string;
  zeitstempel: string; // ISO-8601, von A15 gesetzt
  signatur: string; // hex-kodiertes HMAC-SHA256
}

@Injectable()
export class SignaturPruefungService {
  constructor(
    private readonly tenant: PrismaTenantService,
    private readonly verschluesselung: VerschluesselungService,
  ) {}

  /**
   * Wirft ForbiddenException bei ungültiger/fehlender Signatur.
   * Muss VOR jeder anderen Türsteher-Prüfung laufen.
   */
  async pruefen(anfrage: SignierteAnfrage): Promise<void> {
    const { lizenznehmerId, anfrageId, zeitstempel, signatur } = anfrage;

    // 1. Zeitstempel-Frische prüfen (auch bei gültiger Signatur ein
    //    zeitlich begrenztes Fenster erzwingen)
    const zeitpunkt = new Date(zeitstempel).getTime();
    if (Number.isNaN(zeitpunkt) || Math.abs(Date.now() - zeitpunkt) > SIGNATUR_GUELTIGKEIT_MS) {
      throw new ForbiddenException('Anfrage-Zeitstempel ungültig oder abgelaufen.');
    }

    // 2. Geteiltes Geheimnis für diesen Lizenznehmer laden (liegt
    //    verschlüsselt in der DB) und entschlüsseln
    const verbindung = await this.tenant.withExplicitTenantContext(lizenznehmerId, (tx) =>
      tx.q7Verbindung.findUnique({ where: { lizenznehmerId } }),
    );

    if (!verbindung || !verbindung.aktiv) {
      throw new ForbiddenException('Keine aktive Q7-Verbindung für diesen Lizenznehmer.');
    }

    let geheimnisKlartext: string;
    try {
      geheimnisKlartext = this.verschluesselung.entschluesseln(verbindung.geteiltesGeheimnis);
    } catch {
      // Entschlüsselung fehlgeschlagen (z.B. falscher ENCRYPTION_KEY,
      // beschädigter Wert) — als ungültige Anfrage behandeln, kein
      // Server-Fehler nach außen durchreichen.
      throw new ForbiddenException('Verbindungsgeheimnis konnte nicht verifiziert werden.');
    }

    // 3. Signatur neu berechnen und vergleichen
    const erwarteteSignatur = this.berechneSignatur(
      geheimnisKlartext,
      lizenznehmerId,
      anfrageId,
      zeitstempel,
    );

    const gueltig = this.sicherVergleichen(signatur, erwarteteSignatur);
    if (!gueltig) {
      throw new ForbiddenException('Signatur ungültig — Anfrage nicht verifizierbar.');
    }
  }

  private berechneSignatur(
    geheimnis: string,
    lizenznehmerId: string,
    anfrageId: string,
    zeitstempel: string,
  ): string {
    return createHmac('sha256', geheimnis)
      .update(`${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
      .digest('hex');
  }

  private sicherVergleichen(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  }
}
