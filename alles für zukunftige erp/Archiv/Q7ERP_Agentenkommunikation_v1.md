# Q7-ERP — AGENTENKOMMUNIKATION (Diskussionsstand v1)

**Status:** Konzeptionelle Diskussion, noch nicht final entschieden — Grundlage für weitere Ausarbeitung
**Stand:** 08.08.2026
**Bezug:** Master-Dokument Abschnitt 3.7 (Kontext-Synchronisation Q7 ↔ Q7-ERP)

---

## 1. AUSGANGSPUNKT: INSPIRATION ONESTACK AI

Notizen zu einem fremden ERP-System ("OneStack AI") als Vergleichs-/Inspirationsquelle, keine eigene Architekturentscheidung:

| Merkmal | Beschreibung |
|---|---|
| Einheitliches Datenmodell | ERP, CRM und HR nicht als separate Silos, sondern gemeinsames Datenmodell |
| Organisationsstruktur | Mehrere Firmen in einem Mandanten (Tenant) verwaltbar, inkl. Intercompany-Beziehungen und konsolidierter Sicht |
| Agentische Architektur | KI interagiert direkt über "Agent Claw" mit dem System (statt Menübäume), unter strikter Einhaltung bestehender Backend-Berechtigungen |
| API-First & Toolchain | Moderne Toolchain, neue Features innerhalb von 24h möglich, stark API-basiert |
| Modulare Fachbereiche | ERP/Projekte (Professional Services), CRM (Leads/Opportunities, Sprach-Erfassung), HR (Zeitwirtschaft/Lohn DACH), Finanzen (OCR, revisionssicheres Archiv, BI) |

## 2. EINGEORDNETE UNTERSCHIEDE ZU Q7-ERP

| Punkt | OneStack | Q7-ERP (aktueller Stand) | Einschätzung |
|---|---|---|---|
| Datenmodell | ERP+CRM+HR vereint | Reines ERP | Nicht sofort übernehmen, aber Core so gestalten, dass CRM/HR später als **eigene Module** (analog Lager/Buchhaltung, Prinzip 3.2) andocken können — kein Umbau des Kerns nötig, keine Scope-Erweiterung jetzt |
| Multi-Company | Mehrere Firmen pro Mandant, Intercompany, Konsolidierung | 1 Lizenznehmer = 1 Firma | Vorerst nicht übernehmen — deutliche Zusatzkomplexität im Core, kein aktueller Bedarf, würde Phase 1 aufblähen |
| Agentische Steuerung | KI steuert System direkt live | A15 = reiner Sync-Agent (Daten spiegeln, kein Live-Zugriff) | Siehe Abschnitt 3 unten — eigenständiger Diskussionspunkt |
| Feature-Velocity (24h) | Arbeitsweise/Toolchain | — | Kein Architekturthema, nicht relevant für Adaption |
| Fachtiefe (OCR, Skill-Matching etc.) | Ausgereifte Modul-Inhalte | Noch vor Phase-1-Abschluss | Zu früh, spätere Modul-Phasen |

**Zusammenfassend:** Einziger Punkt mit direkter Konsequenz für die aktuelle Architektur ist die CRM/HR-Modulfähigkeit des Core (leichte Vorbereitung, kein Mehraufwand jetzt) sowie die Frage der agentischen Live-Steuerung (siehe unten).

---

## 3. AGENTENKOMMUNIKATION Q7 ↔ Q7-ERP — NEUES KONZEPT

### 3.1 Ausgangslage (bestehend, 3.7)
A15 ist der Q7-seitige Synchronisations-Agent: Q7-ERP löst Domain Events aus → Connector-Webhook → Kontext-Speicher (read-optimierte Tabellen auf Q7-Seite) → Q7-Agenten fragen den Kontext-Speicher ab, nie Q7-ERP live direkt. Bewusst **passiv/asynchron**, um das produktive ERP-System zu schonen und die Eigenständigkeit (3.5) zu wahren.

### 3.2 Erkannte Lücke
Bisheriges Modell setzt voraus, dass ein Lizenznehmer Q7 nutzt. Für Lizenznehmer, die **nur Q7-ERP standalone** einsetzen (ohne Q7), gibt es aktuell keinen KI-Agenten, der direkt im System arbeitet — Widerspruch zum eigenen Eigenständigkeits-Test (3.5), der bisher nur klassische Bedienung (UI/API) abdeckt, nicht agentische.

### 3.3 Vorgeschlagenes Konzept: symmetrische Zwei-Agenten-Struktur

Zwei Agenten mit **gleicher Grundstruktur** (gleiche MD-Dateien / gleiches Muster), aber **unterschiedlicher Rolle**:

| Agent | Sitz | Rolle | Zugriffsmodus |
|---|---|---|---|
| **A15** | Q7-System | Bestehender Sync-Agent | Extern, synchronisiert — arbeitet auf gespiegelten Kontext-Speicher-Daten |
| **Neuer ERP-nativer Agent** ("Agent XXX", Name/Nummer offen) | Q7-ERP-System | Bedient Q7-ERP direkt und live, auch im Standalone-Betrieb ohne Q7 | Intern, live — arbeitet über bestehende Service-Kapselung (3.1) und RLS (3.6) |

**Kommunikation zwischen beiden:** Nicht als zwei gleichberechtigte freie Live-Zugriffspunkte, sondern über eine klar definierte Schnittstelle (analog Connector-Prinzip 3.4). Rollentrennung bleibt bestehen:
- Agent XXX = intern & live (im ERP)
- A15 = extern & synchronisiert (Richtung Q7)

### 3.4 Wichtige Einschränkung: Rechte NICHT automatisch identisch
Gleiche Struktur bedeutet ausdrücklich **nicht** gleiche Rechte:
- A15 arbeitet nur mit bereits gefilterten, gespiegelten Daten (Kontext-Speicher)
- Agent XXX müsste im ERP direkt mit echten Lizenznehmer-Rechten und RLS (3.6) arbeiten
- Gleiche Rechte für beide würde die bestehende Mandantentrennung (3.6) aushebeln — bewusst vermeiden

### 3.5 Offene Fragen für die weitere Ausarbeitung
1. Braucht der neue ERP-native Agent eine eigene Nummer (Q7-Governance-Ebene, analog A15/A16/A17)?
2. Läuft er nur bei Lizenznehmern ohne Q7-Anbindung, oder auch parallel zu A15 bei Q7-Kunden?
3. Wie sieht die konkrete Schnittstelle zwischen Agent XXX und A15 aus (Format, Auslöser, Sicherheitsgrenze)?
4. Live-Zugriff erfordert, dass die Service-Kapselung (3.1) von Anfang an "agenten-tauglich" ist — klar definierte, sichere Aktionen statt freiem DB-Zugriff. Wie wird das konkret abgegrenzt?
5. CRM/HR als spätere Module (Abschnitt 2) — wann und wie in Roadmap (Abschnitt 5 Master-Dok) einordnen?

---

## 4. LÖSUNGSVORSCHLÄGE ZU DEN OFFENEN FRAGEN (Diskussionsstand)

Zu jeder Frage aus 3.5 drei Optionen, mit Einschätzung. Noch keine Admin-Entscheidung — Diskussionsgrundlage.

### 4.1 Frage 1 — Eigene Nummer für den ERP-nativen Agenten?

| Option | Beschreibung |
|---|---|
| A | Eigene Nummer sofort vergeben (z.B. A18), analog A15/A16/A17 |
| B | Vorerst ohne Nummer, nur "Agent XXX" als Platzhalter, Nummer erst bei Umsetzung |
| C | Gar keine A-Nummer — sitzt in Q7-ERP, nicht in Q7, gehört nicht ins Q7-Nummernschema, eigene ERP-interne Bezeichnung |

**Einschätzung:** Option C. Das A-Nummernschema ist Q7-Governance-Ebene für Q7-Agenten. Ein Agent, der im Q7-ERP-System sitzt und auch unabhängig von Q7 existieren muss (Standalone-Fall), sollte begrifflich nicht ins Q7-System einsortiert werden — sonst suggeriert das eine Abhängigkeit, die laut 3.5 explizit nicht bestehen soll.

### 4.2 Frage 2 — Nur Standalone-Lizenznehmer, oder auch parallel zu A15 bei Q7-Kunden?

| Option | Beschreibung |
|---|---|
| A | Nur Standalone-Lizenznehmer (ohne Q7) — bei Q7-Kunden übernimmt A15 alles |
| B | Immer aktiv, bei allen Lizenznehmern parallel zu A15 |
| C | Konfigurierbar pro Lizenznehmer (Feature-Flag), Standard je nach Q7-Anbindung |

**Einschätzung:** Option C. Passt zum bestehenden Muster (Feature-Flags bei Artikel-Stufen, Abschnitt 4 Master-Dok). Option B erzeugt unnötige Doppel-Zugriffspunkte bei Q7-Kunden (Redundanz zu A15, mehr Angriffsfläche). Option A ist zu starr — ein Q7-Kunde könnte trotzdem von direkten, aktuellen Live-Antworten profitieren wollen statt gespiegelter Daten. C lässt das offen, ohne es sofort festzulegen.

### 4.3 Frage 3 — Konkrete Schnittstelle zwischen Agent XXX und A15 (vertieft)

| Option | Beschreibung |
|---|---|
| A | Direkte API zwischen beiden Agenten (eigenes Protokoll, z.B. REST/gRPC) |
| B | Über die bestehende Connector-Schicht (3.4) — Agent XXX ist ein weiterer "Adapter" |
| C | Kein direkter Kanal — beide kommunizieren nur indirekt über den Kontext-Speicher |

**Einschätzung:** Option B. Kein neues Protokoll, gleiche Sicherheits-/Kapselungslogik wie jede andere Anbindung. Option A wäre ein Sonderfall außerhalb des bestehenden Prinzips, Option C ist zu indirekt für Fragen, die eine Live-Antwort brauchen.

**Vertiefung — was Option B konkret bedeutet:**

Bisher ist "Q7" einer der Adapter in der Connector-Schicht — die Verbindung, über die A15 Events rausschickt. Agent XXX wird technisch genauso behandelt wie ein weiterer Teilnehmer an dieser Schicht, kein Sonderfall.

**Zwei Kommunikationsrichtungen, nicht eine:**

| Richtung | Bisher (3.7) | Neu mit Agent XXX |
|---|---|---|
| Q7-ERP → Q7 | Domain Event → Webhook → Kontext-Speicher (A15 empfängt) | unverändert |
| Q7 → Q7-ERP (Anfrage) | Existiert aktuell nicht — A15 liest nur passiv aus dem Kontext-Speicher | Neu: Wenn Q7 eine Live-Antwort braucht (z.B. Kontext-Speicher zu alt), schickt A15 eine Anfrage über die Connector-Schicht an Agent XXX, der intern live antwortet |

Bisher ist der Kanal einseitig (nur Push von ERP zu Q7) — neu kommt optional ein Rückkanal (Pull, ausgelöst durch A15) hinzu.

**Konkreter Nachrichtenfluss (Vorschlag):**

```
Lizenznehmer fragt Q7-Agent (z.B. A01)
   → A01 prüft Kontext-Speicher
   → Daten fehlen/zu alt (letzteSyncZeit zu weit zurück)
   → A15 stellt Anfrage über Connector-Schicht: "Live-Abfrage nötig, Lizenznehmer X, Frage Y"
   → Agent XXX (im Q7-ERP) empfängt Anfrage über denselben Adapter-Mechanismus
   → Agent XXX führt die Anfrage über die (agenten-sicheren) Services aus, RLS greift automatisch
   → Antwort geht denselben Weg zurück: Agent XXX → Connector-Schicht → A15 → A01 → Lizenznehmer
```

**Format/Schnittstelle:**
- Gleiches "einheitliches internes Format" wie bei jedem anderen Adapter (3.4) — keine Sonderkodierung nur für diesen Fall
- Anfrage enthält mindestens: `lizenznehmerId`, Frage/Aktion, Zeitstempel, Anfrage-ID (für Antwort-Zuordnung)
- Empfehlung: **asynchron mit Antwort-Webhook**, analog zum bestehenden Event-Mechanismus, statt einer offenen Live-Verbindung — hält 3.4 konsistent (keine dauerhaften Direktverbindungen zwischen Systemen)

**Sicherheitsgrenze:**
- Agent XXX nutzt für jede Anfrage die normale Service-Kapselung (3.1) + RLS (3.6) mit der `lizenznehmerId` aus der Anfrage — keine erweiterten Rechte gegenüber einem normalen API-Aufruf
- A15/Connector-Schicht validiert nur die Anfrage-Herkunft (ist das wirklich Q7, für den richtigen Lizenznehmer), nicht die fachlichen Rechte — die fachliche Prüfung bleibt vollständig in Q7-ERP

**Warum nicht Option A oder C:**
- Direkte API zwischen den Agenten (A) hieße: neues Protokoll, neue Authentifizierung, neue Fehlerbehandlung — Doppelarbeit neben bestehender Connector-Infrastruktur
- Nur über Kontext-Speicher (C) hieße: keine echten Live-Antworten möglich, genau die Lücke bleibt offen, die den ganzen Agent-XXX-Gedanken ausgelöst hat

**Noch offen für spätere Ausarbeitung:** genaues Nachrichtenformat (JSON-Schema), Timeout-/Retry-Verhalten bei asynchroner Anfrage, ob Agent XXX auch unaufgefordert Events an A15 pushen darf oder nur auf Anfrage antwortet.

### 4.4 Frage 4 — Wie wird die Service-Kapselung (3.1) "agenten-tauglich"?

| Option | Beschreibung |
|---|---|
| A | Agent bekommt dieselben Service-Methoden wie Frontend/API (kein Unterschied Mensch/Agent) |
| B | Eigene, reduzierte Service-Schicht nur für den Agenten — bewusst eingeschränktere Aktionen |
| C | Bestehende Services bleiben, aber jede Methode bekommt ein explizites "agent-safe"-Flag/Review, bevor der Agent sie nutzen darf |

**Einschätzung:** Option C. Option A ist riskant — Frontend-Aktionen sind oft für menschliche Bestätigung/Kontext ausgelegt (z.B. Lösch-Bestätigung), ein Agent könnte das ungebremst ausführen. Option B ist sicherer, bedeutet aber doppelte Pflege von zwei Service-Schichten. C erzwingt bewusstes Nachdenken pro Aktion ("darf ein Agent das eigenständig tun?") ohne Code-Duplikation — passt am besten zum Prinzip 3.1 (eine Zwischenschicht, ein Ort für Entscheidungen).

### 4.5 Frage 5 — Wann und wie CRM/HR in die Roadmap einordnen?

| Option | Beschreibung |
|---|---|
| A | Jetzt fest terminieren, z.B. direkt nach Phase 4 als Phase 5/6 |
| B | Gar nicht fest einplanen — erst bei konkretem Kundenbedarf/Business Case |
| C | Nicht terminieren, aber Core (v.a. `Partner`) schon jetzt so gestalten, dass CRM/HR jederzeit als Modul andocken könnten |

**Einschätzung:** Option C. Option A bindet an einen Termin, der noch nicht fundiert einschätzbar ist. Option B verschenkt die Chance, jetzt kostengünstig vorzubereiten. C hält die Tür offen, ohne Aufwand oder Verpflichtung.

---

## 5. STATUS

Reine Diskussionsgrundlage. Noch keine Übernahme ins Master-Dokument oder in die Aufgabenliste — folgt erst nach Admin-Entscheidung zu den Optionen in Abschnitt 4.
