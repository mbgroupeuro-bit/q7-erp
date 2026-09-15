// src/partner/events/partner-events.ts
// Q7-ERP — Domain-Events für das Partner-Modul (A73)
//
// Bewusst NUR Partner, kein Artikel (Admin-Entscheidung A73-Grillme,
// 17.08.2026) — Artikel-Events folgen erst bei echtem Bedarf, um nicht
// auf Vorrat zu bauen, was A74 (Webhook-Versand) noch gar nicht braucht.
//
// Event-Namen als benannte Konstanten statt verstreuter String-Literale,
// damit Tippfehler beim @OnEvent()-Listener (A74) zur Compile-Zeit
// auffallen würden, wenn PARTNER_EVENTS statt roher Strings genutzt wird.

import { DomainEvent } from '../../common/events/domain-event.interface';

export const PARTNER_EVENTS = {
  ANGELEGT: 'partner.angelegt',
  AKTUALISIERT: 'partner.aktualisiert',
  GELOESCHT: 'partner.geloescht',
} as const;

export interface PartnerEvent extends DomainEvent {
  partnerId: string;
}
