// src/erp-tuersteher/tuersteher-regeln.ts
//
// Feste, nachvollziehbare Schwellenwerte — keine KI, kein "Lernen" im
// Sinne von Machine Learning. Bei Bedarf hier anpassen, nicht im Code
// verstreut.

export const TUERSTEHER_REGELN = {
  // Wie viele Anfragen darf ein Lizenznehmer maximal in diesem Zeitfenster stellen?
  rateLimitAnzahl: 20,
  rateLimitZeitfensterMinuten: 5,

  // Ab wann gilt eine Anfrage-ID als "zu alt" und wird abgelehnt
  // (verhindert, dass abgefangene Anfragen später erneut verwendet werden)
  anfrageGueltigkeitMinuten: 5,

  // Wenn eine IP zum ersten Mal für diesen Lizenznehmer auftaucht:
  // true  = automatisch blockieren, bis Admin/Lizenznehmer freigibt
  // false = durchlassen, aber als "verdächtig" markieren + E-Mail senden
  neueIpSofortBlockieren: false,
} as const;
