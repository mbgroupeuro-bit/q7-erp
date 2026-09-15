// src/verbindung/verbindung.service.ts
// A109 — eigene, einfache Status-Query statt Wiederverwendung von
// Q7VerbindungPrismaRepository.holeVerbindungsdaten(): jene Methode ist
// für den Export-Fall gebaut (wirft NotFoundException, entschlüsselt das
// Geheimnis). Für einen Status-Endpoint ist "nicht verbunden" aber ein
// gültiger, anzuzeigender Zustand — keine Exception, kein Entschlüsseln
// nötig (Geheimnis wird hier gar nicht gebraucht).
//
// NEU (A110) — rotiereGeheimnis(): erzeugt ein neues, zufälliges Geheimnis,
// verschlüsselt es via VerschluesselungService (analog A25/A68) und
// speichert es. Das neue Geheimnis wird EINMALIG im Klartext zurückgegeben
// (muss vom Admin in die Q7-Konfiguration übernommen werden) — danach liegt
// es nur noch verschlüsselt in der DB, genau wie beim ursprünglichen
// Anlegen der Verbindung.

import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { VerschluesselungService } from '../common/crypto/verschluesselung.service';

export interface Q7VerbindungStatus {
  verbunden: boolean;
  webhookKonfiguriert: boolean;
  aktiv: boolean;
  erstelltAm: string | null;
  letzteRotation: string | null;
}

export interface Q7RotationsErgebnis {
  neuesGeheimnis: string;
  letzteRotation: string;
}

@Injectable()
export class VerbindungService {
  constructor(
    private readonly tenant: PrismaTenantService,
    private readonly verschluesselung: VerschluesselungService,
  ) {}

  async holeStatus(lizenznehmerId: string): Promise<Q7VerbindungStatus> {
    // Zwei-Schloss-Prinzip wie im bestehenden Repository (RLS +
    // expliziter where-Filter), siehe q7-verbindung.repository.ts.
    const verbindung = await this.tenant.withExplicitTenantContext(
      lizenznehmerId,
      (tx, tenantId) =>
        tx.q7Verbindung.findFirst({
          where: { lizenznehmerId: tenantId },
        }),
    );

    if (!verbindung) {
      return {
        verbunden: false,
        webhookKonfiguriert: false,
        aktiv: false,
        erstelltAm: null,
        letzteRotation: null,
      };
    }

    return {
      verbunden: verbindung.aktiv && !!verbindung.webhookUrl,
      webhookKonfiguriert: !!verbindung.webhookUrl,
      aktiv: verbindung.aktiv,
      erstelltAm: verbindung.erstelltAm.toISOString(),
      letzteRotation: verbindung.letzteRotation.toISOString(),
    };
  }

  async rotiereGeheimnis(lizenznehmerId: string): Promise<Q7RotationsErgebnis> {
    // 32 Byte Zufall, hex-kodiert = 64 Zeichen — gleiche Größenordnung wie
    // ENCRYPTION_KEY, ausreichend als geteiltes HMAC-Geheimnis.
    const neuesGeheimnisKlartext = randomBytes(32).toString('hex');
    const verschluesselt = this.verschluesselung.verschluesseln(neuesGeheimnisKlartext);

    const aktualisiert = await this.tenant.withExplicitTenantContext(
      lizenznehmerId,
      async (tx, tenantId) => {
        const bestehende = await tx.q7Verbindung.findFirst({
          where: { lizenznehmerId: tenantId },
        });

        if (!bestehende) {
          throw new NotFoundException(
            'Keine Q7-Verbindung für diesen Lizenznehmer vorhanden — Rotation nicht möglich.',
          );
        }

        // lizenznehmerId ist @unique — where darauf ist zugleich das
        // zweite Schloss (Zwei-Schloss-Prinzip), kein zusätzlicher
        // id-Vergleich nötig.
        return tx.q7Verbindung.update({
          where: { lizenznehmerId: tenantId },
          data: {
            geteiltesGeheimnis: verschluesselt,
            letzteRotation: new Date(),
          },
        });
      },
    );

    return {
      neuesGeheimnis: neuesGeheimnisKlartext,
      letzteRotation: aktualisiert.letzteRotation.toISOString(),
    };
  }
}
