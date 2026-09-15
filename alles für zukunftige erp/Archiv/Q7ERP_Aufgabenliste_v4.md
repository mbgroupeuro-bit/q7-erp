# Q7-ERP — AUFGABENLISTE — Version 4 (Stand: Server läuft fehlerfrei, Auth+RLS+Türsteher technisch fertig)

## Sofort umsetzbar (technischer Start)

| # | Aufgabe | Bezug |
|---|---|---|
| 1 | ~~NestJS-Projekt initialisieren~~ — **erledigt** | Setup |
| 2 | ~~Prisma installieren, `.env` anlegen~~ — **erledigt** | Setup |
| 3 | ~~`schema.prisma` einfügen, Migration ausführen~~ — **erledigt** | Datei `schema.prisma` |
| 4 | ~~RLS-Policies anlegen~~ — **erledigt** (`001_rls_policies.sql`, **noch gegen DB auszuführen, siehe Aufgabe 20**) | Master-Dok 3.6 |
| 5 | ~~Tenancy-Middleware bauen~~ — **erledigt**, inkl. Auth-Modul (JWT) | Master-Dok 3.6, Punkt 1 |
| 6 | ~~`LizenznehmerService` als Kapselungs-Referenz~~ — **erledigt** | Kapselungsprinzip 3.1 |
| 7 | UUID-v7/ULID-Generierung technisch umsetzen | Tech-Stack, Primärschlüssel-Typ |
| 8 | Deterministisches Prüfwerkzeug für fehlenden `lizenznehmer_id`-Filter | Master-Dok 3.6 |
| 11 | A15-Synchronisations-Agent umsetzen (Domain Events + Webhook + Kontext-Speicher) | Master-Dok 3.7 |
| 12 | ~~Nummern A16/A17 vergeben~~ — **erledigt** | Master-Dok Abschnitt 6 |
| 13 | Branchen-Vorlagen für Onboarding konzipieren | Master-Dok 8, Punkt 2 |
| 14 | Standard-Datenexport (CSV/JSON) einplanen | Master-Dok 8, Punkt 8 |
| 15 | Erweiterungspunkte-Konzept ausarbeiten | Master-Dok 8, Punkt 4 |
| 18 | ~~Server startet fehlerfrei~~ — **erledigt** (09.08.2026, `Nest application successfully started`) | — |
| 19 | Ersten echten Tenant-Service bauen (`PartnerService`/`ArtikelService`) nach `PrismaTenantService`-Muster | Aufgabe 6, Folgeaufgabe |
| 20 | `001_rls_policies.sql` gegen die Datenbank ausführen (Code steht, DB-Ausführung noch offen) | Aufgabe 4 |
| 21 | ~~ERP-Türsteher bauen~~ (Guard vor Agent XXX: Replay-Schutz, Rate-Limit, IP-Anomalie-Erkennung) — **erledigt**, Code steht | Grill-Me 09.08.2026, `Q7ERP_Agentenkommunikation_v1.md` |
| 22 | ~~Signaturprüfung (HMAC) für Türsteher~~ — **erledigt**, Code steht (`signatur-pruefung.service.ts`, `Q7Verbindung`-Model) | Grill-Me 09.08.2026, Bedrohungsmodell-Szenario 1 |
| 23 | Ersten Lizenznehmer + Benutzer anlegen, Login End-to-End testen | Direkt nächster Schritt |
| 24 | Sicheren Übergabeweg für `geteiltesGeheimnis` (Q7 ↔ ERP) konzipieren — aktuell nur manuell in DB gesetzt | Signaturprüfung, offener Punkt |
| 25 | Geheimnis-Verschlüsselung at-rest für `q7_verbindung.geteiltesGeheimnis` (liegt aktuell im Klartext) | Signaturprüfung, offener Punkt |
| 26 | `LizenznehmerController` mit Admin-Guard absichern (aktuell komplett offen, kein Auth) | Grill-Me 09.08.2026, Punkt 4 |
| 27 | Expliziten `lizenznehmerId`-Filter in Tenant-Services ergänzen, zusätzlich zu RLS (aktuell nur RLS als einzige Sicherung) | Grill-Me 09.08.2026, Punkt 1 |

## Offene Grundsatzentscheidungen

| # | Aufgabe | Priorität |
|---|---|---|
| 7 | Weitere ERP-Schwächen sammeln | Mittel |
| 8 | Automatisierte Tests für Mandantentrennung konzipieren | Hoch |
| 9 | Code-Review-Prozess für neue DB-Zugriffsstellen definieren | Mittel |
| 10 | Agentenkommunikation Q7 ↔ Q7-ERP — Konzept entschieden, `Q7ERP_Agentenkommunikation_v1.md`, Türsteher+Signatur umgesetzt, Agent XXX selbst noch nicht gebaut | Mittel |
| 11 | Registrierungs-/Admin-Endpunkt für Benutzeranlage bauen (aktuell nur manuelles Seed-Skript) | Mittel |
| 12 | Rollen/Rechte innerhalb eines Lizenznehmers konzipieren | Niedrig |
| 13 | Verschachtelte Transaktionen in `PrismaTenantService` absichern (Grill-Me Punkt 2, Option C: Connection-Pool-Hook) | Mittel |
| 14 | Globalen `APP_GUARD` statt Middleware für JWT-Prüfung evaluieren (Grill-Me Punkt 3) | Niedrig |

## Nächste Konzeptionsphase (nach technischem Grundgerüst)

| # | Aufgabe | Bezug |
|---|---|---|
| 11 | Phase 2: Modul Lager/Warenwirtschaft konzipieren | Phasen-Roadmap |
| 12 | Modul-Vertrag aus Lager-Implementierung ableiten | Phasen-Roadmap |
| 13 | Phase 3: Connector-/Adapter-Muster definieren | Connector-Prinzip 3.4 |
| 14 | Artikel-Stufen 2–4 als Feature-Flag umsetzen | Artikel-Stufenkonzept 4 |

## Spätere Phasen (vorgemerkt, noch nicht dringend)

| # | Aufgabe |
|---|---|
| 15 | Phase 4: Modul Buchhaltung/Belegverarbeitung |
| 16 | Skalierungs-Maßnahmen PostgreSQL (Read-Replicas, Partitionierung) |
| 17 | Redis/BullMQ re-evaluieren |
| 18 | CRM/HR als eigenständige Module vorbereiten, Core modul-offen halten |

---

**Verweis:** `Q7ERP_MASTER_v4.md`, `Q7ERP_Agentenkommunikation_v1.md`.
