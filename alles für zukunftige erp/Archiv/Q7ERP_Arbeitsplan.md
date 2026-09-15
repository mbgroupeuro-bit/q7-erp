# Q7-ERP — ARBEITSPLAN (60 Min/Tag) — v5

**Zweck:** Tägliche Abarbeitungsliste bis zum Gesamtziel. Jede Aufgabe hat jetzt eine eindeutige ID (Format `Axx`), damit du im Chat einfach sagen kannst "weiter mit A35" statt den Tag suchen zu müssen.

**⚠️ Korrektur gegenüber `Q7ERP_Aufgabenliste_v6.md`:** Dort wurden für die Etappe-2-Aufgaben versehentlich dieselben Nummern (24–29) wie für die bereits erledigten Etappe-1-Aufgaben vergeben. Ab sofort gilt ausschließlich die Nummerierung in diesem Dokument (`A32` aufwärts) als verbindlich — `Q7ERP_Aufgabenliste_v6.md` bitte nicht mehr für Nummern heranziehen, nur noch dieses Dokument.

**Stand:** 11.08.2026 — Buchhaltungsmodul aus dem Ziel entfernt. Gesamtziel: Etappe 1–4.
**Hinweis zu Etappe 4:** Tagesplanung ist eine erste Einschätzung, wird bei Erreichen der Etappe verfeinert.

---

## ETAPPE 1 — Sicherheits-Fundament ✅ FERTIG (11.08.2026)

| ID | Aufgabe | Status |
|---|---|---|
| A26 | Admin-Guard für `LizenznehmerController` | ✅ erledigt |
| A27 | App-Layer-Filter zusätzlich zu RLS | ✅ erledigt |
| A28 | Platzhalter-Passwort `q7erp_app` ersetzt | ✅ erledigt |
| A29 | RLS-Ausnahme `login_benutzer_by_email()` dokumentiert | ✅ erledigt |
| A24 | Übergabeweg Q7-Verbindungsgeheimnis konzipiert | ✅ erledigt |
| A25 | Verschlüsselung at-rest für Verbindungsgeheimnis | ✅ erledigt |

---

## ETAPPE 2 — Phase 1: Kern-Datenmodell nutzbar machen 🟡 LÄUFT

### Partner-Service
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A19 | 8 | `PartnerService`-Struktur anlegen | ✅ Code fertig |
| A19a | 9 | `create()`-Methode | ✅ Code fertig |
| A19b | 10 | `findAll()`, `findOne()` | ✅ Code fertig |
| A19c | 11 | `PartnerController` (HTTP-Endpunkte) | ✅ Code fertig |
| **A32** | 12 | **Testen: Partner über Endpunkt anlegen** | ⬜ **← NÄCHSTES** |
| A33 | 13 | Testen: Mandantentrennung (A darf B's Daten nicht sehen) | ⬜ |
| A34 | 14 | `update()`/`remove()` für Partner ergänzen | ⬜ |

### Artikel-Service (Stufe 1)
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A35 | 15 | `ArtikelService`-Struktur anlegen (analog Partner) | ⬜ |
| A36 | 16 | `create()` — Stufe 1: ID, Name, Grundpreis, Einheit | ⬜ |
| A37 | 17 | `findAll()`, `findOne()` | ⬜ |
| A38 | 18 | `ArtikelController` bauen und testen | ⬜ |
| A39 | 19 | Mandantentrennung für Artikel testen | ⬜ |
| A40 | 20 | `update()`/`remove()` für Artikel ergänzen | ⬜ |

### Konto + Abschluss Phase 1
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A41 | 22 | `KontoService` anlegen | ⬜ |
| A42 | 23 | Basis-Kontenrahmen testweise befüllen | ⬜ |
| A43 | 24 | Gesamttest: Partner + Artikel + Konto zusammen | ⬜ |
| A44 | 25 | Code-Review: alle Services auf `lizenznehmerId`-Filter prüfen | ⬜ |
| A45 | 26 | Übergabeprotokoll + Master-Dokument aktualisieren, Phase 1 abschließen | ⬜ |

---

## ETAPPE 3 — Phase 2: Lager/Warenwirtschaft

### Konzeption
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A46 | 29 | Grill-Me-Session: Lagerbestand-Datenmodell | ⬜ |
| A47 | 30 | Datenmodell in `schema.prisma` ergänzen (Migration vorbereiten) | ⬜ |
| A48 | 31 | Migration ausführen, Struktur prüfen | ⬜ |
| A49 | 32 | `LagerService`-Grundgerüst anlegen | ⬜ |
| A50 | 33 | Erste Methode: Lagerbestand für Artikel abfragen | ⬜ |

### Wareneingang & Warenausgang
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A51 | 36 | `wareneingangBuchen()`-Methode bauen | ⬜ |
| A52 | 37 | Endpunkt + Test: Wareneingang buchen | ⬜ |
| A53 | 38 | `warenausgangBuchen()`-Methode bauen | ⬜ |
| A54 | 39 | Endpunkt + Test: Warenausgang buchen | ⬜ |
| A55 | 40 | Prüfen: Bestand darf nicht negativ werden | ⬜ |

### Korrekturen & Bundle-Verknüpfung
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A56 | 42 | Bestandskorrektur-Methode (z.B. Inventur) | ⬜ |
| A57 | 43 | Endpunkt + Test: Bestandskorrektur | ⬜ |
| A58 | 44 | Verknüpfung mit Bundle-Verkauf (automatische Abbuchung) | ⬜ |
| A59 | 45 | Test: Bundle-Verkauf bucht Einzelteile korrekt ab | ⬜ |
| A60 | 46 | Mandantentrennung für Lager-Modul testen | ⬜ |

### Modul-Vertrag & Abschluss
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A61 | 48 | Modul-Vertrag dokumentieren | ⬜ |
| A62 | 49 | Gesamttest: Lager-Modul End-to-End | ⬜ |
| A63 | 50 | Code-Review Lager-Modul | ⬜ |
| A64 | 51 | Übergabeprotokoll + Master-Dokument aktualisieren, Phase 2 abschließen | ⬜ |

**Nach A64 = erster "richtiger" Testlauf mit echten Geschäftsprozessen möglich.**

---

## ETAPPE 4 — Phase 3: Connector-/Adapter-Schicht
*(Tagesplanung vorläufig, wird bei Erreichen der Etappe verfeinert)*

### Konzeption & Grundgerüst
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A65 | 54 | Grill-Me-Session: einheitliches internes Datenformat für Connector | ⬜ |
| A66 | 55 | Adapter-Schnittstelle (Interface) definieren | ⬜ |
| A67 | 56 | Q7-Adapter-Grundgerüst anlegen | ⬜ |
| A68 | 57 | Verbindung zu ERP-Türsteher/Signaturprüfung herstellen | ⬜ |

### Lese-Endpunkte für Q7
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A69 | 59 | Endpunkt: Partner-Daten für Q7 exportieren | ⬜ |
| A70 | 60 | Endpunkt: Artikel-Daten für Q7 exportieren | ⬜ |
| A71 | 61 | Test: Q7-Adapter mit Signaturprüfung end-to-end | ⬜ |
| A72 | 62 | Fehlerbehandlung + Logging im Adapter | ⬜ |

### Synchronisation & Abschluss
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A73 | 64 | Domain-Event-Mechanismus einführen | ⬜ |
| A74 | 65 | Webhook-Versand an Q7 bei Partner-Änderung | ⬜ |
| A75 | 66 | Gesamttest: Q7 liest echte Daten über Connector | ⬜ |
| A76 | 67 | Mandantentrennung im Connector testen | ⬜ |
| A77 | 68 | Übergabeprotokoll + Master-Dokument aktualisieren, Phase 3 abschließen | ⬜ |

**Nach A77 = Gesamtziel (Etappe 1–4) erreicht.**

---

## GESAMTÜBERSICHT

| Etappe | Inhalt | Status |
|---|---|---|
| 1 | Sicherheits-Fundament (A24–A29) | ✅ fertig |
| 2 | Kern-Datenmodell (A19–A45) | 🟡 läuft, **aktuell: A32** |
| 3 | Lager/Warenwirtschaft (A46–A64) | ⬜ offen |
| 4 | Connector-Schicht (A65–A77) | ⬜ offen |

---

**So arbeitest du damit:** Einfach im Chat sagen "weiter mit A32" (oder die jeweils aktuelle ID) — ich weiß dann sofort, wo wir stehen, ohne dass du den Tag suchen musst.
