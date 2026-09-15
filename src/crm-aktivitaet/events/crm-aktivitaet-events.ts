export const CRM_AKTIVITAET_EVENTS = {
  ANGELEGT: 'crm-aktivitaet.angelegt',
  GELOESCHT: 'crm-aktivitaet.geloescht',
} as const;

export interface CrmAktivitaetEvent {
  lizenznehmerId: string;
  crmAktivitaetId: string;
  zeitpunkt: string;
}
