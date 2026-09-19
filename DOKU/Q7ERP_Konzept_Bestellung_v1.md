# Q7-ERP — KONZEPT: Zentrales Bestellung-Datenmodell — v1

**Version:** 1.0
**Datum:** 18.09.2026
**Bezug:** Block D (E-Commerce/Fulfillment), Aufgabe D03 — Grill-Me-Session, Verdict: PROCEED
**Änderungen seit letzter Version:** Ersterstellung — fasst die 5 Entscheidungen aus der Grill-Me-Session zu D03 zusammen, als Grundlage für D04 (Umsetzung in `schema.prisma`).

---

## 1. Ausgangspunkt

Zentrales "Bestellung"-Datenmodell als Bezugspunkt für alle drei Fulfillment-Module (Zahlung, Logistik, Shop) — analog zur Rolle, die "Artikel" für Lager/Verkauf spielt. Jede Bestellung, unabhängig von der Quelle (manuell erfasst, Shop-Import, Facebook/WhatsApp), wird als ein `Bestellung`-Datensatz abgebildet.

---

## 2. Entscheidungen (Grill-Me-Session, 18.09.2026)

### 2.1 Kundendaten

**Entscheidung:** Kundendaten (Name, Telefon, Adresse) werden **inline** auf `Bestellung` gespeichert — kein automatisch erzeugter oder verknüpfter `CrmKontakt`.

**Begründung:** Ein Ecommerce-Käufer ist keine Vertriebs-Lead per Definition. Eine automatische CRM-Verknüpfung würde die Vertriebspipeline mit einmaligen Bestellungen (insbesondere COD) fluten, die keine Vertriebsbearbeitung benötigen. Die Kundendaten bleiben dabei **vollständig und dauerhaft** Teil des Bestelldatensatzes — auch nach Lieferung/Abschluss wird nichts gelöscht. Ein optionales, nullable Verknüpfungsfeld zu `CrmKontakt` wurde als verfrühte Flexibilität verworfen (Überengineering für ein Feld, das im MVP niemand befüllt). Echte Wiedererkennung von Stammkunden über mehrere Bestellungen hinweg ist ein bewusst zurückgestelltes, separates Vorhaben.

### 2.2 Zahlung/Logistik-Referenz

**Entscheidung:** Snapshot statt Live-Fremdschlüssel — `adapterName` und relevante Werte (z.B. Sendungsnummer) werden zum Zeitpunkt der Buchung direkt als Felder auf `Bestellung` festgehalten, keine FK auf `ZahlungKonfiguration`/`LogistikKonfiguration`.

**Begründung:** Eine Bestellhistorie muss unveränderlich bleiben. Bei einer Live-Referenz würde eine spätere Änderung oder Deaktivierung einer Konfiguration (D01, Entscheidung 5: Konfigurationen bleiben bei Deaktivierung erhalten, können sich aber ändern) rückwirkend verfälschen, mit welchem Carrier/welcher Zahlart eine historische Bestellung tatsächlich abgewickelt wurde.

### 2.3 Status-Modell

**Entscheidung:** Fester Enum (`NEU`, `IN_BEARBEITUNG`, `VERSANDT`, `ABGESCHLOSSEN`, `STORNIERT`) — keine konfigurierbare Pipeline wie im CRM-Modul (Block B).

**Begründung:** Ein Bestellstatus ist ein technisch-universeller Fulfillment-Zustand, den jede Bestellung unabhängig vom Mandanten in gleicher Weise durchläuft — anders als eine Vertriebspipeline, deren Stufennamen je nach Firma/Branche stark variieren (der Grund, warum dort auf Konfigurierbarkeit umgestellt wurde). Die beiden Fälle liegen unterschiedlich, obwohl beide "Status" heißen.

### 2.4 Kopplung an Lager

**Entscheidung:** `BestellungService` ruft `LagerService.warenausgangBuchen()` sauber auf — keine eigene Lager-Logik, kein direkter Zugriff auf Lager-Tabellen.

**Begründung:** Hält Prinzip 3.2 (Modul-Eigenständigkeit) ein, ohne eine zweite Abweichung neben der bereits dokumentierten (`bundleVerkaufBuchen()`, Master-Dok Abschnitt 6, #2) zu schaffen. Ein gemeinsamer "Fulfillment-Kern"-Service, der beide Fälle vereinheitlicht, wäre ein sinnvolles späteres Refactoring, aber kein Bestandteil von D03/D04.

### 2.5 MwSt-Feld

**Entscheidung:** `mwstSatz` wird pro `BestellPosition` (nicht nur einmal pro `Bestellung`) von Anfang an vorgesehen — auch wenn der MVP zunächst nur mit einem Festwert arbeitet.

**Begründung:** Steuersätze nachträglich in historische Bestelldaten einzufügen ist unsauber, da unklar bleibt, welcher Satz zum jeweiligen Zeitpunkt galt. Ein Feld pro Position (statt nur auf Bestellebene) vermeidet Probleme, sobald unterschiedlich besteuerte Artikel in einer Bestellung gemischt werden.

---

## 3. Zusammenfassung für D04 (Umsetzung in `schema.prisma`)

| Baustein | Festlegung |
|---|---|
| Kunde | Inline-Felder auf `Bestellung` (`kundeName`, `kundeTelefon`, `kundeAdresse`), kein `CrmKontakt`-Bezug |
| Zahlung/Logistik | Snapshot-Felder auf `Bestellung` (`zahlartAdapterName`, `carrierAdapterName`, `sendungsnummer` o.ä.), keine FK auf die Konfigurationstabellen aus D02 |
| Status | Enum `BestellStatus` (`NEU`, `IN_BEARBEITUNG`, `VERSANDT`, `ABGESCHLOSSEN`, `STORNIERT`) |
| Lager-Kopplung | Kein Schema-Aspekt — Vorgabe für die Service-Implementierung (D05): `BestellungService` ruft `LagerService.warenausgangBuchen()` auf |
| Steuer | `mwstSatz` als Feld auf `BestellPosition` |
| Positionen | `BestellPosition` mit `artikelId`, `menge`, `einzelpreis`, `mwstSatz` — analog zu bestehenden Positionsmodellen (`CrmAngebotPosition`, `BundlePosition`) |

**Offen für D04:** Genaue Feldbenennung/Typen an bestehende Konventionen (`Decimal @db.Decimal(...)`, `lizenznehmerId`-Filterung, `@@map`) anpassen — Basis ist die bereits erweiterte `schema.prisma` (inkl. D02-Modelle).

---

## ÄNDERUNGSHISTORIE

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 18.09.2026 | Ersterstellung — 5 Entscheidungen aus Grill-Me-Session zu D03 dokumentiert, Verdict PROCEED |
