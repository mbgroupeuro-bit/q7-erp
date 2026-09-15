// src/connector/adapters/q7/q7.adapter.ts
// Q7-ERP — Connector-Schicht: Q7-Adapter (A67 Grundgerüst, A74 vollständig
// implementiert: Signierung + echter Webhook-Versand)
//
// A74-Entscheidungen (Admin, Grillme-Session 18.08.2026):
// - Signatur-Schema: SYMMETRISCH zum eingehenden Weg (Option 1 von 3) —
//   gleiches HMAC-SHA256-Muster wie SignaturPruefungService
//   (src/erp-tuersteher/signatur-pruefung.service.ts), nur umgekehrte
//   Richtung. Ein Geheimnis, zwei Richtungen, kein zusätzliches
//   Secret-Management.
// - Webhook-URL: gespeichert in Q7Verbindung.webhookUrl (neues Feld,
//   siehe A74_Migration_Anleitung.md), nicht in .env (Option 1 von 3 —
//   pro Lizenznehmer, konsistent mit Multi-Tenancy-Prinzip).
// - Scope: nur ANGELEGT/AKTUALISIERT-Events (siehe partner-webhook.listener.ts),
//   GELOESCHT bewusst NICHT in A74 enthalten (separate, spätere Aufgabe).
//
// KORREKTUR (A74): @Inject(Q7_VERBINDUNG_REPOSITORY) ergänzt — siehe
// q7-verbindung-repository.token.ts für die Begründung. Ohne dieses Token
// hätte NestJS beim Instanziieren scheitern müssen.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import {
  AdapterFehler,
  AdapterResult,
  ConnectorEnvelope,
  EntityType,
  Q7ErpExportAdapter,
} from '../../types';
import { Q7_VERBINDUNG_REPOSITORY } from './q7-verbindung-repository.token';

const WEBHOOK_TIMEOUT_MS = 10_000; // 10 Sekunden — verhindert unbegrenztes Hängen bei nicht antwortender Q7-Instanz

export interface Q7VerbindungDaten {
  geheimnis: string;
  webhookUrl: string;
}

export interface Q7VerbindungRepository {
  holeVerbindungsdaten(lizenznehmerId: string): Promise<Q7VerbindungDaten>;
}

// Q7 ist aktuell rein Export-Empfänger (Master-Dok 5, Phase 3: A69/A70
// sind Lese-Endpunkte FÜR Q7 — Q7-ERP schickt/exportiert, importiert nichts
// von Q7 zurück). Deshalb ausschließlich Q7ErpExportAdapter implementiert,
// bewusst NICHT Q7ErpImportAdapter zusätzlich (siehe A66-Entscheidung:
// keine Vererbung, kein Zwangs-Stub für nicht benötigte Richtung).
@Injectable()
export class Q7Adapter implements Q7ErpExportAdapter {
  private readonly logger = new Logger(Q7Adapter.name);

  readonly adapterName = 'q7';

  // Aktueller Umfang laut Roadmap (A69 Partner, A70 Artikel).
  readonly unterstuetzteEntityTypes: EntityType[] = ['Partner', 'Artikel'];

  constructor(
    @Inject(Q7_VERBINDUNG_REPOSITORY)
    private readonly q7VerbindungRepository: Q7VerbindungRepository,
  ) {}

  async exportiere(
    envelope: ConnectorEnvelope,
  ): Promise<AdapterResult<void>> {
    if (!this.unterstuetzteEntityTypes.includes(envelope.entityType)) {
      const fehler: AdapterFehler = {
        entityType: envelope.entityType,
        code: 'ENTITY_TYPE_NICHT_UNTERSTUETZT',
        meldung: `Q7-Adapter unterstützt "${envelope.entityType}" aktuell nicht.`,
      };
      this.logger.warn(fehler.meldung);
      return { erfolg: false, fehler: [fehler] };
    }

    let verbindungsdaten: Q7VerbindungDaten;
    try {
      verbindungsdaten = await this.q7VerbindungRepository.holeVerbindungsdaten(
        envelope.lizenznehmerId,
      );
    } catch (e) {
      const fehler: AdapterFehler = {
        entityType: envelope.entityType,
        code: 'GEHEIMNIS_NICHT_LADBAR',
        meldung: `Keine aktive Q7-Verbindung/Webhook-URL für Lizenznehmer ${envelope.lizenznehmerId} gefunden.`,
      };
      this.logger.error(fehler.meldung);
      return { erfolg: false, fehler: [fehler] };
    }

    if (!verbindungsdaten.webhookUrl) {
      const fehler: AdapterFehler = {
        entityType: envelope.entityType,
        code: 'WEBHOOK_URL_FEHLT',
        meldung: `Für Lizenznehmer ${envelope.lizenznehmerId} ist keine Webhook-URL konfiguriert (Q7Verbindung.webhookUrl).`,
      };
      this.logger.warn(fehler.meldung);
      return { erfolg: false, fehler: [fehler] };
    }

    // Signierung: identisches Muster zu SignaturPruefungService
    // (erp-tuersteher), nur umgekehrte Richtung (Q7-ERP signiert statt
    // zu prüfen). anfrageId neu generiert pro Versand — dient Q7 später
    // als Grundlage für eigenen Replay-Schutz, analog zum eingehenden Weg.
    const anfrageId = randomUUID();
    const zeitstempel = new Date().toISOString();
    const signatur = this.berechneSignatur(
      verbindungsdaten.geheimnis,
      envelope.lizenznehmerId,
      anfrageId,
      zeitstempel,
    );

    try {
      const antwort = await this.sendeWebhook(
        verbindungsdaten.webhookUrl,
        envelope,
        envelope.lizenznehmerId,
        anfrageId,
        zeitstempel,
        signatur,
      );

      if (!antwort.ok) {
        const fehler: AdapterFehler = {
          entityType: envelope.entityType,
          code: 'HTTP_FEHLER',
          meldung: `Q7-Webhook antwortete mit Status ${antwort.status} für Lizenznehmer ${envelope.lizenznehmerId}.`,
        };
        this.logger.error(fehler.meldung);
        return { erfolg: false, fehler: [fehler] };
      }
    } catch (e) {
      const nachricht = e instanceof Error ? e.message : String(e);
      const fehler: AdapterFehler = {
        entityType: envelope.entityType,
        code: 'ZIEL_NICHT_ERREICHBAR',
        meldung: `Q7-Webhook für Lizenznehmer ${envelope.lizenznehmerId} nicht erreichbar: ${nachricht}`,
      };
      this.logger.error(fehler.meldung);
      return { erfolg: false, fehler: [fehler] };
    }

    this.logger.log(
      `Erfolgreich exportiert: ${envelope.entityType} für Lizenznehmer ${envelope.lizenznehmerId} (anfrageId ${anfrageId}).`,
    );

    return { erfolg: true, daten: undefined };
  }

  private berechneSignatur(
    geheimnis: string,
    lizenznehmerId: string,
    anfrageId: string,
    zeitstempel: string,
  ): string {
    // Identische Formel wie SignaturPruefungService.berechneSignatur()
    // (src/erp-tuersteher/signatur-pruefung.service.ts) — bewusst
    // dieselbe Reihenfolge/Trennzeichen, damit Q7 später mit derselben
    // Logik prüfen kann, die der Türsteher hier schon für die
    // Gegenrichtung nutzt.
    return createHmac('sha256', geheimnis)
      .update(`${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
      .digest('hex');
  }

  private async sendeWebhook(
    url: string,
    envelope: ConnectorEnvelope,
    lizenznehmerId: string,
    anfrageId: string,
    zeitstempel: string,
    signatur: string,
  ): Promise<{ ok: boolean; status: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Gleiche Header-Namen wie beim eingehenden Weg (Q7 → Q7-ERP),
          // nur aus Q7-ERP-Sicht jetzt SENDER statt Empfänger.
          'X-Lizenznehmer-Id': lizenznehmerId,
          'X-Anfrage-Id': anfrageId,
          'X-Q7ERP-Timestamp': zeitstempel,
          'X-Q7ERP-Signature': signatur,
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });

      return { ok: response.ok, status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  }
}
