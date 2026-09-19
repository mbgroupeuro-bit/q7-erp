# Q7-ERP MASTER-DOKUMENT — Version 5

**Status:** Sicherheits-Fundament (Etappe 1) in Umsetzung — Aufgabe 26 (Admin-Guard), 27 (App-Layer-Filter), 28 (Passwort `q7erp_app`) abgeschlossen und End-to-End getestet; Aufgabe 29 (RLS-Ausnahme dokumentiert) abgeschlossen, siehe 3.6.1. Offen: Aufgabe 24/25 (Übergabeweg + Verschlüsselung Q7-Verbindungsgeheimnis).
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
| ORM | **Prisma** (v7) | Marktstandard, gute Entwicklererfahrung, funktioniert mit NestJS (Alternative geprüft: TypeORM — verworfen zugunsten Prisma). *Technischer Hinweis: Ab Prisma 7 liegt die `DATABASE_URL` nicht mehr im `datasource`-Block von `schema.prisma`, sondern in `prisma.config.ts` (`datasource: { url: env("DATABASE_URL") }`). Bereits umgesetzt.* |
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

**Umsetzungsstand Maßnahme 1 (Aufgabe 27, erledigt 11.08.2026):** `PrismaTenantService.withTenantContext()` erzwingt jetzt hart (Exception statt stillschweigendem Weiterlaufen), dass eine `lizenznehmerId` im Kontext vorhanden ist, bevor überhaupt eine Abfrage oder das Setzen der RLS-Session-Variable erfolgt. Die ID wird dem Callback zusätzlich explizit mitgegeben, damit künftige Services (Partner, Artikel, ...) sie zusätzlich zu RLS selbst in ihre `where`-Klauseln aufnehmen — zwei unabhängige Ebenen statt einer.

#### 3.6.1 Dokumentierte Ausnahme: `login_benutzer_by_email()` (Aufgabe 29, ergänzt 11.08.2026)

**Warum diese Funktion RLS bewusst umgeht:** RLS setzt voraus, dass die `lizenznehmerId` bereits als Session-Variable (`app.current_lizenznehmer_id`) bekannt ist, bevor eine Abfrage auf `benutzer` läuft. Beim Login ist genau das noch nicht der Fall — die `lizenznehmerId` ist erst NACH dem erfolgreichen Auffinden des Benutzers per E-Mail bekannt. Strukturelles Henne-Ei-Problem, das mit regulärem RLS nicht lösbar ist.

**Gewählte Lösung:** Eine einzige, eng begrenzte PostgreSQL-Funktion `login_benutzer_by_email(p_email TEXT)`, angelegt mit `SECURITY DEFINER` (läuft mit den Rechten des Eigentümers `postgres`, nicht mit denen des aufrufenden `q7erp_app`-Users). Dadurch umgeht **ausschließlich diese eine Funktion** RLS — nicht der App-User selbst, nicht irgendeine andere Abfrage.

**Warum das als sicher bewertet wird (verbindliche Begründung, keine Lockerung des Grundprinzips):**
- Die Funktion kann **nur** genau das: einen Benutzer anhand seiner E-Mail-Adresse finden (`SELECT ... WHERE email = p_email LIMIT 1`). Kein beliebiger Query-Zugriff.
- `q7erp_app` hat **keinen** direkten Zugriff auf die Tabelle `benutzer` ohne RLS — nur das Recht, exakt diese eine Funktion auszuführen (`GRANT EXECUTE ... TO q7erp_app`, alles andere per `REVOKE ALL ... FROM PUBLIC` gesperrt).
- Der zurückgegebene Datensatz enthält keine sensiblen Daten über andere Lizenznehmer hinweg — es kommt ohnehin nur ein einzelner Benutzer zurück, gefiltert nach eindeutiger E-Mail.
- Nach diesem einen Aufruf (Login) läuft **jede** weitere Abfrage in der Anwendung wieder regulär über RLS mit gesetzter `lizenznehmerId` — die Ausnahme ist strikt auf den Login-Moment begrenzt.

**Muster für künftige, vergleichbare Fälle:** Jede künftige Abfrage, die strukturell VOR Kenntnis der `lizenznehmerId` laufen muss (aktuell nicht absehbar, aber möglich, z.B. bei Passwort-Reset-Flows), muss denselben `SECURITY DEFINER`-Ansatz verwenden — eng begrenzte Funktion, minimale Rückgabemenge, explizite `REVOKE`/`GRANT`-Absicherung, hier im Master-Dokument dokumentiert.

**Technischer Nebenbefund (11.08.2026):** Beim Nachziehen der Funktion um `istSystemAdmin` (Aufgabe 26) zeigte sich, dass PostgreSQL bei geänderter `RETURNS TABLE`-Struktur kein `CREATE OR REPLACE FUNCTION` zulässt (`cannot change return type of existing function`) — in solchen Fällen ist zwingend erst `DROP FUNCTION`, dann `CREATE FUNCTION` nötig.

---

### 3.7 Kontext-Synchronisation Q7 ↔ Q7-ERP (vormals "Digital Twin")

**Grundprinzip (geklärt):** "Digitaler Zwilling" ist kein separates Marketing-Konzept, sondern zwei technische Bausteine, die ohnehin gebraucht werden:
1. **Synchronisations-Mechanismus** (aktiv) — bewegt relevante Daten von Q7-ERP zu Q7, ausgelöst über Domain Events aus dem ERP-Kern, übertragen via Connector-Schicht (Phase 3)
2. **Kontext-Speicher** (passiv) — eigene, read-optimierte Tabellen auf Q7-Seite, in denen die gespiegelten Daten liegen; Q7-Agenten fragen diesen Speicher ab, nie Q7-ERP live direkt

**Warum nötig:** Verhindert Live-Zugriff von Q7-Agenten auf die produktive Q7-ERP-Datenbank bei jeder Entscheidung — schont das Live-System, hält Q7-ERP eigenständig (3.5), vereinfacht Multi-Tenancy-Absicherung (3.6, da Zugriff über Q7s eigene Kapselung läuft statt zusätzlich durch Q7-ERPs RLS).

**Technischer Ablauf:** Q7-ERP-Service löst Event aus → Connector-Webhook überträgt an Q7 → Kontext-Speicher (eigenes Prisma-Schema in Q7) wird aktualisiert (inkl. `letzteSyncZeit` zur Aktualitäts-Prüfung) → Agenten fragen über eine zentrale `KontextService`-Zwischenschicht ab (Kapselung, analog 3.1). `lizenznehmerId` wird auch im Kontext-Speicher konsequent mitgeführt.

**Entscheidung (Admin, geklärt):** Neuer, eigener Q7-Agent ausschließlich für Q7-ERP-Kommunikation/Synchronisation — keine Erweiterung der bestehenden A01-Logik. Grund: saubere Trennung der Zuständigkeit, A01 bleibt auf Lizenznehmer-Kommunikation fokussiert (Black-Box-Prinzip, 3.1 aus Q7-Governance).

**Nummernkreis (Admin, geklärt):** **A15 = Q7-ERP-Synchronisations-Agent.** Damit ist der bisherige A15-Konflikt (Buchhaltungs-Agent vs. Design-Agent, siehe Q7-Governance) zugunsten des Synchronisations-Agenten aufgelöst. Buchhaltungs- und Design-Agent benötigen neue, noch zu vergebende Nummern — siehe Abschnitt 6.

### 3.7.1 Ergänzung — Symmetrische Zwei-Agenten-Struktur für Standalone-Betrieb (Admin-Entschieden 08.08.2026)

**Erkannte Lücke:** Das bisherige Modell in 3.7 setzt voraus, dass ein Lizenznehmer Q7 nutzt. Für Lizenznehmer, die Q7-ERP standalone einsetzen (ohne Q7), gab es bisher keinen KI-Agenten, der direkt im System arbeitet — Widerspruch zum Eigenständigkeits-Test (3.5), der bisher nur klassische Bedienung (UI/API) abdeckt.

**Entschiedenes Konzept:** Zweiter Agent mit gleicher Grundstruktur wie A15, aber eigener Rolle:

| Agent | Sitz | Rolle | Zugriffsmodus |
|---|---|---|---|
| A15 | Q7-System | Bestehender Sync-Agent | Extern, synchronisiert — arbeitet auf gespiegelten Kontext-Speicher-Daten |
| ERP-nativer Agent (Bezeichnung offen, **keine A-Nummer** — sitzt in Q7-ERP, nicht in Q7) | Q7-ERP-System | Bedient Q7-ERP direkt und live, auch im Standalone-Betrieb ohne Q7 | Intern, live — arbeitet über bestehende Service-Kapselung (3.1) und RLS (3.6) |

**Aktivierung:** Konfigurierbar pro Lizenznehmer (Feature-Flag, analog Artikel-Stufenkonzept Abschnitt 4), kein Zwangs-Doppelbetrieb bei Q7-Kunden.

**Schnittstelle zwischen beiden Agenten:** Über die bestehende Connector-Schicht (3.4) — der ERP-native Agent wird technisch wie ein weiterer Adapter behandelt, kein neues Protokoll. Asynchron mit Antwort-Webhook, analog zum bestehenden Event-Mechanismus aus 3.7. A15 stellt bei Bedarf (z.B. Kontext-Speicher zu alt) eine Anfrage über die Connector-Schicht; der ERP-native Agent antwortet live über die normale Service-Kapselung, RLS greift automatisch.

**Rechte ausdrücklich nicht identisch:** Gleiche Struktur bedeutet nicht gleiche Rechte — A15 arbeitet nur mit bereits gefilterten, gespiegelten Daten; der ERP-native Agent arbeitet live mit echten Lizenznehmer-Rechten unter RLS. Gleichsetzung würde die Mandantentrennung (3.6) unterlaufen.

**Agenten-taugliche Service-Kapselung:** Bestehende Service-Schicht (3.1) bleibt bestehen, jede Methode bekommt vor Freigabe für den Agenten ein explizites "agent-safe"-Review/Flag — keine separate Service-Schicht, keine automatische Gleichbehandlung mit Frontend-Zugriffen.

**Vollständige Diskussionsgrundlage inkl. OneStack-Vergleich und Optionen:** siehe `Q7ERP_Agentenkommunikation_v1.md`.

**Noch offen:** genaues Nachrichtenformat, Timeout-/Retry-Verhalten, ob unaufgeforderte Pushes vom ERP-nativen Agenten zulässig sind. **Agent XXX selbst ist noch nicht gebaut.**

---

### 3.7.2 ERP-Türsteher — Sicherheitsprüfung vor Agent XXX (Admin-Entschieden 09.08.2026)

**Auslöser:** Grill-Me-Review von 3.7.1 deckte auf, dass ein Live-Zugriffspunkt mit echten Lizenznehmer-Rechten ein neues Bedrohungsszenario öffnet ("Q7 wird kompromittiert, stellt beliebige Anfragen an Agent XXX"). Beschluss: deterministischer Prüfschritt vor jeder Anfrage, kein KI-Agent — konsistent mit der Entscheidung zu Aufgabe 8 (deterministisches Prüfwerkzeug statt KI-Überwachung).

**Aufbau, zwei Ebenen, in dieser Reihenfolge geprüft:**

| Ebene | Prüft | Beantwortet |
|---|---|---|
| 0. Signaturprüfung (HMAC-SHA256) | Ist die Anfrage wirklich mit dem geteilten Geheimnis des Lizenznehmers signiert? Zeitstempel-Frische (5 Min. Fenster) | Identität/Herkunft — die eigentliche Hauptbedrohung |
| 1. Replay-Schutz | Anfrage-ID bereits verwendet? | Wiederholungsangriffe |
| 2. Rate-Limit | Zu viele Anfragen pro Lizenznehmer in kurzer Zeit? | Missbrauchsvolumen |
| 3. IP-Anomalie | Neue, unbekannte IP für diesen Lizenznehmer? | Verdachtsmomente (Monitoring, nicht Hauptsicherung) |

Jede Entscheidung wird in `zugriffshistorie` protokolliert (auch erlaubte Anfragen — Grundlage für "neue IP"-Erkennung). Feste Regeln in `tuersteher-regeln.ts`, kein Machine Learning.

**Benachrichtigung bei Verdacht:** E-Mail an eine separat hinterlegte `sicherheitsEmail` je Lizenznehmer — bewusst **nicht** über einen Q7-internen Posteingang und **nicht** über die Login-E-Mail, da das Bedrohungsmodell Q7 selbst als potenziell kompromittiert einstuft. Ein interner Kanal wäre kein unabhängiger zweiter Kanal.

**Bewusst offene Punkte (siehe Aufgabenliste #24, #25):**
- Sicherer Übergabeweg für das geteilte Geheimnis zu Q7 noch nicht konzipiert (aktuell manuell in DB gesetzt)
- Geheimnis liegt aktuell im Klartext in `q7_verbindung.geteiltesGeheimnis` — Verschlüsselung at-rest noch offen
- Keine Rotation automatisiert (Feld `letzteRotation` vorbereitet, aber kein erzwungener Ablauf)
- Bei tatsächlich kompromittiertem (aber gültigem) Geheimnis schützt die Signatur nicht — nur schnelle Rotation + Anomalie-Monitoring als Auffangnetz

---

## 4. ARTIKEL-DATENMODELL — STUFENKONZEPT (Teil von Phase 1)

Komplexe Artikelstrukturen (Varianten, Bundles, Konfigurationen) werden **nicht** in einem einzigen starren Modell abgebildet, sondern in vier aufeinander aufbauenden, einzeln buchbaren Stufen:

| Stufe | Inhalt | Datenstruktur-Prinzip |
|---|---|---|
| **Artikel-Stufe 1** | Einfacher Artikel | Basis: ID, Name, Grundpreis, Einheit |
| **Artikel-Stufe 2** | Varianten | Eltern-Kind-Beziehung; jede Variante = eigener Artikel-Datensatz mit Verweis auf Elternartikel, eigene Bestandsführung |
| **Artikel-Stufe 3** | Bundles | Stücklisten-Tabelle: Bundle referenziert mehrere Einzelartikel; Lagerbestand der Einzelteile wird beim Bundle-Verkauf automatisch abgebucht |
| **Artikel-Stufe 4** | Konfigurationen | Baustein-Gruppen + Regel-Engine (Pflicht-/Optional-Auswahl, Ausschluss-Regeln, Preisbeeinflussung) |

**Buchungslogik:** Stufen 2–4 sind unabhängig voneinander buchbar (kein Zwangspaket), können bei Bedarf zusammenspielen (z.B. Bundle aus Varianten). Alle vier Stufen werden vollständig vorentwickelt ("Schablone"); pro Lizenznehmer wird nur freigeschaltet, was gebucht ist (Modul-Schalter/Feature-Flag). Bestehende Artikel-Daten bleiben beim Zubuchen einer höheren Stufe unangetastet — kein Migrationsrisiko.

**Namenskonvention-Hinweis:** "Artikel-Stufe 1–4" bewusst getrennt von "Phase 1–4" (Gesamt-Roadmap) und von späteren Fachmodulen (Buchhaltung, Lager), um Verwechslung zu vermeiden.

---

## 5. PHASEN-ROADMAP (Gesamt-Aufbau, Reihenfolge bindend)

1. **Phase 1 — Kern-Datenmodell:** Mandant/Lizenznehmer-Trennung, Stammdaten (Partner, Artikel inkl. Stufenkonzept, Konten). *Sicherheits-Fundament (Etappe 1) läuft, Datenmodell-Nutzung noch nicht begonnen.*
2. **Phase 2 — Erstes Fachmodul (Referenzimplementierung): Lager/Warenwirtschaft.** Zweck: Modul-Vertrag am echten Beispiel festlegen.
3. **Phase 3 — API-/Connector-Schicht nach außen:** Erst nach Phase 2, um keine Schnittstelle für ein noch nicht existierendes Modul zu bauen.
4. **Phase 4 — Zweites Modul:** Kandidat Buchhaltung/Belegverarbeitung (Bezug zu Q7-Agent A16, vormals A15 — siehe `Q7_Aenderung_2.md`).

---

## 6. OFFENE ENTSCHEIDUNGEN

| # | Frage | Status |
|---|---|---|
| 1 | Detailausarbeitung Kern-Datenmodell (Tabellenstruktur Mandant/Partner/Artikel/Konten) | Offen — nächster Schritt |

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
| RLS-Ausnahme für Login | **Dokumentiert (Aufgabe 29, siehe 3.6.1)** — `login_benutzer_by_email()` als eng begrenzte `SECURITY DEFINER`-Funktion |
| Nummer für ERP-nativen Agenten | Keine A-Nummer — eigene ERP-interne Bezeichnung (siehe 3.7.1) |
| Aktivierung ERP-nativer Agent | Konfigurierbar pro Lizenznehmer (Feature-Flag) |
| Schnittstelle Agent ↔ A15 | Über Connector-Schicht (3.4), asynchron mit Antwort-Webhook |
| CRM/HR-Einordnung | Nicht terminiert; Core (`Partner`) modul-offen gestalten für spätere CRM/HR-Module (analog Lager/Buchhaltung, 3.2) |

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
| 1 | (Ersterstellung) | Initiale Zusammenfassung aller bisherigen Entscheidungen aus Konzeptions-Chat |
| 2 | 08.08.2026 | Digital-Twin-Konzept (3.7) ergänzt, A15-Konflikt final aufgelöst (A15/A16/A17), ERP-Schwächen-Sammlung (Abschnitt 8) ergänzt, UUID-v7-Entscheidung dokumentiert, Prisma-7-Konfigurationshinweis ergänzt, Phase 1 technisch umgesetzt (NestJS + PostgreSQL + Prisma-Migration erfolgreich) |
| 3 | 09.08.2026 | Symmetrische Zwei-Agenten-Struktur entschieden und dokumentiert (3.7.1); RLS-Policies umgesetzt (`001_rls_policies.sql`); Auth-Modul (JWT-Login) + Tenancy-Middleware + `LizenznehmerService` als Kapselungs-Referenz technisch fertiggestellt |
| 4 | 09.08.2026 | ERP-Türsteher (3.7.2) + Signaturprüfung entschieden und implementiert (Reaktion auf Grill-Me-Review); Prisma-7-Laufzeitanpassungen (Adapter-Pattern für `PrismaClient`, `dotenv/config` in `main.ts`); Server läuft erstmals fehlerfrei end-to-end; mehrere offene Sicherheitspunkte aus Grill-Me dokumentiert (App-Layer-Filter zusätzlich zu RLS, offener `LizenznehmerController`, Geheimnis-Übergabeweg) |
| 5 | 11.08.2026 | Aufgabe 26 (Admin-Guard für `LizenznehmerController`) abgeschlossen und End-to-End getestet (inkl. Reparatur einer nicht angewendeten Migration und der zugehörigen Prisma-Migrationshistorie); Aufgabe 27 (App-Layer-Filter zusätzlich zu RLS in `PrismaTenantService`) abgeschlossen; Aufgabe 28 (Platzhalter-Passwort `q7erp_app` ersetzt) abgeschlossen; Aufgabe 29 (RLS-Ausnahme `login_benutzer_by_email()` dokumentiert, Abschnitt 3.6.1) abgeschlossen |
