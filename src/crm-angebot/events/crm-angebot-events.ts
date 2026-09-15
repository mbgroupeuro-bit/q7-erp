export const CRM_ANGEBOT_EVENTS = {
  ANGELEGT: 'crm-angebot.angelegt',
  AKTUALISIERT: 'crm-angebot.aktualisiert',
  GELOESCHT: 'crm-angebot.geloescht',
} as const;

export interface CrmAngebotEvent {
  lizenznehmerId: string;
  crmAngebotId: string;
  zeitpunkt: string;
}
