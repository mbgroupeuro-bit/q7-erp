# Q7-ERP — Code-Review: Lager-Modul (A63) — Version 1

**Version:** 1
**Datum:** 16.08.2026
**Geprüfte Dateien:** `lager.service.ts`, `lager.controller.ts` (Stand: Upload vom 16.08.2026, inkl. A60-IDOR-Fix und A62b-Ergänzungen)
**Fokus:** Mandantentrennung (Master-Dokument 3.6) — vergessene Filter, IDOR, JOIN-Lecks, Admin-Umgehung

---

## 1. Ergebnis in Kürze

**Keine offenen Sicherheitslücken gefunden.** Alle Datenbankzugriffe im Lager-Modul filtern korrekt nach `lizenznehmerId`. Ein Verbesserungspunkt (kein Fund, sondern Empfehlung) und ein bereits bekannter offener Architektur-Punkt werden unten aufgeführt.

---

## 2. Prüfung je Leck-Szenario (Master-Dokument 3.6)

### Szenario 1 — Vergessener Filter in einer Abfrage
Geprüft: Jede der fünf öffentlichen Methoden (`holeBestand`, `wareneingangBuchen`, `warenausgangBuchen`, `bestandskorrekturBuchen`, `bundleVerkaufBuchen`) setzt `lizenznehmerId` in jeder `findFirst`/`findMany`/`create`-Abfrage.
**Befund:** Kein vergessener Filter gefunden.

### Szenario 2 — Manipulierte ID in der Web-Anfrage (IDOR)
Geprüft: `pruefeArtikelGehoertZuTenant()` wird vor jeder Buchung aufgerufen (A60-Fix), prüft `artikelId` gegen `lizenznehmerId`. `ermittleZielLagerort()` prüft den Standard-Lagerort ebenfalls gegen `lizenznehmerId`. `bundleVerkaufBuchen()` prüft `bundleArtikelId` zusätzlich direkt inline.
Zusätzlich wichtig: `lizenznehmerId` kommt in allen Controller-Methoden aus `req.user.lizenznehmerId` (JWT-Payload, serverseitig gesetzt beim Login) — **nicht** aus Body/Query/Param der Anfrage. Ein Nutzer kann diesen Wert also nicht durch Manipulation der Anfrage überschreiben.
**Befund:** Kein Fund. Deckt sich mit dem bereits dokumentierten A60-Fix.

### Szenario 3 — Verknüpfte Abfragen (JOINs) mit fehlendem Filter auf zweiter Tabelle
Konkret relevant: `bundleVerkaufBuchen()` liest `bundlePosition` (verknüpfte Tabelle zum Bundle-Artikel).
Geprüft: `prisma.bundlePosition.findMany({ where: { bundleArtikelId, lizenznehmerId } })` — Filter auf der zweiten Tabelle ist gesetzt (redundant mitgeführtes `lizenznehmerId`-Feld, siehe `schema.prisma`).
**Befund:** Kein Fund.

### Szenario 4 — Debug-/Admin-Werkzeuge ohne Filter
**Befund:** Keine Debug-/Admin-Werkzeuge im Lager-Modul vorhanden — nicht anwendbar.

---

## 3. Zusätzliche Prüfpunkte

- **Guard-Absicherung:** `@UseGuards(JwtAuthGuard)` ist auf Controller-Ebene gesetzt — gilt automatisch für alle fünf Endpunkte, keine Route bleibt ungeschützt.
- **`menge`-Invariante (A56):** `KORREKTUR_AUFWAERTS`/`KORREKTUR_ABWAERTS`-Enum-Split wird korrekt verwendet, `menge` bleibt in `Lagerbewegung` überall positiv (`Math.abs(differenz)`).
- **Negativer Bestand:** `warenausgangBuchen()` und `bundleVerkaufBuchen()` prüfen ausreichenden Bestand vor der Buchung (A55/A62 bereits getestet).

---

## 4. Verbesserungspunkt (kein Sicherheitsfund)

Bei `wareneingangBuchen()`, `warenausgangBuchen()`, `bestandskorrekturBuchen()` und `bundleVerkaufBuchen()` verwendet das abschließende `prisma.lagerbestand.update()`/`upsert()` das zusammengesetzte `where: { artikelId_lagerortId: {...} }` **ohne zusätzliches `lizenznehmerId` im `where`**.

Das ist aktuell **nicht ausnutzbar**, weil `artikelId` vorher bereits über `pruefeArtikelGehoertZuTenant()` gegen den Lizenznehmer geprüft wurde und ein `Lagerbestand`-Datensatz nur mit der `lizenznehmerId` seines zugehörigen Artikels angelegt werden kann. Eine explizite `lizenznehmerId`-Angabe auch in diesem `where` wäre trotzdem eine zusätzliche, unabhängige Absicherung (entspricht dem "zweites Schloss"-Gedanken aus 3.6) — Prisma erlaubt das bei zusammengesetzten Unique-Keys aber nicht direkt im selben `where`-Objekt ohne Erweiterung; müsste ggf. per zusätzlichem `updateMany` mit `where: { artikelId, lagerortId, lizenznehmerId }` gelöst werden.

**Empfehlung:** Nicht zwingend jetzt ändern (kein akutes Risiko), aber als Notiz für Etappe 4 (Connector-Schicht, wenn ggf. mehr Angriffsfläche entsteht) im Hinterkopf behalten.

---

## 5. Bereits bekannter offener Punkt (aus A61, hier bestätigt)

`bundleVerkaufBuchen()` greift direkt auf `artikel` und `bundlePosition` zu (Tabellen des Artikel-Moduls), statt über einen `ArtikelService`. Kein Sicherheitsrisiko (nur lesend, korrekt gefiltert), aber Abweichung von Master-Dokument 3.2 (Modul-Eigenständigkeit) — siehe `Q7ERP_Modulvertrag_Lager_v1.md`, Abschnitt 4. Entscheidung dazu weiterhin offen.

---

## 6. Nicht Teil dieser Prüfung

Diese Review deckt nur den Anwendungscode (Service + Controller) ab. Die zweite, unabhängige Sicherheitsebene aus 3.6 — **PostgreSQL Row-Level-Security (RLS)-Policies** für `lagerbestand`/`lagerbewegung`/`lagerort` — wurde hier **nicht** geprüft, da mir die entsprechende SQL-Migrationsdatei nicht vorliegt. Falls gewünscht, kann das als eigener Prüfschritt nachgeholt werden (Datei nötig, z.B. `migrations/.../migration.sql` mit den RLS-Policy-Definitionen).

---

## 7. Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| 1 | 16.08.2026 | Ersterstellung (A63) |
