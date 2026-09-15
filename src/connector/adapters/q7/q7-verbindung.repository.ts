// src/connector/adapters/q7/q7-verbindung.repository.ts
// Q7-ERP — Connector-Schicht: reale Implementierung von Q7VerbindungRepository
// (A68, Teil 2 — A74: erweitert um webhookUrl, ein DB-Zugriff statt zwei)
//
// STATUS: ungetestet gegen echte DB (kein DB-Zugriff in dieser Session).

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../../../common/tenancy/prisma-tenant.service';
import { VerschluesselungService } from '../../../common/crypto/verschluesselung.service';
import { Q7VerbindungDaten, Q7VerbindungRepository } from './q7.adapter';

@Injectable()
export class Q7VerbindungPrismaRepository implements Q7VerbindungRepository {
  constructor(
    private readonly tenant: PrismaTenantService,
    private readonly verschluesselung: VerschluesselungService,
  ) {}

  async holeVerbindungsdaten(lizenznehmerId: string): Promise<Q7VerbindungDaten> {
    // Zwei-Schloss-Prinzip (Master-Dok 3.6): RLS-Session-Variable UND
    // expliziter where-Filter, nicht nur eins von beiden.
    const verbindung = await this.tenant.withExplicitTenantContext(
      lizenznehmerId,
      (tx, tenantId) =>
        tx.q7Verbindung.findFirst({
          where: { lizenznehmerId: tenantId, aktiv: true },
        }),
    );

    if (!verbindung) {
      throw new NotFoundException(
        `Keine aktive Q7-Verbindung für Lizenznehmer ${lizenznehmerId} gefunden.`,
      );
    }

    if (!verbindung.webhookUrl) {
      throw new NotFoundException(
        `Q7-Verbindung für Lizenznehmer ${lizenznehmerId} hat keine webhookUrl konfiguriert.`,
      );
    }

    // geteiltesGeheimnis ist verschlüsselt at-rest (A25) — echte
    // Entschlüsselung über VerschluesselungService (bereits im Repo
    // vorhanden, siehe erp-tuersteher/signatur-pruefung.service.ts, das
    // dieselbe Klasse für denselben Zweck nutzt).
    const geheimnis = this.verschluesselung.entschluesseln(verbindung.geteiltesGeheimnis);

    return {
      geheimnis,
      webhookUrl: verbindung.webhookUrl,
    };
  }
}
