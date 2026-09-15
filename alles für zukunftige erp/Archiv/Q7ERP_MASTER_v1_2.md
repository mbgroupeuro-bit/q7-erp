# Q7-ERP MASTER-DOKUMENT — Version 1.8

**Status:** Phase 2 abgeschlossen. Phase 3 läuft — A65–A69 abgeschlossen. **Wichtige Korrektur bei A69:** doppelte Signatur-/Türsteher-Logik entdeckt und bereinigt, bestehender `ErpTuersteherService` wird jetzt wiederverwendet (siehe 3.7.2, 3.4.4). Bereit für A70. Weiterhin offen: Middleware-Registrierung im echten Modul, keine Laufzeit-/DB-Tests.
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

#### 3.4.1 Einheitliches internes Datenformat (Aufgabe A65, Grill-Me-Session, 16.08.2026)

**Format (Admin-Entscheidung nach Grill-Me-Review, Verdict REVISE → Fragen geklärt → PROCEED):**
```
{
  "version": "1.0",
  "lizenznehmerId": "...",
  "entityType": "Partner" | "Artikel" | "BundlePosition" | "ArtikelVariante" | "Lagerbestand" | ...,
  "timestamp": "...",
  "payload": { ... entity-spezifisch }
}
```

**Drei in der Grillung offengelegte Fragen, entschieden:**
1. **Versionierung:** `version` = `major.minor`. Innerhalb derselben `major`-Version bleiben Adapter abwärtskompatibel (nur additive Payload-Änderungen); ein `major`-Sprung erlaubt Breaking Changes und verlangt Adapter-Anpassung.
2. **Lagerbestand-Aktualität:** `Lagerbestand`-Payload führt zusätzlich `sequenz` (monoton steigend je Lagerort+Artikel) und `aktualisiertAm` — Adapter erkennen damit veraltete Snapshots, ohne dass das Format selbst Event-Sourcing werden muss.
3. **Bundle/Varianten-Verschachtelung:** Nicht verschachtelt. Eigener `entityType` (`BundlePosition`, `ArtikelVariante`) mit Verweis auf `bundleArtikelId`/`elternArtikelId`; Adapter korrelieren über IDs. Hält Payload-Schemas pro Entity-Typ klein.

**Offen, nicht bewiesen (als Vermutung markiert, nicht als Fakt):** Ob dasselbe Envelope-Format später für A73 (Domain Events) ohne Bruch wiederverwendbar ist, wurde noch nicht praktisch durchgespielt — erst bei A73 zu verifizieren.

#### 3.4.2 Adapter-Schnittstelle (Aufgabe A66, Grill-Me-Session, 16.08.2026)

**Entscheidung (Admin, nach Grill-Me-Review, Verdict REVISE → Fragen geklärt → PROCEED):** Zwei unabhängige Interfaces, **keine Vererbung** zwischen ihnen — ein Adapter implementiert eines, beides, oder wird als zwei separate Instanzen registriert:

```typescript
interface Q7ErpExportAdapter {
  readonly adapterName: string;
  readonly unterstuetzteEntityTypes: EntityType[];
  exportiere(envelope: ConnectorEnvelope): Promise<AdapterResult<void>>;
}

interface Q7ErpImportAdapter {
  readonly adapterName: string;
  readonly unterstuetzteEntityTypes: EntityType[];
  importiere(rohdaten: unknown): Promise<AdapterResult<ConnectorEnvelope[]>>;
}

type AdapterResult<T> =
  | { erfolg: true; daten: T }
  | { erfolg: false; fehler: AdapterFehler[] };

interface AdapterFehler {
  entityType?: EntityType;
  code: string;       // z.B. "TIMEOUT", "SIGNATUR_UNGUELTIG", "ZIEL_NICHT_ERREICHBAR"
  meldung: string;
}
```

**Begründung der drei Kernentscheidungen aus der Grillung:**
1. **Keine Vererbung Export/Import:** Verhindert Zwangs-Stubs bei Adaptern, die nur eine Richtung unterstützen (z.B. ein künftiger reiner Import-Adapter für DATEV-Belege müsste sonst eine ungenutzte `exportiere()`-Methode vortäuschen).
2. **`AdapterResult<T>` als verbindliches Fehlerformat im Interface selbst**, nicht erst bei A72 nachgerüstet — verhindert, dass jeder Adapter sein eigenes Fehlerformat erfindet (widerspräche dem Grundprinzip "einheitliches internes Format", 3.4).
3. **`istErreichbar()` bewusst nicht Teil des Interfaces** — Erreichbarkeit zeigt sich über `AdapterResult` beim tatsächlichen Aufruf; ein separater Health-Check war unbelegter Zusatznutzen, kann bei echtem Bedarf später ergänzt werden.

**Offen, bewusst nicht in A66 entschieden:** Feature-Flag-Abgleich (welcher Lizenznehmer hat welche `EntityType`s tatsächlich gebucht, z.B. Bundle-Stufe) passiert in der Connector-Schicht **vor** dem Adapter-Aufruf, nicht im Adapter selbst — `unterstuetzteEntityTypes` am Adapter beschreibt nur die technische Grundfähigkeit, nicht die lizenznehmerspezifische Freischaltung.

#### 3.4.3 Q7-Adapter-Grundgerüst (Aufgabe A67, 16.08.2026)

**Umsetzungsstand:** `Q7Adapter` implementiert `Q7ErpExportAdapter` (nicht `Q7ErpImportAdapter` — Q7 ist laut Roadmap reiner Export-Empfänger, A69/A70). `unterstuetzteEntityTypes` aktuell `['Partner', 'Artikel']`, entsprechend dem geplanten Umfang von A69/A70.

**⚠️ Ungetestet:** Dieser Code wurde außerhalb des tatsächlichen Repos erstellt (kein Zugriff auf `D:\Projekt2027\ERP System\` in dieser Session) und ist daher als ungeprüftes Grundgerüst zu behandeln, nicht als geprüfte Aussage "funktioniert". Muss vor A68 tatsächlich ins Projekt eingefügt und kompiliert werden.

**Zwei offene TODOs, bewusst nicht Teil von A67:**
- Signaturprüfung/ERP-Türsteher-Anbindung (3.7.2) — folgt in A68
- Tatsächlicher Webhook-Versand — folgt in A74 (Domain-Event-Mechanismus); `exportiere()` loggt aktuell nur als Platzhalter

#### 3.4.4 Partner-Export-Endpunkt für Q7 (Aufgabe A69, 16.08.2026)

**Umsetzungsstand:** `PartnerExportController` (`GET /connector/q7/partner`) wiederverwendet den bestehenden `PartnerService.findAll()` unverändert (Kapselung, 3.1) — kein eigener Prisma-Zugriff. Geschützt durch `Q7ConnectorTuersteherMiddleware`, die den bestehenden `ErpTuersteherService.pruefen()` aufruft (alle 4 Ebenen aus 3.7.2) und erst danach den `tenancyStorage`-Kontext setzt.

**Erwartetes Anfrage-Format von Q7 (Header):** `X-Lizenznehmer-Id`, `X-Anfrage-Id`, `X-Q7ERP-Timestamp`, `X-Q7ERP-Signature` — Signatur berechnet als `HMAC-SHA256(geheimnis, lizenznehmerId.anfrageId.zeitstempel)`, kompatibel mit dem bestehenden `SignaturPruefungService`-Schema (getestet).

**Antwortformat:** Envelope aus 3.4.1 (`entityType: "Partner"`, `payload` = Array der Partner-Datensätze).

**Wichtige Korrektur bei A69 entdeckt (Doppelarbeit):** Der ursprüngliche A68/A69-Entwurf hatte eine eigene, parallele Signatur-/Türsteher-Logik gebaut, ohne zu wissen, dass `src/erp-tuersteher/` bereits vollständig existiert. Details siehe Nachtrag in Abschnitt 3.7.2.

**Offen, bewusst nicht in A69 entschieden:**
- Middleware-Registrierung (`consumer.apply(Q7ConnectorTuersteherMiddleware).forRoutes('connector/q7/*')`) — muss noch ins tatsächliche Modul eingetragen werden, Datei liegt mir nicht vor.
- Zwei unabhängige Prisma-Verbindungen im Projekt (`PrismaService` für `erp-tuersteher`, `PrismaTenantService` für Connector/Partner) — nicht in A69 geprüft, ob das beabsichtigt ist.

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

#### 3.6.1 Dokumentierte Ausnahme: `login_benutzer_by_email()` (Aufgabe 29)

**Warum diese Funktion RLS bewusst umgeht:** RLS setzt voraus, dass die `lizenznehmerId` bereits als Session-Variable (`app.current_lizenznehmer_id`) bekannt ist, bevor eine Abfrage auf `benutzer` läuft. Beim Login ist genau das noch nicht der Fall — die `lizenznehmerId` ist erst NACH dem erfolgreichen Auffinden des Benutzers per E-Mail bekannt. Strukturelles Henne-Ei-Problem, das mit regulärem RLS nicht lösbar ist.

**Gewählte Lösung:** Eine einzige, eng begrenzte PostgreSQL-Funktion `login_benutzer_by_email(p_email TEXT)`, angelegt mit `SECURITY DEFINER` (läuft mit den Rechten des Eigentümers `postgres`, nicht mit denen des aufrufenden `q7erp_app`-Users). Dadurch umgeht **ausschließlich diese eine Funktion** RLS — nicht der App-User selbst, nicht irgendeine andere Abfrage.

**Warum das als sicher bewertet wird:**
- Die Funktion kann **nur** genau das: einen Benutzer anhand seiner E-Mail-Adresse finden. Kein beliebiger Query-Zugriff.
- `q7erp_app` hat **keinen** direkten Zugriff auf die Tabelle `benutzer` ohne RLS — nur das Recht, exakt diese eine Funktion auszuführen (`GRANT EXECUTE ... TO q7erp_app`, alles andere per `REVOKE ALL ... FROM PUBLIC` gesperrt).
- Der zurückgegebene Datensatz enthält keine sensiblen Daten über andere Lizenznehmer hinweg.
- Nach diesem einen Aufruf (Login) läuft jede weitere Abfrage wieder regulär über RLS mit gesetzter `lizenznehmerId`.

**Muster für künftige, vergleichbare Fälle:** Jede künftige Abfrage, die strukturell VOR Kenntnis der `lizenznehmerId` laufen muss (z.B. Passwort-Reset-Flows), muss denselben `SECURITY DEFINER`-Ansatz verwenden — eng begrenzte Funktion, minimale Rückgabemenge, explizite `REVOKE`/`GRANT`-Absicherung, hier dokumentiert.

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

#### 3.7.1 Ergänzung — Symmetrische Zwei-Agenten-Struktur für Standalone-Betrieb

**Erkannte Lücke:** Das Modell in 3.7 setzt voraus, dass ein Lizenznehmer Q7 nutzt. Für Lizenznehmer, die Q7-ERP standalone einsetzen (ohne Q7), gibt es bisher keinen KI-Agenten, der direkt im System arbeitet — Widerspruch zum Eigenständigkeits-Test (3.5), der bisher nur klassische Bedienung (UI/API) abdeckt.

**Entschiedenes Konzept:** Zweiter Agent mit gleicher Grundstruktur wie A15, aber eigener Rolle:

| Agent | Sitz | Rolle | Zugriffsmodus |
|---|---|---|---|
| A15 | Q7-System | Bestehender Sync-Agent | Extern, synchronisiert — arbeitet auf gespiegelten Kontext-Speicher-Daten |
| ERP-nativer Agent (keine A-Nummer — sitzt in Q7-ERP, nicht in Q7) | Q7-ERP-System | Bedient Q7-ERP direkt und live, auch im Standalone-Betrieb ohne Q7 | Intern, live — arbeitet über bestehende Service-Kapselung (3.1) und RLS (3.6) |

**Aktivierung:** Konfigurierbar pro Lizenznehmer (Feature-Flag, analog Artikel-Stufenkonzept Abschnitt 4).

**Schnittstelle zwischen beiden Agenten:** Über die bestehende Connector-Schicht (3.4) — der ERP-native Agent wird technisch wie ein weiterer Adapter behandelt, kein neues Protokoll. Asynchron mit Antwort-Webhook, analog zum bestehenden Event-Mechanismus aus 3.7.

**Rechte ausdrücklich nicht identisch:** A15 arbeitet nur mit bereits gefilterten, gespiegelten Daten; der ERP-native Agent arbeitet live mit echten Lizenznehmer-Rechten unter RLS. Gleichsetzung würde die Mandantentrennung (3.6) unterlaufen.

**Vollständige Diskussionsgrundlage inkl. OneStack-Vergleich und Optionen:** siehe `Q7ERP_Agentenkommunikation_v1.md`.

**Noch offen:** genaues Nachrichtenformat, Timeout-/Retry-Verhalten, ob unaufgeforderte Pushes vom ERP-nativen Agenten zulässig sind. Agent selbst ist noch nicht gebaut.

---

### 3.7.2 ERP-Türsteher — Sicherheitsprüfung vor Agent-Live-Zugriff

**Auslöser:** Grill-Me-Review von 3.7.1 deckte auf, dass ein Live-Zugriffspunkt mit echten Lizenznehmer-Rechten ein neues Bedrohungsszenario öffnet ("Q7 wird kompromittiert, stellt beliebige Anfragen an den ERP-nativen Agenten"). Beschluss: deterministischer Prüfschritt vor jeder Anfrage, kein KI-Agent — konsistent mit der Entscheidung zur Mandantentrennungs-Überwachung (3.6).

**Aufbau, zwei Ebenen, in dieser Reihenfolge geprüft:**

| Ebene | Prüft | Beantwortet |
|---|---|---|
| 0. Signaturprüfung (HMAC-SHA256) | Ist die Anfrage wirklich mit dem geteilten Geheimnis des Lizenznehmers signiert? Zeitstempel-Frische (5 Min. Fenster) | Identität/Herkunft — die eigentliche Hauptbedrohung |
| 1. Replay-Schutz | Anfrage-ID bereits verwendet? | Wiederholungsangriffe |
| 2. Rate-Limit | Zu viele Anfragen pro Lizenznehmer in kurzer Zeit? | Missbrauchsvolumen |
| 3. IP-Anomalie | Neue, unbekannte IP für diesen Lizenznehmer? | Verdachtsmomente (Monitoring, nicht Hauptsicherung) |

Jede Entscheidung wird in `zugriffshistorie` protokolliert (auch erlaubte Anfragen — Grundlage für "neue IP"-Erkennung, siehe `schema.prisma`: `Zugriffshistorie`, `Q7Verbindung`, Enum `TuersteherErgebnis`). Feste Regeln in `tuersteher-regeln.ts`, kein Machine Learning.

**Benachrichtigung bei Verdacht:** E-Mail an eine separat hinterlegte `sicherheitsEmail` je Lizenznehmer — bewusst **nicht** über einen Q7-internen Posteingang, da das Bedrohungsmodell Q7 selbst als potenziell kompromittiert einstuft.

**Bewusst offene Punkte:**
- Sicherer Übergabeweg für das geteilte Geheimnis zu Q7 (`A24`, ✅ erledigt, siehe Arbeitsplan)
- Verschlüsselung at-rest für `q7_verbindung.geteiltesGeheimnis` (`A25`, ✅ erledigt)
- Keine Rotation automatisiert (Feld `letzteRotation` vorbereitet, kein erzwungener Ablauf)
- Bei tatsächlich kompromittiertem (aber gültigem) Geheimnis schützt die Signatur nicht — nur schnelle Rotation + Anomalie-Monitoring als Auffangnetz

**Umsetzungsstand A68 (16.08.2026):**
- ✅ **Teil 1:** `SignaturService` (HMAC-SHA256 signieren/prüfen, Zeitstempel-Frische 5-Min-Fenster, `timingSafeEqual` gegen Timing-Angriffe) — **tatsächlich getestet** (5 Testfälle, alle bestanden). Reine Krypto-Logik ohne DB-Abhängigkeit.
- ✅ `Q7Adapter.exportiere()` signiert jetzt jedes Envelope vor dem (weiterhin gestubbten) Versand.
- ✅ **Teil 2:** `Q7VerbindungPrismaRepository` implementiert `Q7VerbindungRepository.holeGeheimnis()` real, auf Basis der tatsächlichen `PrismaTenantService`-Datei. Dabei erkannt und gelöst: `withTenantContext()` liest die `lizenznehmerId` aus dem Request-Kontext (AsyncLocalStorage/JWT) — für den hintergrundgesteuerten Export-Fall (keine eingehende HTTP-Anfrage, `lizenznehmerId` kommt aus dem Envelope) fehlte ein passendes Gegenstück. Vorschlag: neue Methode `withExplicitTenantContext(lizenznehmerId, callback)` als Ergänzung zu `PrismaTenantService` (noch einzufügen, siehe `prisma-tenant-service-ergaenzung.ts`), nutzt denselben Zwei-Schloss-Mechanismus (RLS-Session-Variable + expliziter Filter) wie das Original.
- ⚠️ **Offener Platzhalter (bewusst nicht geraten):** `geteiltesGeheimnis` ist laut A25 verschlüsselt at-rest gespeichert. Die tatsächliche Entschlüsselungsfunktion aus der A25-Umsetzung liegt nicht vor — `Q7VerbindungPrismaRepository.holeGeheimnis()` gibt aktuell den Rohwert aus der DB zurück, nicht entschlüsselt. Muss vor Produktivbetrieb ersetzt werden.
- ⚠️ Gesamter A68/A67-Code weiterhin **ungetestet gegen echten Compiler/DB** (kein Repo-Zugriff).

**Nachtrag 16.08.2026 (Admin, `npx tsc --noEmit` im echten Repo):** Gesamter bisheriger Connector-Code (`types.ts`, `signatur.service.ts`, `q7.adapter.ts`, `q7-verbindung.repository.ts`, `prisma-tenant.service.ts` inkl. `withExplicitTenantContext()`) kompiliert **fehlerfrei**. Damit ist die Compiler-Prüfung nachgeholt — bleibt weiterhin offen: keine Laufzeit-/DB-Tests, Entschlüsselungs-Platzhalter (Punkt 4, Abschnitt 6).

**⚠️ Korrektur 16.08.2026 (bei A69 entdeckt):** `src/erp-tuersteher/` existierte bereits **vollständig** (`erp-tuersteher.service.ts`, `signatur-pruefung.service.ts`, `sicherheits-benachrichtigung.service.ts`, `tuersteher-regeln.ts`, `erp-tuersteher.module.ts`) — inklusive aller 4 Ebenen aus diesem Abschnitt (Signatur, Replay, Rate-Limit, IP-Anomalie + Benachrichtigung), inklusive echter Entschlüsselung über `VerschluesselungService`. Diese Datei/dieser Ordner lag mir beim Bau von A68/A69 nicht vor. Konsequenzen:
- `signatur.service.ts` (mein A68-Bau, eigenes HMAC-Schema über URL-Pfad) ist **verworfen** — inkompatibles Schema zu `signatur-pruefung.service.ts` (signiert über `lizenznehmerId.anfrageId.zeitstempel`), deckt zudem nur Ebene 0 ab statt aller 4 Ebenen.
- `q7-tuersteher.middleware.ts` (mein ursprünglicher A69-Entwurf) ist **verworfen**, ersetzt durch `q7-connector-tuersteher.middleware.ts`, die den bestehenden `ErpTuersteherService.pruefen()` wiederverwendet statt eine Parallelstruktur zu bauen.
- `q7-verbindung.repository.ts` **korrigiert**: nutzt jetzt `VerschluesselungService.entschluesseln()` (bereits vorhanden) statt des früheren Roh-Platzhalters. Punkt 4 aus Abschnitt 6 damit erledigt.
- **Lehre für weitere Sessions:** Vor dem Bau neuer Sicherheits-/Krypto-Logik immer zuerst prüfen, ob unter `src/erp-tuersteher/` oder ähnlich benannten Ordnern bereits etwas existiert — nicht nur das Master-Dokument als Quelle nehmen, sondern aktiv im Repo nachfragen/suchen lassen.

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
| 4 | A68: Entschlüsselung von `geteiltesGeheimnis` in `Q7VerbindungPrismaRepository` | **Erledigt (16.08.2026):** nutzt jetzt `VerschluesselungService.entschluesseln()` (bereits im Repo vorhanden), kein Platzhalter mehr |
| 6 | Middleware-Registrierung `Q7ConnectorTuersteherMiddleware` auf `connector/q7/*` | Offen — tatsächliches Modul (`app.module.ts`?) liegt nicht vor |
| 7 | Zwei unabhängige Prisma-Services im Projekt (`PrismaService` vs. `PrismaTenantService`) — beabsichtigt oder historisch gewachsen? | Offen — bei nächstem Code-Review klären |

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
| CRM/HR-Einordnung | Nicht terminiert; Core (`Partner`) modul-offen gestalten für spätere CRM/HR-Module (analog Lager/Buchhaltung, 3.2) |
| Nummer für ERP-nativen Agenten | Keine A-Nummer — eigene ERP-interne Bezeichnung (siehe 3.7.1) |
| Aktivierung ERP-nativer Agent | Konfigurierbar pro Lizenznehmer (Feature-Flag) |
| Schnittstelle Agent ↔ A15 | Über Connector-Schicht (3.4), asynchron mit Antwort-Webhook |
| Internes Connector-Datenformat (A65) | Envelope `{version, lizenznehmerId, entityType, timestamp, payload}`, Payload pro Entity-Typ, keine Verschachtelung von Bundle/Varianten (siehe 3.4.1) |

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
| 1.0 | (Ersterstellung, entspricht inhaltlich v1–v5 des Vorgänger-Master-Dokuments) | Initiale Zusammenfassung: Digital-Twin-Konzept (3.7), A15/A16/A17-Nummernkreis, ERP-Schwächen-Sammlung (Abschnitt 8), UUID-v7-Entscheidung, RLS-Grundprinzipien (3.6), symmetrische Zwei-Agenten-Struktur (3.7.1), ERP-Türsteher/Signaturprüfung (3.7.2), RLS-Ausnahme Login (3.6.1), Admin-Guard/App-Layer-Filter/Passwort/RLS-Doku (A26–A29) |
| 1.1 | 16.08.2026 | Phase 2 (Lager/Warenwirtschaft) als abgeschlossen markiert (A64). Neue Abschnitte: 7 (Lager-Modul-Status). Ergänzungen: 3.2 (bekannte Abweichung Bundle-Direktzugriff), 3.6 (Umsetzungsstand Phase 2), 3.7 (Umsetzungsstand Events → A73), 4 (Umsetzungsstand je Artikel-Stufe), 5 (Phasen-Status aktualisiert), 6 (zwei neue offene Punkte: Bundle-Kopplung, RLS-Verifikation ausstehend). **Hinweis:** Bei diesem Neuaufbau als v1.x wurden 3.6.1, 3.7.1, 3.7.2 sowie die CRM/HR-Entscheidungszeile versehentlich nicht aus dem Vorgänger-Dokument übernommen — in v1.2 korrigiert. |
| 1.2 | 16.08.2026 | Korrektur: 3.6.1 (RLS-Ausnahme Login), 3.7.1 (Zwei-Agenten-Struktur), 3.7.2 (ERP-Türsteher) sowie CRM/HR-Entscheidungszeile wiederhergestellt. A65 abgeschlossen: neuer Abschnitt 3.4.1 (einheitliches internes Connector-Datenformat, Envelope-Entscheidung inkl. Versionierung/Lagerbestand-Aktualität/Bundle-Korrelation). Status auf "Phase 3 begonnen, bereit für A66" aktualisiert. |
| 1.3 | 16.08.2026 | A66 abgeschlossen: neuer Abschnitt 3.4.2 (Adapter-Schnittstelle — getrennte Export-/Import-Interfaces ohne Vererbung, `AdapterResult<T>`-Fehlerformat im Interface selbst, `istErreichbar()` bewusst weggelassen). Status auf "bereit für A67" aktualisiert. |
| 1.4 | 16.08.2026 | A67 abgeschlossen: neuer Abschnitt 3.4.3 (Q7-Adapter-Grundgerüst, `Q7ErpExportAdapter` implementiert, Webhook-Versand + Signaturprüfung noch TODO-Stubs). Code **ungetestet** (kein Repo-Zugriff in dieser Session) — muss vor A68 im Projekt kompiliert/geprüft werden. Status auf "bereit für A68" aktualisiert. |
| 1.5 | 16.08.2026 | A68 **teilweise** abgeschlossen: `SignaturService` (HMAC-SHA256, Zeitstempel-Frische) erstellt und **tatsächlich mit 5 Testfällen getestet**; `Q7Adapter` signiert jetzt Envelopes vor Versand. Teil 2 (echtes Laden von `Q7Verbindung.geteiltesGeheimnis`) bewusst offen gelassen — fehlende `PrismaTenantService`-Datei, kein Raten. Neue offene Entscheidung #4 in Abschnitt 6. |
| 1.6 | 16.08.2026 | A68 abgeschlossen: `Q7VerbindungPrismaRepository` implementiert `holeGeheimnis()` real, auf Basis der bereitgestellten `PrismaTenantService`-Datei. Neue vorgeschlagene Methode `withExplicitTenantContext()` für Hintergrund-Kontexte (Connector-Export ohne eingehenden Request) — noch nicht ins Repo eingefügt, siehe Abschnitt 6, Punkt 5. Entschlüsselung von `geteiltesGeheimnis` bewusst als Platzhalter belassen (A25-Crypto-Datei nicht bekannt), siehe Punkt 4. |
| 1.7 | 16.08.2026 | `withExplicitTenantContext()` ins Repo eingefügt (`prisma-tenant.service.ts` ersetzt). `npx tsc --noEmit` im echten Projekt ausgeführt (Admin) — **fehlerfrei**, gesamter bisheriger Connector-Code damit erstmals compiler-verifiziert statt nur behauptet. Punkt 5 aus Abschnitt 6 erledigt. |
| 1.8 | 16.08.2026 | **Korrektur:** Bei A69 entdeckt, dass `src/erp-tuersteher/` bereits vollständig existierte (alle 4 Ebenen aus 3.7.2, echte Verschlüsselung). Eigene, parallele `signatur.service.ts` und `q7-tuersteher.middleware.ts` (A68/A69) **verworfen**. Neu: `q7-connector-tuersteher.middleware.ts` (nutzt bestehenden `ErpTuersteherService`), `partner-export.controller.ts` (A69, `GET /connector/q7/partner`), neuer Abschnitt 3.4.4. `Q7VerbindungPrismaRepository` korrigiert: nutzt jetzt echte `VerschluesselungService`-Entschlüsselung, Punkt 4 aus Abschnitt 6 gelöst. Zwei neue offene Punkte (6, 7) ergänzt. |
