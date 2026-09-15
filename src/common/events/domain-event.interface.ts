// src/common/events/domain-event.interface.ts
// Q7-ERP — Gemeinsames Basis-Interface für alle Domain-Events (A73)
//
// Zweck: Jedes Domain-Event im System MUSS eine lizenznehmerId tragen —
// nicht nur per Konvention, sondern erzwungen durch TypeScript. Verhindert
// strukturell ein neues Leck-Szenario (Event ohne oder mit falscher
// lizenznehmerId), das im Master-Dokument 3.6 bisher nicht als eigenes
// Szenario aufgeführt war, aber demselben Grundproblem entspricht.
//
// Admin-Entscheidung (A73-Grillme-Session, 17.08.2026):
// - Events werden ENTKOPPELT ausgelöst (fire-and-forget) — ein Fehler bei
//   der Event-Verarbeitung darf den ursprünglichen Aufruf (z.B.
//   partnerService.create()) NICHT zum Scheitern bringen. Konsistent mit
//   Master-Dok 3.5 (Eigenständigkeits-Test: Q7-ERP muss funktionieren,
//   auch wenn Q7 nicht erreichbar ist).
// - Scope zunächst nur Partner (passend zu A74), Artikel-Events folgen
//   erst bei echtem Bedarf als eigene, spätere Aufgabe.

export interface DomainEvent {
  /** Zwingend erforderlich — nie optional, siehe Zweck oben. */
  lizenznehmerId: string;

  /** ISO-8601-Zeitstempel, wann das Event ausgelöst wurde. */
  zeitpunkt: string;
}
