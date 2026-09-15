// src/connector/listeners/partner-webhook.listener.ts
// Q7-ERP — Connector-Schicht: Verbindet A73 (Domain-Events) mit A74
// (Webhook-Versand an Q7).
//
// Scope (Admin-Entscheidung, 18.08.2026): NUR ANGELEGT/AKTUALISIERT.
// GELOESCHT wird bewusst NICHT gesendet — der Aufgaben-Titel spricht nur
// von "Partner-Änderung", Löschen ist als eigene, spätere Aufgabe
// vorgesehen (nicht Teil von A74).
//
// Entkopplung (A73-Prinzip, hier fortgeführt): Das Event aus PartnerService
// trägt nur lizenznehmerId + partnerId — die vollen Partnerdaten werden
// hier bewusst FRISCH nachgeladen (PartnerService.findOne()), statt sie im
// Event selbst mitzuführen. Vorteil: Event-Payload bleibt schlank, und
// falls zwischen Auslösen und Verarbeitung des Events weitere Änderungen
// passiert wären, wird immer der aktuelle Stand exportiert.
//
// WICHTIG: Dieser Listener darf NIEMALS einen unbehandelten Fehler werfen.
// @OnEvent-Handler laufen zwar bereits innerhalb des try/catch von
// PartnerService.loesePartnerEventAus() (das den emit()-Aufruf umschließt),
// ABER: da diese Methode hier async ist, würde ein Fehler, der NACH dem
// synchronen emit()-Aufruf auftritt (z.B. beim await der HTTP-Anfrage),
// NICHT mehr von diesem try/catch erfasst — EventEmitter2.emit() wartet
// nicht auf async Listener. Deshalb zusätzlich eigenes try/catch hier,
// als zweite, unabhängige Absicherung der Entkopplung.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PartnerService } from '../../partner/partner.service';
import { PARTNER_EVENTS } from '../../partner/events/partner-events';
import type { PartnerEvent } from '../../partner/events/partner-events';
import { Q7Adapter } from '../adapters/q7/q7.adapter';
import { ConnectorEnvelope } from '../types';

@Injectable()
export class PartnerWebhookListener {
  private readonly logger = new Logger(PartnerWebhookListener.name);

  constructor(
    private readonly partnerService: PartnerService,
    private readonly q7Adapter: Q7Adapter,
  ) {}

  @OnEvent(PARTNER_EVENTS.ANGELEGT)
  async handlePartnerAngelegt(payload: PartnerEvent): Promise<void> {
    await this.exportierePartner(payload);
  }

  @OnEvent(PARTNER_EVENTS.AKTUALISIERT)
  async handlePartnerAktualisiert(payload: PartnerEvent): Promise<void> {
    await this.exportierePartner(payload);
  }

  private async exportierePartner(payload: PartnerEvent): Promise<void> {
    try {
      const partner = await this.partnerService.findOne(
        payload.lizenznehmerId,
        payload.partnerId,
      );

      const envelope: ConnectorEnvelope = {
        version: '1.0',
        lizenznehmerId: payload.lizenznehmerId,
        entityType: 'Partner',
        timestamp: new Date().toISOString(),
        payload: partner,
      };

      const ergebnis = await this.q7Adapter.exportiere(envelope);

      if (!ergebnis.erfolg) {
        this.logger.error(
          `Webhook-Versand fehlgeschlagen für Partner ${payload.partnerId} (Lizenznehmer ${payload.lizenznehmerId}): ${JSON.stringify(ergebnis.fehler)}`,
        );
      }
    } catch (error) {
      // Entkoppelt: Fehler hier (z.B. Partner zwischenzeitlich gelöscht,
      // DB-Fehler beim Nachladen) dürfen NIE nach außen dringen — die
      // ursprüngliche Partner-Operation ist längst abgeschlossen.
      const nachricht = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Fehler beim Verarbeiten von Partner-Event für ${payload.partnerId} (Lizenznehmer ${payload.lizenznehmerId}): ${nachricht}`,
      );
    }
  }
}
