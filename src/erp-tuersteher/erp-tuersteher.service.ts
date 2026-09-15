// src/erp-tuersteher/erp-tuersteher.service.ts
//
// KORRIGIERT (A71-Fix, 17.08.2026) — nutzte bisher den normalen
// PrismaService, ohne die RLS-Session-Variable (app.current_lizenznehmer_id)
// zu setzen. Die Policy tenant_isolation_zugriffshistorie verlangt diese
// Variable für JEDEN Zugriff (SELECT wie INSERT) — beim INSERT (protokollieren())
// führte das zu einem harten Postgres-Fehler 42501 (RLS-Policy-Verletzung),
// da INSERT/UPDATE die WITH-CHECK-Klausel prüfen und dabei fehlschlagen,
// während SELECT RLS-Verstöße nur still herausfiltert (0 Zeilen statt Fehler).
//
// Fix: PrismaTenantService.withExplicitTenantContext() statt PrismaService —
// setzt die Session-Variable pro Zugriff (Zwei-Schloss-Prinzip, wie bereits
// in q7-verbindung.repository.ts).
//
// WICHTIG (bewusste Design-Entscheidung): Jeder einzelne DB-Zugriff bekommt
// seine EIGENE withExplicitTenantContext()-Transaktion, statt die gesamte
// pruefen()-Methode in eine einzige Transaktion zu wickeln. Grund: Bei einer
// gemeinsamen Transaktion würde ein am Ende geworfener Fehler (z.B.
// ForbiddenException bei Rate-Limit) den bereits geschriebenen
// protokollieren()-Eintrag automatisch zurückrollen — blockierte/verdächtige
// Anfragen würden dann NICHT mehr im Audit-Log (zugriffshistorie) landen.
// Das widerspräche dem Zweck dieser Tabelle. Mit einzeln gewickelten
// Zugriffen bleibt das ursprüngliche Verhalten erhalten: jeder Log-Eintrag
// wird sofort persistiert, unabhängig von später geworfenen Fehlern.
//
// Ursprüngliche Reihenfolge unverändert:
//  0. Signatur/Herkunft prüfen (SignaturPruefungService) — zuerst
//  1. Replay (Anfrage-ID schon bekannt?)
//  2. Rate-Limit
//  3. Neue/unbekannte IP → Anomalie-Protokoll + Benachrichtigung
//  4. Sonst erlaubt

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { TuersteherErgebnis } from '@prisma/client';
import { TUERSTEHER_REGELN } from './tuersteher-regeln';
import { SicherheitsBenachrichtigungService } from './sicherheits-benachrichtigung.service';
import { SignaturPruefungService, SignierteAnfrage } from './signatur-pruefung.service';

export interface TuersteherAnfrage extends SignierteAnfrage {
  ipAdresse: string;
  quelle: string; // z.B. "q7-a15"
}

@Injectable()
export class ErpTuersteherService {
  constructor(
    private readonly tenant: PrismaTenantService,
    private readonly benachrichtigung: SicherheitsBenachrichtigungService,
    private readonly signaturPruefung: SignaturPruefungService,
  ) {}

  /**
   * Wirft ForbiddenException, wenn die Anfrage nicht durchgelassen wird.
   * Gibt sonst einfach zurück (Aufrufer fährt mit Agent XXX fort).
   */
  async pruefen(anfrage: TuersteherAnfrage): Promise<void> {
    const { lizenznehmerId, ipAdresse, anfrageId, quelle } = anfrage;

    // 0. Signatur/Herkunft — beantwortet das eigentliche Bedrohungsszenario
    try {
      await this.signaturPruefung.pruefen(anfrage);
    } catch (error) {
      await this.protokollieren(anfrage, 'BLOCKIERT', 'Signaturprüfung fehlgeschlagen');
      await this.sendeBenachrichtigungFallsMoeglich(
        lizenznehmerId,
        ipAdresse,
        'Signaturprüfung fehlgeschlagen — möglicher Identitätsmissbrauch',
      );
      throw error;
    }

    // 1. Replay-Schutz: Anfrage-ID schon verwendet?
    const bekannt = await this.tenant.withExplicitTenantContext(lizenznehmerId, (tx) =>
      tx.zugriffshistorie.findUnique({ where: { anfrageId } }),
    );
    if (bekannt) {
      await this.protokollieren(anfrage, 'BLOCKIERT', 'Anfrage-ID bereits verwendet (Replay)');
      throw new ForbiddenException('Anfrage bereits verarbeitet.');
    }

    // 2. Rate-Limit
    const zeitfensterStart = new Date(
      Date.now() - TUERSTEHER_REGELN.rateLimitZeitfensterMinuten * 60_000,
    );
    const anzahlLetzteZeit = await this.tenant.withExplicitTenantContext(lizenznehmerId, (tx) =>
      tx.zugriffshistorie.count({
        where: {
          lizenznehmerId,
          zeitpunkt: { gte: zeitfensterStart },
          ergebnis: { not: 'BLOCKIERT' },
        },
      }),
    );
    if (anzahlLetzteZeit >= TUERSTEHER_REGELN.rateLimitAnzahl) {
      await this.protokollieren(anfrage, 'BLOCKIERT', 'Rate-Limit überschritten');
      throw new ForbiddenException('Zu viele Anfragen in kurzer Zeit.');
    }

    // 3. Neue IP für diesen Lizenznehmer? (Anomalie-Monitoring, nicht die
    //    Hauptsicherung — siehe Kommentar oben)
    const ipBekannt = await this.tenant.withExplicitTenantContext(lizenznehmerId, (tx) =>
      tx.zugriffshistorie.findFirst({
        where: { lizenznehmerId, ipAdresse, ergebnis: { not: 'BLOCKIERT' } },
      }),
    );

    if (!ipBekannt) {
      if (TUERSTEHER_REGELN.neueIpSofortBlockieren) {
        await this.protokollieren(anfrage, 'BLOCKIERT', 'Neue, unbekannte IP-Adresse');
        await this.sendeBenachrichtigungFallsMoeglich(lizenznehmerId, ipAdresse, 'Neue, unbekannte IP-Adresse (blockiert)');
        throw new ForbiddenException('Unbekannte IP-Adresse, Zugriff vorerst gesperrt.');
      }

      await this.protokollieren(
        anfrage,
        'VERDAECHTIG_ERLAUBT_MIT_BENACHRICHTIGUNG',
        'Neue, unbekannte IP-Adresse',
      );
      await this.sendeBenachrichtigungFallsMoeglich(lizenznehmerId, ipAdresse, 'Neue, unbekannte IP-Adresse');
      return; // durchgelassen, aber protokolliert + benachrichtigt
    }

    // 4. Alles unauffällig
    await this.protokollieren(anfrage, 'ERLAUBT', null);
  }

  private async protokollieren(
    anfrage: TuersteherAnfrage,
    ergebnis: TuersteherErgebnis,
    grund: string | null,
  ) {
    await this.tenant.withExplicitTenantContext(anfrage.lizenznehmerId, (tx) =>
      tx.zugriffshistorie.create({
        data: {
          lizenznehmerId: anfrage.lizenznehmerId,
          ipAdresse: anfrage.ipAdresse,
          quelle: anfrage.quelle,
          anfrageId: anfrage.anfrageId,
          ergebnis,
          grund: grund ?? undefined,
        },
      }),
    );
  }

  private async sendeBenachrichtigungFallsMoeglich(
    lizenznehmerId: string,
    ipAdresse: string,
    grund: string,
  ) {
    const lizenznehmer = await this.tenant.withExplicitTenantContext(lizenznehmerId, (tx) =>
      tx.lizenznehmer.findUnique({ where: { id: lizenznehmerId } }),
    );

    if (!lizenznehmer?.sicherheitsEmail) {
      return;
    }

    await this.benachrichtigung.sendeVerdachtsmeldung({
      sicherheitsEmail: lizenznehmer.sicherheitsEmail,
      lizenznehmerName: lizenznehmer.name,
      ipAdresse,
      zeitpunkt: new Date(),
      grund,
    });
  }
}
