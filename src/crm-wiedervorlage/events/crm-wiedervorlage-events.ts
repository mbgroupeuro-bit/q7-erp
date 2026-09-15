export const CRM_WIEDERVORLAGE_EVENTS = {
  ANGELEGT: 'crm-wiedervorlage.angelegt',
  AKTUALISIERT: 'crm-wiedervorlage.aktualisiert',
  GELOESCHT: 'crm-wiedervorlage.geloescht',
} as const;

export interface CrmWiedervorlageEvent {
  lizenznehmerId: string;
  crmWiedervorlageId: string;
  zeitpunkt: string;
}
