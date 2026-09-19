# Q7-ERP — ÜBERGABEPROTOKOLL

**Zweck:** Aktueller Snapshot, um einen neuen Chat sofort mit vollem Kontext fortzusetzen. Diese Datei wird bei jeder Session überschrieben — kein Verlauf, immer nur der letzte Stand.

**Stand:** 11.08.2026, spät abends

---

## 1. WER ICH BIN / KONTEXT

Ich bin Admin (alleinige Entscheidungsinstanz) für Q7 (KI-Betriebssystem) und baue parallel **Q7-ERP** — ein eigenständiges ERP-System, das mit Q7 verbunden, aber unabhängig betreibbar ist. Terminologie-Regel: ausschließlich "Admin", niemals "GF". Ich bin Unternehmer, kein Entwickler — technische Fachbegriffe bitte einfach halten, ich brauche fertige Dateien statt Anleitungen zum Selbst-Zusammenbauen, und bei jeder Datei bitte genau sagen, wo sie hinkommt bzw. wo ich sie finde.

## 2. GESAMTSTAND IN EINEM SATZ

**Etappe 1 (Sicherheits-Fundament) komplett fertig. Etappe 2 (Kern-Datenmodell) gestartet — Aufgabe 19 (`PartnerService`) ist code-fertig, aber noch NICHT im laufenden Server getestet.**

## 3. WAS ZULETZT ERLEDIGT WURDE (11.08.2026)

- **Etappe 1 komplett abgeschlossen** (Aufgabe 24–29) — siehe vorheriger Protokoll-Stand, hier nur kurz: Admin-Guard, App-Layer-Filter, Passwort-Rotation, RLS-Ausnahme dokumentiert, Übergabeweg konzipiert, Verschlüsselung at-rest umgesetzt. Alles End-to-End getestet.
- **Partner-Modul (Aufgabe 19) begonnen — Besonderheit: Code wurde in einem ANDEREN Chat vorbereitet**, hier in diesem Chat gegen den aktuellen Projektstand geprüft und zwei Korrekturen vorgenommen:
  1. **`app.module.ts`:** `PartnerModule` fehlte komplett in `imports: [...]` — ohne diese Korrektur wären die `/partner`-Routen gar nicht erreichbar gewesen. Ergänzt.
  2. **`partner.service.ts`:** Das DTO verwendet Feldnamen `strasse`, `plz`, `ort`, `land`, das Prisma-Schema verwendet aber `adresseStrasse`, `adressePlz`, `adresseOrt`, `adresseLand` (mit Präfix). Die ursprüngliche Version aus dem anderen Chat hat diese Felder beim Speichern schlicht weggelassen (kein Fehler, aber unvollständige Daten) — jetzt korrekt zugeordnet.
  3. **Geprüft, unproblematisch:** `withTenantContext()` wurde in diesem Chat (Aufgabe 27) auf zwei Callback-Parameter erweitert; der Partner-Code aus dem anderen Chat nutzt noch die einparametrige Schreibweise — das ist in TypeScript unproblematisch (überzählige Parameter werden ignoriert), kein Fix nötig.
  4. **Geprüft, unproblematisch:** `TenancyMiddleware` läuft über `forRoutes('*')` mit gezielten Ausnahmen; `/partner` ist nicht ausgeschlossen, läuft also automatisch korrekt mit durch.
  5. **`jwt-auth.guard.ts`** existierte bereits, geprüft — Standard-Passport-Setup, passt zum bestehenden `AuthModule`.

**Vollständige Dateiliste Partner-Modul (6 Dateien insgesamt):**
- `src/partner/dto/create-partner.dto.ts` — unverändert übernommen
- `src/partner/partner.module.ts` — unverändert übernommen
- `src/partner/partner.controller.ts` — unverändert übernommen (POST/GET `/partner`, GET `/partner/:id`, abgesichert über `JwtAuthGuard`)
- `src/partner/partner.service.ts` — **korrigiert** (Adressfelder-Zuordnung)
- `src/app.module.ts` — **korrigiert** (`PartnerModule` ergänzt)
- `src/auth/jwt-auth.guard.ts` — bereits vorhanden, unverändert

## 4. WAS ALS NÄCHSTES ANSTEHT

**Sofort nächster Schritt (noch nicht durchgeführt, kein Status "erledigt"!):**
1. Alle 6 Dateien im Projekt ablegen (falls noch nicht vollständig geschehen)
2. Server neu starten (`npm run start:dev`) — muss fehlerfrei durchlaufen
3. End-to-End-Test: `POST /partner` mit Admin-Token → Partner anlegen
4. `GET /partner` → angelegten Partner in der Liste sehen
5. `GET /partner/:id` → einzelnen Partner abrufen
6. Mandantentrennung testen (Aufgabenliste-Punkt, Tag 13 laut Arbeitsplan) — noch offen

**Danach laut Arbeitsplan (Etappe 2, Woche 3):**
- `ArtikelService` analog zu `PartnerService` aufbauen (Artikel-Stufe 1: ID, Name, Grundpreis, Einheit)

Vollständiger Plan: siehe `Q7ERP_Arbeitsplan.md`. Vollständige Aufgabenliste: siehe `Q7ERP_Aufgabenliste_v6.md` (neu, siehe unten).

## 5. AKTUELLE DATEIEN (jeweils neueste Version verwenden)

| Datei | Inhalt |
|---|---|
| `Q7ERP_MASTER_v5.md` | Aktuellste Version, Etappe 1 vollständig eingearbeitet |
| `Q7ERP_Aufgabenliste_v6.md` | **NEU** — Etappe 1 als erledigt markiert, Etappe 2 (Partner/Artikel/Konto) ergänzt |
| `Q7ERP_Arbeitsplan.md` | Etappe 1 grün, Etappe 2 läuft (Tag 8) |
| `src/partner/dto/create-partner.dto.ts` | Partner-DTO |
| `src/partner/partner.module.ts` | Partner-Modul-Registrierung |
| `src/partner/partner.controller.ts` | REST-Endpunkte `/partner` |
| `src/partner/partner.service.ts` | **Korrigiert** — Adressfelder jetzt korrekt zugeordnet |
| `src/app.module.ts` | **Korrigiert** — `PartnerModule` in `imports` ergänzt |

## 6. WICHTIGE TECHNISCHE STOLPERSTEINE (für den nächsten Chat/nächste Session relevant)

*(Alle Punkte aus vorherigem Protokoll weiterhin gültig, siehe Archiv — hier nur neue Punkte:)*

- **Code aus anderen Chats/Sessions immer gegen den aktuellen Projektstand prüfen, bevor er übernommen wird** — insbesondere, wenn zwischenzeitlich zentrale Bausteine (wie `PrismaTenantService`) in DIESEM Chat verändert wurden. Ein anderer Chat kennt diese Änderungen nicht und kann auf einem veralteten Stand aufbauen.
- **DTO-Feldnamen vs. Prisma-Schema-Feldnamen können abweichen**, ohne dass ein Compile-Fehler entsteht (z.B. `strasse` im DTO vs. `adresseStrasse` im Schema) — TypeScript prüft nur, ob die im `data:`-Objekt verwendeten Schema-Feldnamen stimmen, nicht ob alle DTO-Felder tatsächlich verwendet werden. Immer manuell gegenprüfen, dass alle relevanten DTO-Felder auch wirklich gespeichert werden.
- **Neue Feature-Module müssen explizit in `app.module.ts` unter `imports: [...]` eingetragen werden** — sonst existieren die Routen schlicht nicht, ohne dass es einen offensichtlichen Fehler gibt (Server startet trotzdem fehlerfrei, der Endpunkt liefert nur 404).

## 7. ARBEITSWEISE-REGELN FÜR DEN NEUEN CHAT

- Bei jeder inhaltlichen Änderung an Master-Dokument oder Aufgabenliste: Versionsnummer hochzählen
- Erledigte Aufgaben durchstreichen + "erledigt" markieren, nicht löschen
- Konflikte mit bestehenden Entscheidungen explizit benennen, nicht still auflösen
- Bei Unsicherheit oder mehrdeutiger Formulierung: Rückfrage stellen
- Antworten kurz und knapp halten (Admin-Präferenz)
- Admin ist Unternehmer, kein Entwickler — bei technischen Änderungen fertige, komplette Dateien liefern statt Anleitungen zum Selbst-Einbauen; bei jeder Datei genauen Zielordner/Dateipfad angeben; Screenshots von Terminal-/Tool-Ausgaben aktiv auswerten und konkrete nächste Schritte nennen
- Passwörter/Secrets: neue Werte in KeePassXC ablegen, nie in Klartext-Notizen; bei versehentlicher Klartext-Anzeige (z.B. im Chat) Empfehlung aussprechen, den Wert zeitnah neu zu setzen
- **Code aus anderen Chats/Quellen:** immer erst gegen aktuellen Stand der zentralen Bausteine (`PrismaTenantService`, `app.module.ts`, `schema.prisma`) prüfen, bevor er übernommen wird — nicht ungeprüft ablegen lassen
- Am Ende der Session: dieses Übergabeprotokoll mit neuem Stand überschreiben
