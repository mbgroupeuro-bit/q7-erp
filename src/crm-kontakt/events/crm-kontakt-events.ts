export const CRM_KONTAKT_EVENTS = {
  ANGELEGT: 'crm-kontakt.angelegt',
  AKTUALISIERT: 'crm-kontakt.aktualisiert',
  GELOESCHT: 'crm-kontakt.geloescht',
} as const;

export interface CrmKontaktEvent {
  lizenznehmerId: string;
  crmKontaktId: string;
  zeitpunkt: string;
}
