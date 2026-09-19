# Q7-ERP — ARBEITSPLAN (60 Min/Tag) — v6

**Zweck:** Tägliche Abarbeitungsliste bis zum Gesamtziel. Jede Aufgabe hat jetzt eine eindeutige ID (Format `Axx`), damit du im Chat einfach sagen kannst "weiter mit A35" statt den Tag suchen zu müssen.

**⚠️ Korrektur gegenüber `Q7ERP_Aufgabenliste_v6.md`:** Dort wurden für die Etappe-2-Aufgaben versehentlich dieselben Nummern (24–29) wie für die bereits erledigten Etappe-1-Aufgaben vergeben. Ab sofort gilt ausschließlich die Nummerierung in diesem Dokument (`A32` aufwärts) als verbindlich — `Q7ERP_Aufgabenliste_v6.md` bitte nicht mehr für Nummern heranziehen, nur noch dieses Dokument.

**Stand:** 16.08.2026 — Etappe 3 (Lager/Warenwirtschaft) vollständig abgeschlossen. Gesamtziel: Etappe 1–4.
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

## ETAPPE 2 — Phase 1: Kern-Datenmodell nutzbar machen ✅ FERTIG

### Partner-Service
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A19 | 8 | `PartnerService`-Struktur anlegen | ✅ erledigt |
| A19a | 9 | `create()`-Methode | ✅ erledigt |
| A19b | 10 | `findAll()`, `findOne()` | ✅ erledigt |
| A19c | 11 | `PartnerController` (HTTP-Endpunkte) | ✅ erledigt |
| A32 | 12 | Testen: Partner über Endpunkt anlegen | ✅ erledigt |
| A33 | 13 | Testen: Mandantentrennung (A darf B's Daten nicht sehen) | ✅ erledigt |
| A34 | 14 | `update()`/`remove()` für Partner ergänzen | ✅ erledigt |

### Artikel-Service (Stufe 1)
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A35 | 15 | `ArtikelService`-Struktur anlegen (analog Partner) | ✅ erledigt |
| A36 | 16 | `create()` — Stufe 1: ID, Name, Grundpreis, Einheit | ✅ erledigt |
| A37 | 17 | `findAll()`, `findOne()` | ✅ erledigt |
| A38 | 18 | `ArtikelController` bauen und testen | ✅ erledigt |
| A39 | 19 | Mandantentrennung für Artikel testen | ✅ erledigt |
| A40 | 20 | `update()`/`remove()` für Artikel ergänzen | ✅ erledigt |

### Konto + Abschluss Phase 1
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A41 | 22 | `KontoService` anlegen | ✅ erledigt |
| A42 | 23 | Basis-Kontenrahmen testweise befüllen | ✅ erledigt |
| A43 | 24 | Gesamttest: Partner + Artikel + Konto zusammen | ✅ erledigt |
| A44 | 25 | Code-Review: alle Services auf `lizenznehmerId`-Filter prüfen | ✅ erledigt |
| A45 | 26 | Übergabeprotokoll + Master-Dokument aktualisieren, Phase 1 abschließen | ✅ erledigt |

---

## ETAPPE 3 — Phase 2: Lager/Warenwirtschaft ✅ FERTIG (16.08.2026)

### Konzeption
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A46 | 29 | Grill-Me-Session: Lagerbestand-Datenmodell | ✅ erledigt |
| A47 | 30 | Datenmodell in `schema.prisma` ergänzen (Migration vorbereiten) | ✅ erledigt |
| A48 | 31 | Migration ausführen, Struktur prüfen | ✅ erledigt |
| A49 | 32 | `LagerService`-Grundgerüst anlegen | ✅ erledigt |
| A50 | 33 | Erste Methode: Lagerbestand für Artikel abfragen | ✅ erledigt |

### Wareneingang & Warenausgang
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A51 | 36 | `wareneingangBuchen()`-Methode bauen | ✅ erledigt |
| A52 | 37 | Endpunkt + Test: Wareneingang buchen | ✅ erledigt |
| A53 | 38 | `warenausgangBuchen()`-Methode bauen | ✅ erledigt |
| A54 | 39 | Endpunkt + Test: Warenausgang buchen | ✅ erledigt |
| A55 | 40 | Prüfen: Bestand darf nicht negativ werden | ✅ erledigt |

### Korrekturen & Bundle-Verknüpfung
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A56 | 42 | Bestandskorrektur-Methode (z.B. Inventur) | ✅ erledigt |
| A57 | 43 | Endpunkt + Test: Bestandskorrektur | ✅ erledigt |
| A58 | 44 | Verknüpfung mit Bundle-Verkauf (automatische Abbuchung) | ✅ erledigt |
| A59 | 45 | Test: Bundle-Verkauf bucht Einzelteile korrekt ab | ✅ erledigt |
| A60 | 46 | Mandantentrennung für Lager-Modul testen | ✅ erledigt (IDOR-Bug gefunden + gefixt) |

### Modul-Vertrag & Abschluss
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A61 | 48 | Modul-Vertrag dokumentieren | ✅ erledigt (`Q7ERP_Modulvertrag_Lager_v1.md`) |
| A62 | 49 | Gesamttest: Lager-Modul End-to-End | ✅ erledigt (Teil 1 + Teil 2 inkl. Bundle-Verkauf) |
| A62b | — | *(Zwischenaufgabe, nicht ursprünglich geplant)* Bundle-Anlage-Endpunkte ergänzen (`istBundle`-Feld + `POST /artikel/:id/bundle-positionen`) | ✅ erledigt |
| A63 | 50 | Code-Review Lager-Modul | ✅ erledigt (`Q7ERP_CodeReview_Lager_v1.md`, keine Sicherheitsfunde) |
| A64 | 51 | Übergabeprotokoll + Master-Dokument aktualisieren, Phase 2 abschließen | ✅ erledigt |

**Nach A64 = erster "richtiger" Testlauf mit echten Geschäftsprozessen möglich.**

---

## ETAPPE 4 — Phase 3: Connector-/Adapter-Schicht 🟡 NÄCHSTE ETAPPE
*(Tagesplanung vorläufig, wird bei Erreichen der Etappe verfeinert)*

### Konzeption & Grundgerüst
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| A65 | 54 | Grill-Me-Session: einheitliches internes Datenformat für Connector | ✅ erledigt (Envelope-Format, siehe Master-Dok 3.4.1) |
| A66 | 55 | Adapter-Schnittstelle (Interface) definieren | ✅ erledigt (siehe Master-Dok 3.4.2) |
| A67 | 56 | Q7-Adapter-Grundgerüst anlegen | ✅ erledigt (`connector-types.ts`, `q7.adapter.ts` — **ungetestet**, siehe Master-Dok 3.4.3) |
| A68 | 57 | Verbindung zu ERP-Türsteher/Signaturprüfung herstellen | ✅ erledigt (`signatur.service.ts` getestet, `q7-verbindung.repository.ts` — 2 offene Platzhalter: Entschlüsselung + `withExplicitTenantContext()` noch einzufügen, siehe Master-Dok 3.7.2) |

### Lese-Endpunkte für Q7
| ID | Tag | Aufgabe | Status |
|---|---|---|---|
| **A69** | 59 | **Endpunkt: Partner-Daten für Q7 exportieren** | ✅ erledigt (**inkl. Korrektur**: Doppelarbeit mit bestehendem `erp-tuersteher`-Modul entdeckt und bereinigt, siehe Master-Dok 3.4.4/3.7.2) |
| **A70** | 60 | **Endpunkt: Artikel-Daten für Q7 exportieren** | ⬜ **← NÄCHSTES** |
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
| 2 | Kern-Datenmodell (A19–A45) | ✅ fertig |
| 3 | Lager/Warenwirtschaft (A46–A64, inkl. A62b) | ✅ fertig |
| 4 | Connector-Schicht (A65–A77) | 🟡 läuft, **aktuell: A70** |

---

**Offene Punkte für Etappe 4 im Hinterkopf (aus A63/A61):**
- RLS-Policies für Lager-Tabellen noch nicht verifiziert
- `bundleVerkaufBuchen()` liest direkt aus Artikel-Modul-Tabellen (Kopplungsfrage weiterhin offen)
- Aus A65: Wiederverwendbarkeit des Envelope-Formats für A73 (Domain Events) noch nicht praktisch verifiziert — bei A73 prüfen
- Aus A66: Feature-Flag-Abgleich (welche `EntityType`s pro Lizenznehmer freigeschaltet) muss in der Connector-Schicht implementiert werden, nicht im Adapter selbst — bei A67/A68 mitdenken
- Aus A67/A68: Gesamter Connector-Code **erfolgreich mit `npx tsc --noEmit` compiliert** (16.08.2026, fehlerfrei) — Compiler-Prüfung erledigt, keine Laufzeit-/DB-Tests
- **Aus A69 (wichtig): `signatur.service.ts` und `q7-tuersteher.middleware.ts` sind verworfen** — bestehendes `erp-tuersteher`-Modul wird stattdessen genutzt. Bei künftigen Sicherheits-/Krypto-Aufgaben zuerst `src/erp-tuersteher/` prüfen, bevor neu gebaut wird.
- Aus A69: Middleware-Registrierung (`consumer.apply(...)`) noch nicht ins echte Modul eingetragen — Datei liegt nicht vor
- Aus A69: Zwei unabhängige Prisma-Services (`PrismaService`/`PrismaTenantService`) im Projekt — bei nächstem Code-Review klären, ob beabsichtigt

**So arbeitest du damit:** Einfach im Chat sagen "weiter mit A70" (oder die jeweils aktuelle ID) — ich weiß dann sofort, wo wir stehen, ohne dass du den Tag suchen musst.
