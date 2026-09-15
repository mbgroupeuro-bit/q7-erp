// src/connector/types.ts
// Q7-ERP — Connector-Schicht: gemeinsame Typen
// Herkunft: A65 (einheitliches internes Datenformat) + A66 (Adapter-Schnittstelle)
// Siehe Master-Dokument, Abschnitt 3.4.1 und 3.4.2
// GEÄNDERT (A147, 27.08.2026): EntityType um 'Arbeitstag' erweitert für
// den neuen Q7-Zeiterfassung-Import-Endpunkt (zeiterfassung-import.controller.ts).
// Rein additive Änderung, kein Breaking Change (siehe 3.4.1 Versionierungsregel).
// STATUS: ungetestet, noch nicht ins Repo integriert

// ---------------------------------------------------------------
// A65 — Envelope + EntityType
// ---------------------------------------------------------------

export type EntityType =
  | 'Partner'
  | 'Artikel'
  | 'BundlePosition'
  | 'ArtikelVariante'
  | 'Lagerbestand'
  | 'Arbeitstag';   // NEU (A147) — HR-Zeiterfassung-Import von Q7

export interface ConnectorEnvelope<TPayload = unknown> {
  version: string; // "major.minor", siehe 3.4.1 Versionierungsregel
  lizenznehmerId: string;
  entityType: EntityType;
  timestamp: string; // ISO-8601
  payload: TPayload;
}

// Lagerbestand-Payload braucht laut A65-Entscheidung zusätzlich
// sequenz + aktualisiertAm zur Aktualitäts-Prüfung beim Adapter.
export interface LagerbestandPayload {
  artikelId: string;
  lagerortId: string;
  menge: string; // Decimal als String übertragen, kein Float-Rundungsrisiko
  sequenz: number;
  aktualisiertAm: string; // ISO-8601
}

// ---------------------------------------------------------------
// A66 — Adapter-Interfaces (bewusst KEINE Vererbung, siehe 3.4.2)
// ---------------------------------------------------------------

export interface AdapterFehler {
  entityType?: EntityType;
  code: string; // z.B. "TIMEOUT", "SIGNATUR_UNGUELTIG", "ZIEL_NICHT_ERREICHBAR"
  meldung: string;
}

export type AdapterResult<T> =
  | { erfolg: true; daten: T }
  | { erfolg: false; fehler: AdapterFehler[] };

export interface Q7ErpExportAdapter {
  readonly adapterName: string;
  readonly unterstuetzteEntityTypes: EntityType[];
  exportiere(envelope: ConnectorEnvelope): Promise<AdapterResult<void>>;
}

export interface Q7ErpImportAdapter {
  readonly adapterName: string;
  readonly unterstuetzteEntityTypes: EntityType[];
  importiere(rohdaten: unknown): Promise<AdapterResult<ConnectorEnvelope[]>>;
}
