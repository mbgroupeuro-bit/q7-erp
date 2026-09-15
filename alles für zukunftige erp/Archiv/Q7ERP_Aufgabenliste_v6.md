# Q7-ERP — AUFGABENLISTE v6

**Zweck:** Vollständige Liste aller Aufgaben — erledigt und offen. Ergänzt `Q7ERP_Arbeitsplan.md` um Details je Aufgabe.
**Stand:** 11.08.2026

---

## ✅ ERLEDIGTE AUFGABEN

| # | Aufgabe | Erledigt am | Bemerkung |
|---|---|---|---|
| — | ERP-Türsteher + Signaturprüfung implementiert | 09.08.2026 | Reaktion auf Grill-Me-Review |
| — | Prisma-7-Laufzeitanpassungen | 09.08.2026 | Adapter-Pattern, `dotenv/config` |
| 26 | Admin-Guard für `LizenznehmerController` | 11.08.2026 | End-to-End getestet, inkl. Migrationsreparatur |
| 27 | App-Layer-Filter zusätzlich zu RLS | 11.08.2026 | `PrismaTenantService` hart abgesichert |
| 28 | Platzhalter-Passwort `q7erp_app` ersetzt | 11.08.2026 | Neues Passwort via KeePassXC |
| 29 | RLS-Ausnahme `login_benutzer_by_email()` dokumentiert | 11.08.2026 | Master-Dokument 3.6.1 |
| 24 | Übergabeweg Q7-Verbindungsgeheimnis konzipiert | 11.08.2026 | Entscheidung: manuell jetzt (3.7.3) |
| 25 | Verschlüsselung at-rest für Verbindungsgeheimnis | 11.08.2026 | AES-256-GCM, `VerschluesselungService` |
| 19 | `PartnerService` — Code erstellt | 11.08.2026 | **Code-fertig, NOCH NICHT getestet** — siehe Aufgabe 19a |

---

## 🟡 IN ARBEIT / DIREKT NÄCHSTES

| # | Aufgabe | Details |
|---|---|---|
| 19a | Partner-Modul End-to-End testen | Server starten, `POST/GET /partner` mit Postman/curl testen, Mandantentrennung prüfen (Lizenznehmer A darf B's Partner nicht sehen) |

---

## ⬜ OFFENE AUFGABEN (Etappe 2 — Kern-Datenmodell)

| # | Aufgabe | Bezug |
|---|---|---|
| 20 | Update-/Lösch-Funktion für `PartnerService` ergänzen (`update`, `remove`) | Arbeitsplan Tag 20 |
| 21 | `ArtikelService` analog zu `PartnerService` anlegen | Arbeitsplan Tag 15 |
| 22 | Artikel anlegen (Stufe 1: ID, Name, Grundpreis, Einheit) | Arbeitsplan Tag 16 |
| 23 | Artikel abrufen (`findAll`, `findOne`) | Arbeitsplan Tag 17 |
| 24 (neu) | `ArtikelController` bauen und testen | Arbeitsplan Tag 18 |
| 25 (neu) | Mandantentrennung für Artikel testen | Arbeitsplan Tag 19 |
| 26 (neu) | Update-/Lösch-Funktion für Artikel ergänzen | Arbeitsplan Tag 20 |
| 27 (neu) | `KontoService` analog anlegen | Arbeitsplan Tag 22 |
| 28 (neu) | Basis-Kontenrahmen testweise befüllen | Arbeitsplan Tag 23 |
| 29 (neu) | Gesamttest: Partner + Artikel + Konten zusammen | Arbeitsplan Tag 24 |
| 30 (neu) | Code-Review: alle Services auf fehlenden `lizenznehmerId`-Filter prüfen | Arbeitsplan Tag 25 |
| 31 (neu) | Übergabeprotokoll + Master-Dokument aktualisieren, Phase 1 abschließen | Arbeitsplan Tag 26 |

---

## ⬜ SPÄTER (Etappe 3–5, noch nicht detailliert geplant)

- Lager/Warenwirtschaft-Modul (Referenzimplementierung, Etappe 3)
- Connector-/Adapter-Schicht (Etappe 4)
- Buchhaltungsmodul (Etappe 5)
- Automatisierter Setup-Endpunkt für Q7-Verbindungsgeheimnis (vorgemerkt, Master-Dokument 3.7.3 — erst bei mehreren echten Lizenznehmern)
- Automatisierte Tests für Mandantentrennung (Master-Dokument 3.6, Maßnahme 3 — vorgesehen sobald mehrere Tenant-Services existieren)

---

**Pflege-Hinweis:** Diese Datei bei jeder größeren Änderung aktualisieren und Versionsnummer im Dateinamen hochzählen, analog zum Master-Dokument.
