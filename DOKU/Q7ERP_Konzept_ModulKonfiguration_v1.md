# Q7-ERP — KONZEPT: Aktive Module + Konfiguration pro Mandant — v1

**Version:** 1.0
**Datum:** 17.09.2026
**Bezug:** Block D (E-Commerce/Fulfillment), Aufgabe D01 — Grill-Me-Session, Verdict: PROCEED
**Änderungen seit letzter Version:** Ersterstellung — fasst die 5 Entscheidungen aus der Grill-Me-Session zu D01 zusammen, als Grundlage für D02 (Umsetzung in `schema.prisma`).

---

## 1. Ausgangspunkt

Fundament für die drei neuen Fulfillment-Module (Zahlungsanbieter, Logistik, Shopsysteme, siehe `Q7ERP_Arbeitsplan_Ecommerce_v1.md`, Block D): ein Datenmodell, das pro Lizenznehmer festhält, welche Module aktiv sind und wie sie konfiguriert sind (API-Keys, gewählter Carrier/Shop).

**Architektur-Einordnung (aus vorheriger Diskussion, bindend):** Diese Module — und damit auch dieses Konfigurationsmodell — leben **im Q7-ERP-System** (NestJS/PostgreSQL/Prisma), unabhängig davon, ob der jeweilige Lizenznehmer Q7-ERP als vollständigen ERP-Kern nutzt oder ein eigenes Fremd-ERP hat. Q7 selbst (Next.js) bleibt reine KI-/Agenten-Oberfläche und bekommt keine eigene Fulfillment-Logik — auch nicht für den "eshop"-Kundentyp (Q7 mit anderem Logo, reduzierter Agentenzahl). Details zur Kundentyp-Unterscheidung: siehe `Q7ERP_Arbeitsplan_Ecommerce_v1.md`, Abschnitt "Architektur-Grundentscheidungen", sowie das Konzept "eshop = Q7-Branding + weniger Workflow-Agenten, Q7-ERP-Fulfillment-Module unverändert im Hintergrund".

---

## 2. Entscheidungen (Grill-Me-Session, 17.09.2026)

### 2.1 Ort des Aktivierungs-Registers

**Entscheidung:** Ein zentrales `LizenznehmerModul`-Register im **Q7-ERP-Core** (Master-Dok Abschnitt 3.3, Stammdaten-Ebene) — nicht verteilt auf jedes Fachmodul einzeln.

**Begründung:** Ein Ort für "was ist pro Mandant aktiv" ermöglicht eine einfache zentrale Abfrage (z.B. fürs Dashboard oder künftiges Routing), analog zum bestehenden Feature-Flag-Muster beim Artikel-Stufenkonzept (Master-Dok Abschnitt 4). Die drei neuen Fachmodule (Zahlung/Logistik/Shop) bleiben untereinander unabhängig (Prinzip 3.2) — nur das Aktivierungs-Flag selbst liegt zentral, nicht die fachlichen Daten der Module.

### 2.2 Verschlüsselung der API-Keys

**Entscheidung:** Bestehenden `VerschluesselungService` (AES-256-GCM, siehe Master-Dok 3.7.2 / Aufgabe A25) für Carrier-/Shop-API-Keys wiederverwenden — kein neuer Verschlüsselungsmechanismus.

**Begründung:** Der Service ist bereits im Betrieb (für `q7_verbindung.geteiltesGeheimnis`) und geprüft. Ein neuer, paralleler Mechanismus würde exakt den A69-Fehler wiederholen (parallele Sicherheitslogik statt Wiederverwendung bestehender, geprüfter Bausteine). Unverschlüsselte Speicherung wurde verworfen — Carrier-/Shop-API-Keys sind ebenso sensibel wie das Q7-Verbindungsgeheimnis.

### 2.3 Beziehung Mandant ↔ Konfiguration

**Entscheidung:** Konfigurationstabellen erhalten eine eigene `id` als Primärschlüssel (nicht `lizenznehmerId` als PK). Fachlich bleibt der MVP-Scope strikt **1:1** (ein Carrier, ein Shop pro Mandant, wie im Ecommerce-Arbeitsplan festgelegt) — die Tabellenstruktur erlaubt aber eine spätere Erweiterung zu 1:n (mehrere Konfigurationen pro Mandant, z.B. zweiter Carrier), ohne Breaking Change am Schema.

**Begründung:** Kostet in der Umsetzung nichts zusätzlich (eine `id`-Spalte ist Standard), verhindert aber, dass der erste reale Mehrfach-Carrier-/Shop-Kunde eine Schema-Migration statt nur einen zusätzlichen Datensatz benötigt. Volle 1:n-Logik von Anfang an (inkl. "welche Konfiguration ist aktiv") wäre Überengineering für den aktuellen MVP-Scope.

### 2.4 Modellierung von Carrier/Shop/Zahlart

**Entscheidung:** Freier String (z.B. `adapterName`), nicht geschlossenes Enum — konsistent mit dem bestehenden Connector-Adapter-Muster (`Q7ErpExportAdapter.adapterName`, Master-Dok 3.4.2).

**Begründung:** Jeder neue Carrier, Shop-Typ oder jede neue Zahlart wird dadurch technisch zu einem neuen Adapter mit neuem Namen — keine Schema-Migration bei Erweiterung nötig. Ein Enum würde bei jeder Erweiterung (zweiter Carrier, Prepaid-Zahlart) eine Migration und Code-Änderung an mehreren Stellen erzwingen und widerspräche dem Grundsatz aus 3.4, dass der Kern bei neuen Integrationen unverändert bleibt.

### 2.5 Verhalten bei Deaktivierung eines Moduls

**Entscheidung:** Konfiguration bleibt bei Deaktivierung erhalten, nur `aktiv = false` wird gesetzt — keine Löschung.

**Begründung:** Einfachste, für den MVP ausreichende Lösung. Ermöglicht Reaktivierung ohne erneute Eingabe von API-Keys/Einstellungen. Ein Sicherheitsgewinn durch Löschung wäre marginal, da RLS/Mandantentrennung ohnehin greift. Automatisierte Secret-Rotation bei längerer Inaktivität ist ein möglicher späterer Ausbau (vgl. bereits akzeptierter offener Punkt "keine automatisierte Rotation" bei A25), kein Bestandteil des MVP.

---

## 3. Zusammenfassung für D02 (Umsetzung in `schema.prisma`)

| Baustein | Festlegung |
|---|---|
| Register | `LizenznehmerModul` (Q7-ERP-Core), Felder u.a. `lizenznehmerId`, `modulName` (String, z.B. `"logistik"`, `"zahlung"`, `"shop"`), `aktiv` (Boolean) |
| Konfigurationstabellen | Je Modul eine eigene Tabelle (z.B. `LogistikKonfiguration`, `ZahlungKonfiguration`, `ShopKonfiguration`), jeweils mit eigener `id`-PK, `lizenznehmerId` als Fremdschlüssel |
| Adapter-Bezeichner | Freier String-Feld (z.B. `adapterName`), kein Enum |
| Secrets | Über bestehenden `VerschluesselungService` verschlüsselt, analog `q7_verbindung.geteiltesGeheimnis` |
| Deaktivierung | Nur `aktiv = false`, Konfigurationsdaten bleiben in der DB erhalten |

**Offen für D02:** Aktuelle `schema.prisma`-Datei wird benötigt, um zu prüfen, ob es bereits passende Enum-/Namenskonventionen oder Service-Strukturen gibt, an die sich das neue Modell anlehnen sollte (Prinzip: nichts erfinden, erst prüfen was existiert).

---

## ÄNDERUNGSHISTORIE

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 17.09.2026 | Ersterstellung — 5 Entscheidungen aus Grill-Me-Session zu D01 dokumentiert, Verdict PROCEED |
