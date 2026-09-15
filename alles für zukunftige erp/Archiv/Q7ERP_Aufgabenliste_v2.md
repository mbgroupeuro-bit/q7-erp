# Q7-ERP — AUFGABENLISTE — Version 2 (Stand: nach Konzeptions-Chat 1, Phase-1-Technik umgesetzt)

## Sofort umsetzbar (technischer Start)

| # | Aufgabe | Bezug |
|---|---|---|
| 1 | ~~NestJS-Projekt unter `D:\Projekt2027\ERP System\` initialisieren~~ — **erledigt** | Setup-Schritte, Master-Dok Abschnitt Tech-Stack |
| 2 | ~~Prisma installieren, `.env` mit PostgreSQL-Verbindung anlegen~~ — **erledigt** | Setup-Schritte |
| 3 | ~~`schema.prisma` einfügen und Migration ausführen~~ — **erledigt** (`init_core`, Prisma 7 config angepasst: URL jetzt in `prisma.config.ts`) | Datei `schema.prisma` |
| 4 | Row-Level-Security-Policies als SQL-Migration für alle Tabellen mit `lizenznehmer_id` anlegen | Master-Dok Abschnitt 3.6 |
| 5 | `common/tenancy`-Middleware bauen (setzt RLS-Session-Variable pro Anfrage automatisch) | Master-Dok Abschnitt 3.6, Punkt 1 |
| 6 | Erste Service-Klasse `LizenznehmerService` als Referenz-Beispiel für Kapselungsmuster bauen | Kapselungsprinzip Abschnitt 3.1 |
| 7 | UUID-v7/ULID-Generierung technisch umsetzen (Prisma unterstützt v7 nicht nativ — Generator-Paket oder DB-Default einrichten), `schema.prisma` entsprechend anpassen | Master-Dok Tech-Stack, Primärschlüssel-Typ |
| 8 | Deterministisches Prüfwerkzeug bauen: Linter-Regel oder Prisma-Middleware, die fehlenden `lizenznehmer_id`-Filter bei Datenbank-Zugriffen automatisch erkennt/blockiert | Master-Dok Abschnitt 3.6, präzisierte Entscheidung |
| 11 | A15-Synchronisations-Agent umsetzen: Domain Events + Webhook + Kontext-Speicher-Schema | Master-Dok Abschnitt 3.7 |
| 12 | ~~Neue Nummern für Buchhaltungs-Agent und Design-Agent vergeben~~ — **erledigt: A16/A17, siehe `Q7_Aenderung_2.md`** | Master-Dok Abschnitt 6 |
| 13 | Branchen-Vorlagen für Onboarding konzipieren (Handwerk, Gastronomie als Start) | Master-Dok Abschnitt 8, Punkt 2 |
| 14 | Standard-Datenexport (CSV/JSON) als Grundfunktion einplanen, nicht erst nachträglich | Master-Dok Abschnitt 8, Punkt 8 |
| 15 | Erweiterungspunkte-Konzept ausarbeiten (wie genau Lizenznehmer individuell erweitern, ohne Kern zu berühren) | Master-Dok Abschnitt 8, Punkt 4 |

## Offene Grundsatzentscheidungen

| # | Aufgabe | Priorität |
|---|---|---|
| 7 | Weitere ERP-Schwächen sammeln (Admin hatte "einige" angekündigt, bisher nur Shopsystem-Integration genannt) | Mittel |
| 8 | Automatisierte Tests für Mandantentrennung konzipieren ("Lizenznehmer A darf nicht auf Daten von B zugreifen") | Hoch |
| 9 | Code-Review-Prozess für neue Datenbank-Zugriffsstellen definieren (wer prüft, welche Checkliste) | Mittel |

## Nächste Konzeptionsphase (nach technischem Grundgerüst)

| # | Aufgabe | Bezug |
|---|---|---|
| 11 | Phase 2 starten: Modul Lager/Warenwirtschaft konzipieren — wird zur Referenzimplementierung für den Modul-Vertrag (Schnittstellen-Standard aller künftigen Module) | Phasen-Roadmap |
| 12 | Modul-Vertrag aus Lager-Implementierung ableiten und dokumentieren (Vorlage für alle künftigen Module) | Phasen-Roadmap |
| 13 | Phase 3 vorbereiten: Connector-/Adapter-Muster definieren (Grundlage für spätere Shop-Integrationen u.a.) | Connector-Prinzip Abschnitt 3.4 |
| 14 | Artikel-Stufen 2–4 (Varianten/Bundle/Konfiguration) als buchbare Freischaltung (Feature-Flag pro Lizenznehmer) technisch umsetzen | Artikel-Stufenkonzept Abschnitt 4 |

## Spätere Phasen (vorgemerkt, noch nicht dringend)

| # | Aufgabe |
|---|---|
| 15 | Phase 4: Modul Buchhaltung/Belegverarbeitung (Bezug zu Q7-Baustelle A15) |
| 16 | Skalierungs-Maßnahmen für PostgreSQL vorbereiten (Read-Replicas, Partitionierung) — rechtzeitig vor Erreichen relevanter Kundenzahlen, nicht erst bei Kapazitätsproblemen |
| 17 | Redis/BullMQ re-evaluieren, sobald konkreter Bedarf für Hintergrundprozesse entsteht |

---

**Verweis:** Vollständige Architektur- und Entscheidungsgrundlage siehe `Q7ERP_MASTER_v1_0.md`.
