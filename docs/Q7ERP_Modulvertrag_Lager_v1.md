# Q7-ERP — Modul-Vertrag: Lager/Warenwirtschaft — Version 1

**Version:** 1
**Datum:** 16.08.2026
**Änderungen seit letzter Version:** Ersterstellung (Aufgabe A61)

**Quelle:** erstellt aus `lager.service.ts` (Stand: Upload vom 16.08.2026, inkl. IDOR-Fix A60)

---

## 1. Zweck dieses Dokuments

Legt fest, was andere Module (z.B. später Verkauf, Connector-Schicht) vom Lager-Modul
nutzen dürfen, und was strikt intern bleibt. Grundlage: Master-Dokument Abschnitt 3.2
(Modul-Eigenständigkeit) — kein Modul schreibt direkt in Tabellen eines anderen Moduls,
Kommunikation nur über definierte Schnittstellen.

---

## 2. Öffentliche Schnittstelle (`LagerService`)

Andere Module dürfen ausschließlich diese fünf Methoden aufrufen. Jede Methode
erzwingt intern die `lizenznehmerId`-Filterung (Kapselungsprinzip, 3.1).

| Methode | Signatur | Zweck |
|---|---|---|
| `holeBestand` | `(lizenznehmerId: string, artikelId: string, lagerortId?: string)` | Aktuellen Bestand eines Artikels an einem Lagerort abfragen. Ohne `lagerortId` wird der Standard-Lagerort verwendet. Gibt Menge 0 zurück, wenn noch nie gebucht — kein Fehler. |
| `wareneingangBuchen` | `(lizenznehmerId: string, dto: WareneingangDto)` | Bestand erhöhen + Lagerbewegung protokollieren (Typ `WARENEINGANG`). |
| `warenausgangBuchen` | `(lizenznehmerId: string, dto: WarenausgangDto)` | Bestand verringern + Lagerbewegung protokollieren (Typ `WARENAUSGANG`). Lehnt ab, wenn Bestand nicht ausreicht (kein negativer Bestand möglich, A55). |
| `bestandskorrekturBuchen` | `(lizenznehmerId: string, dto: BestandskorrekturDto)` | Bestand auf gezählte Zielmenge (`dto.neueMenge`) setzen. Differenz wird intern berechnet und als `KORREKTUR_AUFWAERTS`/`KORREKTUR_ABWAERTS` protokolliert. Bei Differenz 0 keine Lagerbewegung. |
| `bundleVerkaufBuchen` | `(lizenznehmerId: string, dto: BundleVerkaufDto)` | Bucht die Bestandsabbuchung aller Bundle-Bestandteile beim Verkauf von `dto.menge` Bundles. Alles-oder-nichts: wird geprüft, bevor irgendetwas abgebucht wird. Protokolliert je Bestandteil eine Lagerbewegung (Typ `BUNDLE_ABBUCHUNG`). |

**Rückgabewerte:** Alle Methoden geben Prisma-Datensätze bzw. einfache Objekte zurück
(kein separates öffentliches DTO-Ausgabeformat bisher definiert).

**Fehlerverhalten (Teil des Vertrags):**
- `NotFoundException`, wenn Artikel, Bundle-Bestandteile oder Standard-Lagerort nicht gefunden/nicht dem Lizenznehmer zugeordnet sind.
- `BadRequestException`, wenn Bestand nicht ausreicht (Warenausgang, Bundle-Verkauf) oder ein Artikel kein Bundle ist.

---

## 3. Explizit NICHT nach außen gegeben

- Die privaten Methoden `pruefeArtikelGehoertZuTenant()` und `ermittleZielLagerort()` — reine interne Hilfsfunktionen, kein Bestandteil des Vertrags.
- Direkter Lese-/Schreibzugriff auf die Tabellen `lagerbestand` und `lagerbewegung` — nur über die o.g. Service-Methoden.
- Die vollständige `Lagerbewegung`-Historie wird über keine der öffentlichen Methoden ausgegeben; es gibt aktuell keine Methode zum Abfragen der Bewegungshistorie (nur des aktuellen Bestands via `holeBestand`).

---

## 4. Abhängigkeiten zu anderen Modulen

| Abhängigkeit | Art | Beschreibung |
|---|---|---|
| **Artikel-Modul** | Lesend | Jede Buchung prüft über `pruefeArtikelGehoertZuTenant()`, dass der Artikel existiert und zum aufrufenden Lizenznehmer gehört (IDOR-Schutz, A60). |
| **Artikel-Modul (Stufe 3, Bundle)** | Lesend | `bundleVerkaufBuchen()` liest `artikel.istBundle` und die Tabelle `bundlePosition` direkt über Prisma — Lager-Modul greift damit lesend auf Datenstrukturen zu, die fachlich zum Artikel-Modul (Bundle-Stückliste) gehören. Ist bisher keine über einen Service gekapselte Schnittstelle, sondern direkter Tabellenzugriff. |
| **Lizenznehmer/Lagerort (Core)** | Lesend | `ermittleZielLagerort()` liest den Standard-Lagerort (`istStandard: true`) des Lizenznehmers. |
| **Tenancy-Basis** | Strukturell | `LagerService` erbt von `PrismaTenantService` — Transaktionskontext (`withTenantContext`) kommt aus dem Core, nicht aus dem Lager-Modul selbst. |

**Offener Punkt (zur Kenntnisnahme, keine Entscheidung getroffen):** Der direkte Prisma-Zugriff auf `artikel` und `bundlePosition` in `bundleVerkaufBuchen()` weicht vom Grundsatz "kein Modul liest/schreibt direkt in Tabellen eines anderen Moduls" (Master-Dokument 3.2) ab. Aktuell rein lesend, kein Datenleck-Risiko, aber architektonisch eine Abweichung — ggf. später über einen `ArtikelService`-Aufruf kapseln.

---

## 5. Events

Aktuell **keine** Events. Das Lager-Modul löst keine Domain-Events aus. Domain-Events sind laut Arbeitsplan erst Teil von Etappe 4 (A73, Connector-/Adapter-Schicht).

---

## 6. Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| 1 | 16.08.2026 | Ersterstellung, Basis: `lager.service.ts` inkl. A60-IDOR-Fix |
