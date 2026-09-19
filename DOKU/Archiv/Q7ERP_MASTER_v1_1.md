# Q7-ERP MASTER-DOKUMENT — Version 1.1

**Status:** Phase 2 (Lager/Warenwirtschaft) abgeschlossen — bereit für Phase 3 (Connector-/Adapter-Schicht)
**Zweck:** Zentrale Sammlung aller Architektur- und Technologieentscheidungen für das eigenständige ERP-System "Q7-ERP"

---

## 1. GRUNDVERSTÄNDNIS

Q7-ERP ist ein **eigenständiges System** — nicht Bestandteil von Q7, sondern:
- eigenständig betreibbar (läuft auch ohne Q7)
- eigenständig verkaufbar (eigenes Produkt)
- **mit Q7 verbunden** (Q7 greift als Client über eine Connector-Schicht auf Q7-ERP zu, nicht umgekehrt)

**Zielbild:** Modular wie SAP, aber schlanker. Kunde (Lizenznehmer) kann das System jederzeit auf eigene Besonderheiten erweitern, ohne den Kern zu brechen.

**Entwicklungsansatz:** Vollständige Neuentwicklung ("Stück für Stück"). Kein Aufbau auf ERPNext/Frappe, Odoo oder anderer bestehender ERP-Software.

**Terminologie-Regel (bindend, aus Q7 übernommen):** Ausschließlich "Admin" — niemals "GF".

---

## 2. TECH-STACK (final entschieden)

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Datenbank-Engine | **PostgreSQL** | Relational, stabil, bewährt bis in den Millionen-Datensatz-Bereich, passend für ERP-Datenbeziehungen |
| Backend-Framework | **NestJS** | Erzwingt saubere Modul-Struktur, bessere Testbarkeit/Fehlerbehandlung, passt zum langfristigen SAP-artigen Anspruch |
| ORM | **Prisma** | Marktstandard, gute Entwicklererfahrung, funktioniert mit NestJS (Alternative geprüft: TypeORM — verworfen zugunsten Prisma) |
| Sprache | **TypeScript** | Typsicherheit, an NestJS gekoppelt, keine sinnvolle Alternative bei bestehender Framework-Wahl |
| Q7 (bestehend) | **Next.js bleibt unverändert** | Kein Frontend-Wechsel bei Q7 nötig, Q7-ERP ist eigenständig |
| Redis / BullMQ | **Zurückgestellt**, kein Phase-1-Bestandteil | Erst bei echtem Bedarf einführen; durch Kapselungsprinzip später risikoarm nachrüstbar |
| Architekturmuster | **Modularer Monolith** (nicht Microservices) | Geringerer Infrastruktur-Overhead am Anfang; spätere Migration einzelner Module zu Microservices möglich |
| Primärschlüssel-Typ | **UUID v7 / ULID** | Zeitlich sortierbar (bessere Index-Performance als reines UUID v4), trotzdem global eindeutig — wichtig bei geteilter Datenbank mit vielen Lizenznehmern. *Technischer Hinweis: Prismas `@default(uuid())` erzeugt Standard-UUID v4 — für v7/ULID wird ein externer Generator oder DB-seitiger Default nötig, in `schema.prisma` entsprechend anzupassen.* |

---

## 3. VERBINDLICHE ARCHITEKTUR-PRINZIPIEN

### 3.1 Kapselung (zwingend, für alle Technologie-Zugriffe)
Kein Programmteil greift direkt auf Technologie-Details zu (z.B. nie `prisma.kunde.findUnique(...)` verstreut im Code). Zugriff immer über eine Zwischen-Schicht (Service-Klassen in NestJS). Zweck: Technologie-Wechsel künftig nur an einer Stelle nötig, nicht an hunderten Stellen im Code.

### 3.2 Modul-Eigenständigkeit
Jedes Fachmodul (Buchhaltung, Lager, etc.) besitzt eigene Datenbank-Tabellen/Schema. Kein Modul schreibt direkt in Tabellen eines anderen Moduls — Kommunikation nur über definierte Schnittstellen.

**Bekannte Abweichung (Phase 2, dokumentiert statt behoben — siehe Abschnitt 6):** `LagerService.bundleVerkaufBuchen()` liest lesend direkt aus den Tabellen `artikel` und `bundlePosition` (Artikel-Modul), statt über einen `ArtikelService`. Kein Sicherheitsrisiko (korrekt `lizenznehmerId`-gefiltert, siehe A63 Code-Review), aber architektonische Abweichung von diesem Prinzip. Details: `Q7ERP_Modulvertrag_Lager_v1.md`, Abschnitt 4.

### 3.3 Gemeinsamer Stammdaten-Kern
Zentraler "Core"-Bereich (Mandant, Partner, Artikel, Konten), von allen Modulen referenziert.

### 3.4 Connector-Prinzip (für Anbindung Dritter, z.B. Shopsysteme, Q7, DATEV)
```
Q7-ERP Kern (Aufträge, Lager, Kunden)
    ↕
Connector-Schicht (einheitliches internes Format)
    ↕
Shopify | WooCommerce | DATEV | Q7 | ... (je ein austauschbarer Adapter)
```
Jedes externe System bekommt einen eigenen kleinen Adapter, der zwischen externem Format und internem Q7-ERP-Format übersetzt. Der Kern wird bei neuen Integrationen nicht verändert — nur ein neuer Adapter kommt hinzu. Voraussetzung: sauberes, einheitliches internes Datenformat (Teil von Phase 1) + festes Adapter-Muster (Teil von Phase 3).

### 3.5 Eigenständigkeits-Test
Q7-ERP muss funktionsfähig bleiben, auch wenn Q7 nicht erreichbar ist — und umgekehrt.

### 3.6 ⚠️ KRITISCH — Datenleck-Schutz bei Multi-Tenancy (Option A: geteilte Datenbank)

**Status: Höchste Priorität, verbindlich für alle Entwicklungsphasen. Keine Ausnahmen, keine Abkürzungen.**

**Grundproblem:** Bei geteilter Datenbank (Option A, entschieden) liegen alle Lizenznehmer in denselben Tabellen, getrennt nur durch die Spalte `lizenznehmer_id`. Ein Datenleck zwischen Lizenznehmern entsteht immer dann, wenn irgendwo eine Datenbank-Abfrage diesen Filter nicht anwendet.

**Bekannte Leck-Szenarien (müssen bei jeder neuen Funktion aktiv geprüft werden):**

| # | Szenario | Beschreibung |
|---|---|---|
| 1 | Vergessener Filter in einer Abfrage | Eine Abfrage holt Daten ohne `where lizenznehmer_id = ...` — zeigt versehentlich Daten aller Lizenznehmer |
| 2 | Manipulierte ID in der Web-Anfrage (IDOR) | System prüft nur "existiert Datensatz X?", nicht zusätzlich "gehört X auch zum aktuell angemeldeten Lizenznehmer?" — Nutzer kann durch Ändern der ID in der Adresszeile fremde Daten abrufen |
| 3 | Verknüpfte Abfragen (JOINs) mit fehlendem Filter auf der zweiten Tabelle | Filter nur auf der Haupttabelle gesetzt, verknüpfte Tabelle (z.B. Bundle-Bestandteile) bleibt ungeprüft |
| 4 | Debug-/Admin-Werkzeuge ohne Filter | Interne Werkzeuge für Support/Fehlersuche umgehen den Filter bewusst — Risiko, wenn nicht sauber abgesichert oder versehentlich erreichbar |

**Verbindliche Gegenmaßnahmen (alle vier zusammen, nicht alternativ):**

1. **Zentrale Durchsetzung statt Einzelfall-Disziplin:** Der `lizenznehmer_id`-Filter wird nicht in jeder Abfrage einzeln von Hand geschrieben, sondern automatisch von der Service-Zwischenschicht erzwungen (z.B. `holeArtikel(id)` baut die Filterung intern immer selbst ein). Entwickler können den Filter dadurch strukturell nicht vergessen.
2. **Row-Level Security (RLS) in PostgreSQL:** Zusätzliche, unabhängige Sicherheitsebene direkt in der Datenbank — verhindert falsche Zeilen-Ausgabe selbst dann, wenn im Code ein Fehler passiert. "Zweites Schloss an der Tür."
3. **Automatisierte Tests:** Gezielte Tests, die simulieren "Lizenznehmer A versucht auf Daten von Lizenznehmer B zuzugreifen — muss fehlschlagen." Laufen bei jeder Änderung automatisch mit.
4. **Code-Review-Pflicht:** Jede neue Datenbank-Zugriffsstelle wird vor Freigabe von zweiter Person geprüft, mit explizitem Fokus auf korrekte Lizenznehmer-Filterung.

**Entscheidung (Admin, geklärt & präzisiert):** Kein KI-Agent zur Überwachung der Mandantentrennung. Stattdessen **deterministisches Prüfwerkzeug** — Linter-Regel bzw. Prisma-Middleware, die bei jedem Datenbank-Zugriff automatisch prüft/erzwingt, dass `lizenznehmer_id` gesetzt ist. Vorteil gegenüber einem KI-Agenten: deterministisch, nicht interpretationsabhängig, läuft direkt im Build-/Zugriffsprozess statt als separates Überwachungssystem. Ergänzt Maßnahme 1 (Kapselung) technisch konkret; Maßnahme 3 (automatisierte Tests) und Maßnahme 4 (Code-Review) bleiben zusätzlich bestehen.

**Umsetzungsstand Phase 2 (Lager-Modul):** Maßnahme 1 (zentrale Filterung in Service-Methoden) und Maßnahme 4 (Code-Review, A63) sind für das Lager-Modul umgesetzt und geprüft — keine Funde. Maßnahme 2 (RLS-Policies auf DB-Ebene für `lagerbestand`/`lagerbewegung`/`lagerort`) wurde im Rahmen von A63 **nicht** verifiziert (SQL-Migrationsdatei lag nicht vor) — offener Prüfpunkt, siehe Abschnitt 6.

---

### 3.7 Kontext-Synchronisation Q7 ↔ Q7-ERP (vormals "Digital Twin")

**Grundprinzip (geklärt):** "Digitaler Zwilling" ist kein separates Marketing-Konzept, sondern zwei technische Bausteine, die ohnehin gebraucht werden:
1. **Synchronisations-Mechanismus** (aktiv) — bewegt relevante Daten von Q7-ERP zu Q7, ausgelöst über Domain Events aus dem ERP-Kern, übertragen via Connector-Schicht (Phase 3)
2. **Kontext-Speicher** (passiv) — eigene, read-optimierte Tabellen auf Q7-Seite, in denen die gespiegelten Daten liegen; Q7-Agenten fragen diesen Speicher ab, nie Q7-ERP live direkt

**Warum nötig:** Verhindert Live-Zugriff von Q7-Agenten auf die produktive Q7-ERP-Datenbank bei jeder Entscheidung — schont das Live-System, hält Q7-ERP eigenständig (3.5), vereinfacht Multi-Tenancy-Absicherung (3.6, da Zugriff über Q7s eigene Kapselung läuft statt zusätzlich durch Q7-ERPs RLS).

**Technischer Ablauf:** Q7-ERP-Service löst Event aus → Connector-Webhook überträgt an Q7 → Kontext-Speicher (eigenes Prisma-Schema in Q7) wird aktualisiert (inkl. `letzteSyncZeit` zur Aktualitäts-Prüfung) → Agenten fragen über eine zentrale `KontextService`-Zwischenschicht ab (Kapselung, analog 3.1). `lizenznehmerId` wird auch im Kontext-Speicher konsequent mitgeführt.

**Entscheidung (Admin, geklärt):** Neuer, eigener Q7-Agent ausschließlich für Q7-ERP-Kommunikation/Synchronisation — keine Erweiterung der bestehenden A01-Logik. Grund: saubere Trennung der Zuständigkeit, A01 bleibt auf Lizenznehmer-Kommunikation fokussiert (Black-Box-Prinzip, 3.1 aus Q7-Governance).

**Nummernkreis (Admin, geklärt):** **A15 = Q7-ERP-Synchronisations-Agent.** Damit ist der bisherige A15-Konflikt (Buchhaltungs-Agent vs. Design-Agent, siehe Q7-Governance) zugunsten des Synchronisations-Agenten aufgelöst. Buchhaltungs- und Design-Agent benötigen neue, noch zu vergebende Nummern — siehe Abschnitt 6.

**Umsetzungsstand:** Der eigentliche Event-Mechanismus (Domain Events) ist noch nicht gebaut — geplant für Etappe 4, Aufgabe **A73**, im Rahmen der Connector-/Adapter-Schicht (Phase 3).

---

## 4. ARTIKEL-DATENMODELL — STUFENKONZEPT (Teil von Phase 1)

Komplexe Artikelstrukturen (Varianten, Bundles, Konfigurationen) werden **nicht** in einem einzigen starren Modell abgebildet, sondern in vier aufeinander aufbauenden, einzeln buchbaren Stufen:

| Stufe | Inhalt | Datenstruktur-Prinzip | Umsetzungsstand |
|---|---|---|---|
| **Artikel-Stufe 1** | Einfacher Artikel | Basis: ID, Name, Grundpreis, Einheit | ✅ umgesetzt (Etappe 2) |
| **Artikel-Stufe 2** | Varianten | Eltern-Kind-Beziehung; jede Variante = eigener Artikel-Datensatz mit Verweis auf Elternartikel, eigene Bestandsführung | Datenmodell vorhanden (`elternArtikelId`), Service-/Endpunkt-Logik noch nicht vertieft getestet |
| **Artikel-Stufe 3** | Bundles | Stücklisten-Tabelle: Bundle referenziert mehrere Einzelartikel; Lagerbestand der Einzelteile wird beim Bundle-Verkauf automatisch abgebucht | ✅ umgesetzt (Etappe 3, A58/A62b): `istBundle`-Feld in `CreateArtikelDto`, Endpunkt `POST /artikel/:id/bundle-positionen`, Abbuchung über `LagerService.bundleVerkaufBuchen()` — end-to-end getestet (A62) |
| **Artikel-Stufe 4** | Konfigurationen | Baustein-Gruppen + Regel-Engine (Pflicht-/Optional-Auswahl, Ausschluss-Regeln, Preisbeeinflussung) | Datenmodell vorhanden (`BausteinGruppe`, `BausteinOption`, `Konfigurationsregel`), Service-/Endpunkt-Logik noch nicht begonnen |

**Buchungslogik:** Stufen 2–4 sind unabhängig voneinander buchbar (kein Zwangspaket), können bei Bedarf zusammenspielen (z.B. Bundle aus Varianten). Alle vier Stufen werden vollständig vorentwickelt ("Schablone"); pro Lizenznehmer wird nur freigeschaltet, was gebucht ist (Modul-Schalter/Feature-Flag). Bestehende Artikel-Daten bleiben beim Zubuchen einer höheren Stufe unangetastet — kein Migrationsrisiko.

**Namenskonvention-Hinweis:** "Artikel-Stufe 1–4" bewusst getrennt von "Phase 1–4" (Gesamt-Roadmap) und von späteren Fachmodulen (Buchhaltung, Lager), um Verwechslung zu vermeiden.

---

## 5. PHASEN-ROADMAP (Gesamt-Aufbau, Reihenfolge bindend)

1. **Phase 1 — Kern-Datenmodell:** Mandant/Lizenznehmer-Trennung, Stammdaten (Partner, Artikel inkl. Stufenkonzept, Konten). ✅ **abgeschlossen** (Etappe 2, A45).
2. **Phase 2 — Erstes Fachmodul (Referenzimplementierung): Lager/Warenwirtschaft.** Zweck: Modul-Vertrag am echten Beispiel festlegen. ✅ **abgeschlossen** (Etappe 3, A64, 16.08.2026) — inkl. Wareneingang/-ausgang, Bestandskorrektur, Bundle-Verkauf, Modul-Vertrag (`Q7ERP_Modulvertrag_Lager_v1.md`) und Code-Review (`Q7ERP_CodeReview_Lager_v1.md`).
3. **Phase 3 — API-/Connector-Schicht nach außen:** Erst nach Phase 2, um keine Schnittstelle für ein noch nicht existierendes Modul zu bauen. 🟡 **nächste Phase** (Etappe 4, ab A65).
4. **Phase 4 — Zweites Modul:** Kandidat Buchhaltung/Belegverarbeitung (Bezug zu Q7-Agent A16, vormals A15 — siehe `Q7_Aenderung_2.md`).

---

## 6. OFFENE ENTSCHEIDUNGEN

| # | Frage | Status |
|---|---|---|
| 1 | Detailausarbeitung Kern-Datenmodell (Tabellenstruktur Mandant/Partner/Artikel/Konten) | ✅ erledigt (Etappe 2) |
| 2 | `bundleVerkaufBuchen()` liest direkt aus `artikel`/`bundlePosition` statt über `ArtikelService` (Abweichung von 3.2) | Offen — dokumentiert, keine Entscheidung getroffen (fix jetzt vs. später) |
| 3 | RLS-Policies für `lagerbestand`/`lagerbewegung`/`lagerort` — Umsetzung nicht verifiziert | Offen — SQL-Migrationsdatei zur Prüfung noch nicht vorgelegt |

### Geklärte Entscheidungen (aus vorherigem Status übernommen)

| Frage | Entscheidung |
|---|---|
| Repo-Speicherort | `D:\Projekt2027\ERP System\` |
| Start-Modul Phase 2 | **Lager/Warenwirtschaft** (nicht Buchhaltung) |
| Zuschnittplanung als Pilotszenario | Nein — war generisches Beispiel der externen KI, kein realer Bezug |
| Überwachungs-Agent für Mandantentrennung | Kein KI-Agent — deterministisches Prüfwerkzeug (Linter/Prisma-Middleware) statt automatisierte Tests allein (siehe 3.6) |
| Core-Reihenfolge | Core (Phase 1) vollständig fertigstellen, bevor Lager (Phase 2) begonnen wird |
| Zuständigkeit Kontext-Synchronisation | Eigener neuer Q7-Agent, nicht Teil von A01 |
| Nummernkreis Synchronisations-Agent | **A15** — löst bisherigen Konflikt (Buchhaltung vs. Design) zugunsten Q7-ERP-Synchronisation auf |
| Neue Nummern Buchhaltung/Design | **A16 = Buchhaltung, A17 = Design** — final dokumentiert in `Q7_Aenderung_2.md` (Q7-Governance-Ebene) |
| Bekannte ERP-Schwächen & Lösungsansätze | Vollständig gesammelt und entschieden, siehe Abschnitt 8 |
| Korrektur-Buchungslogik (A56) | Zwei gerichtete Enum-Werte (`KORREKTUR_AUFWAERTS`/`KORREKTUR_ABWAERTS`) statt Vorzeichen-Ausnahme bei `menge` — hält "menge immer positiv"-Prinzip konsistent |

---

## 7. LAGER/WARENWIRTSCHAFT — MODUL-STATUS (Phase 2, abgeschlossen)

Kurzverweis; Details siehe `Q7ERP_Modulvertrag_Lager_v1.md` und `Q7ERP_CodeReview_Lager_v1.md`.

- Datenmodell: `Lagerort`, `Lagerbestand`, `Lagerbewegung` (siehe `schema.prisma`)
- Öffentliche Schnittstelle: `holeBestand`, `wareneingangBuchen`, `warenausgangBuchen`, `bestandskorrekturBuchen`, `bundleVerkaufBuchen`
- IDOR-Schutz: `pruefeArtikelGehoertZuTenant()` (A60-Fix)
- End-to-End getestet (A62, inkl. Bundle-Verkauf über neu ergänzte Artikel-Endpunkte, A62b)
- Code-Review ohne Sicherheitsfunde (A63)

---

## 8. BEKANNTE ERP-SCHWÄCHEN & LÖSUNGSANSÄTZE (Admin-entschieden)

Systematische Sammlung typischer ERP-Schwachstellen (u.a. SAP-Erfahrungswerte), mit je drei geprüften Lösungsansätzen und finaler Entscheidung.

| # | Schwäche | Gewählter Ansatz | Begründung |
|---|---|---|---|
| 1 | Integration mit Drittsystemen (z.B. Shopsysteme) | **Connector-Adapter-Muster** (bereits 3.4) | Konsistent mit Kapselungsprinzip, kein neuer Ansatz nötig |
| 2 | Hohe Komplexität & lange Einführungszeit | **Vordefinierte Branchen-Vorlagen + geführter Onboarding-Assistent** | Passt zu "schlankes System" und Zielgruppe ohne eigene IT-Abteilung |
| 3 | Hohe Kosten (Lizenz/Beratung/Wartung) | **Nutzungsbasierte Preisstufen + modulbasierte Bezahlung** | Fortführung des bestehenden Q7-Pricing-Modells auf Q7-ERP |
| 4 | Starre Prozesse, Updates brechen Anpassungen | **Erweiterungspunkte statt Kern-Änderungen** | Vereinbar mit Modul-Eigenständigkeit (3.2) und Kapselung (3.1); verhindert klassisches SAP-Update-Problem |
| 5 | Schwaches Reporting ohne teure Zusatzmodule | **KI-Agent für Ad-hoc-Auswertungen**, Basis-Analytics im Core | Differenzierung gegenüber klassischem ERP: natürlichsprachliche Auswertung statt manuellem Report-Tool |
| 6 | Fehlende native KI-/Automatisierungsfähigkeit | **Bereits gelöst über Q7-Verbindung** (3.7, Kontext-Synchronisation) | Keine eigene KI-Logik in Q7-ERP nötig — würde Eigenständigkeit und Grundprinzip 7 (KI bleibt unsichtbar) unterlaufen |
| 7 | Eingeschränkte mobile Nutzung | **Responsive Web-Oberfläche von Anfang an** | Geringster Zusatzaufwand; native App als spätere Ausbaustufe möglich |
| 8 | Vendor-Lock-in / schwierige Datenmigration | **Standard-Exportfunktion (CSV/JSON) von Anfang an** | Vertrauensfrage gegenüber Lizenznehmern; technisch günstig über bestehende Connector-Schicht (3.4) umsetzbar |

---

## 9. ÄNDERUNGSHISTORIE

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | (Ersterstellung) | Initiale Zusammenfassung aller bisherigen Entscheidungen aus Konzeptions-Chat |
| 1.1 | 16.08.2026 | Phase 2 (Lager/Warenwirtschaft) als abgeschlossen markiert (A64). Neue Abschnitte: 7 (Lager-Modul-Status). Ergänzungen: 3.2 (bekannte Abweichung Bundle-Direktzugriff), 3.6 (Umsetzungsstand Phase 2), 3.7 (Umsetzungsstand Events → A73), 4 (Umsetzungsstand je Artikel-Stufe), 5 (Phasen-Status aktualisiert), 6 (zwei neue offene Punkte: Bundle-Kopplung, RLS-Verifikation ausstehend) |
