# Q7-ERP — Übergabeprotokoll

**Datum:** 20.09.2026
**Zweck:** Zusammenfassung der Erfolge dieser Session (Block D, E-Commerce/Fulfillment) sowie Arbeitsplan für die noch anstehenden Schritte.
**Bezug:** `Q7ERP_Arbeitsplan_Ecommerce_v1.md` (Block D, D01–D34)

---

## 1. Ausgangslage dieser Session

Fortsetzung von Block D (E-Commerce/Fulfillment-Erweiterung für Q7-ERP), nach Fertigstellung von Etappe 1–5 (Backend-Kern, Lager, CRM, HR, Dashboard). Ziel: Fundament (D01–D05) fertigstellen und für die Fachmodule (Zahlung/Logistik/Shop) den weiteren Rahmen schaffen.

---

## 2. ERFOLGE — was diese Session erreicht wurde

### D01 — Grill-Me: Datenmodell "aktive Module + Konfiguration pro Mandant"
✅ Abgeschlossen (Verdict PROCEED). 5 Entscheidungen getroffen und dokumentiert in `Q7ERP_Konzept_ModulKonfiguration_v1.md`:
- `LizenznehmerModul`-Register im Q7-ERP-Core
- API-Keys über bestehenden `VerschluesselungService`
- Konfigurationstabellen mit eigener `id`-PK (zukunftssicher für 1:n), fachlich MVP-1:1
- Carrier/Shop/Zahlart als freier `adapterName`-String statt Enum
- Deaktivierung setzt nur `aktiv = false`, Konfiguration bleibt erhalten

### D02 — Umsetzung in `schema.prisma`
✅ Vollständig abgeschlossen: Tabellen `LizenznehmerModul`, `ZahlungKonfiguration`, `LogistikKonfiguration`, `ShopKonfiguration` angelegt, migriert, RLS-Policies angewendet und mit Lizenznehmer A/B verifiziert.

### D03 — Grill-Me: zentrales "Bestellung"-Datenmodell
✅ Abgeschlossen (Verdict PROCEED). 5 Entscheidungen getroffen und dokumentiert in `Q7ERP_Konzept_Bestellung_v1.md`:
- Kundendaten inline auf `Bestellung` (kein automatischer CRM-Kontakt-Bezug)
- Zahlung/Logistik als Snapshot statt Live-Referenz zu den D02-Konfigurationstabellen
- Fester Status-Enum (`NEU`/`IN_BEARBEITUNG`/`VERSANDT`/`ABGESCHLOSSEN`/`STORNIERT`)
- `BestellungService` muss `LagerService.warenausgangBuchen()` sauber aufrufen (kein direkter Tabellenzugriff)
- `mwstSatz` pro `BestellPosition`, nicht pauschal pro Bestellung
- Ergänzend entschieden: `gesamtbetragNetto` UND `gesamtbetragBrutto` werden beide gespeichert (statt einer Einstellung), berechnet aus `mwstSatz` je Position

### D04 — Umsetzung in `schema.prisma`
✅ Vollständig abgeschlossen: Tabellen `Bestellung`, `BestellPosition` angelegt, migriert, RLS-Policies angewendet und verifiziert.

### D05 — `BestellungService`-Grundgerüst
✅ Vollständig abgeschlossen UND end-to-end getestet:
- `BestellungService`, `BestellungController`, `BestellungModule`, DTOs erstellt (Stil an `ArtikelService`/`CrmAngebotController` angeglichen)
- `app.module.ts` aktualisiert
- Getestet: `POST /bestellungen` (Netto/Brutto korrekt berechnet), `GET /bestellungen`, `GET /bestellungen/:id`, `PATCH /bestellungen/:id/status`
- Mandantentrennung bestätigt (Lizenznehmer B erhält 404 bei Bestellung von Lizenznehmer A)

### D06, D09, D17, D23–D25, D26–D29 — dokumentierte Platzhalter
✅ Ordnerstruktur angelegt (`src/zahlung/`, `src/logistik/`, `src/shop/`, `src/import-adapter/`, `src/branding/`), jeweils mit `README.md`, die festhält:
- Warum noch keine Implementierung erfolgt (kein konkreter externer Partner/kein Konzept-Dokument)
- Welche D01/D02/D03-Entscheidungen bereits gelten, sobald gebaut wird
- Welche konkreten Aufgaben-IDs noch offen sind

**Bewusste Entscheidung (Admin, 20.09.2026):** Keine spekulative Implementierung ohne echten Zahlungsanbieter/Carrier/Shop — echte Arbeit an D06–D08, D09–D16, D17–D22 beginnt erst, sobald ein konkreter externer Partner feststeht.

---

## 3. ARBEITSPLAN — was noch aussteht

### 3.1 Abhängig von externem Partner (aktuell blockiert)
| Block | Aufgaben | Blockiert durch |
|---|---|---|
| Zahlung | D06–D08 | Konkreter Zahlungsanbieter (auch für reines COD sinnvoll zu klären) |
| Logistik | D09–D16 | Konkreter Carrier (z.B. DHL) |
| Shopsysteme | D17–D22 | Konkretes Shopsystem (z.B. Shopify/WooCommerce) |

### 3.2 Nicht von externem Partner abhängig (kann vorgezogen werden)
| Block | Aufgaben | Status |
|---|---|---|
| Import-Adapter | D23 (`Q7ErpImportAdapter`-Interface implementieren) | Kann unabhängig vom Kunden begonnen werden — Interface bereits in Master-Dok 3.4.2 beschrieben |
| Import-Adapter | D24–D25 (konkreter Adapter, Test) | Braucht Beispielformat, aber kein realer Kunde nötig |
| Branding & Subdomains | D26–D29 | Braucht zuerst ein Konzept-Dokument (analog D01/D03) — noch nicht erstellt, siehe `src/branding/README.md` |

### 3.3 Abschluss (erst nach obigen Blöcken sinnvoll)
| Block | Aufgaben |
|---|---|
| Gesamttest & Abschluss | D30–D34 (End-to-End-Tests, Mandantentrennung Block D gesamt, Code-Review, Übergabeprotokoll) |

### 3.4 Separat zurückgestellt, weiterhin offen (aus Übergabeprotokoll 12.09.2026)
Diese Punkte wurden am 18.09. bewusst zugunsten von Block D zurückgestellt — nicht Teil von Block D, aber weiterhin im Arbeitsplan zu berücksichtigen:
| ID | Aufgabe |
|---|---|
| A149 | Automatische Standard-Lagerort-Anlage bei neuem Lizenznehmer |
| A150 | Design-Migration restlicher Frontend-Seiten (Konto, Lager, CRM-Liste, Vorschuss, Verbindung, Zeiterfassung) |
| A151 | `grundpreis`-Pflichtfeld-Frage (Lager-Ansicht vs. Einkaufs-Ansicht) |
| A154 | CRM-Kontakt-Formular: Typ-/Pipeline-Status-Feld ergänzen |
| A155 | CRM-Frontend-Ausbau (Aktivitäten/Wiedervorlagen/Angebote im Frontend) |

---

## 4. Empfehlung für die nächste Session

1. **Kurzfristig, ohne externe Abhängigkeit:** D23 (`Q7ErpImportAdapter`-Interface) oder ein Grill-Me/Konzept-Dokument für D26–D29 (Branding/eshop) — beide lassen sich vorantreiben, ohne auf einen externen Partner zu warten.
2. **Sobald ein Zahlungsanbieter/Carrier/Shopsystem feststeht:** kurze Grill-Me-Session zum jeweiligen Modul (D06/D09/D17), dann Umsetzung.
3. **Parallel oder danach:** A149–A155 abarbeiten (unabhängig von Block D, seit 18.09. zurückgestellt).
4. **Nicht vergessen:** `.env` regelmäßig prüfen, dass sie auf `q7erp_app` steht (nicht versehentlich auf Superuser stehen bleibt) — mehrfach in dieser Session kurzzeitig umgestellt.

---

## ÄNDERUNGSHISTORIE

| Version | Datum | Änderung |
|---|---|---|
| — | 20.09.2026 | Ersterstellung — Erfolge D01–D05 + dokumentierte Platzhalter D06/D09/D17/D23–D29, Arbeitsplan für offene Punkte |
