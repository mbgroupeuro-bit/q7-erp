# Q7-ERP — ÜBERGABEPROTOKOLL

**Zweck:** Aktueller Snapshot, um einen neuen Chat sofort mit vollem Kontext fortzusetzen. Diese Datei wird bei jeder Session überschrieben — kein Verlauf, immer nur der letzte Stand.

**Stand:** 10.08.2026, Mittag

---

## 1. WER ICH BIN / KONTEXT

Ich bin Admin (alleinige Entscheidungsinstanz) für Q7 (KI-Betriebssystem) und baue parallel **Q7-ERP** — ein eigenständiges ERP-System, das mit Q7 verbunden, aber unabhängig betreibbar ist. Terminologie-Regel: ausschließlich "Admin", niemals "GF". Ich bin Unternehmer, kein Entwickler — technische Fachbegriffe bitte einfach halten, ich brauche meist fertige Dateien statt Anleitungen zum Selbst-Zusammenbauen.

## 2. GESAMTSTAND IN EINEM SATZ

**RLS ist scharf geschaltet und verifiziert, Login läuft End-to-End** — Server läuft mit einem eingeschränkten, nicht-privilegierten DB-User (`q7erp_app`), Mandantentrennung wurde aktiv getestet (Lizenznehmer A kann nachweislich keine Daten von B sehen).

## 3. WAS ZULETZT ERLEDIGT WURDE (heute, 10.08.2026)

- **Aufgabe 23:** Seed-Skript (`prisma/seed.ts`) erstellt und ausgeführt — erster Test-Lizenznehmer ("Test GmbH") + erster Benutzer (`admin@test-gmbh.de`) angelegt. Login end-to-end getestet, JWT-Token erhalten.
- **Grill-Me vor RLS-Aktivierung** ergab: DB-Verbindung lief bisher über `postgres` (Superuser) — RLS wäre dadurch wirkungslos gewesen, ohne dass es aufgefallen wäre. **Behoben:** neuer, eingeschränkter DB-User `q7erp_app` angelegt (Passwort aktuell `q7erp_app_pw` — **Platzhalter, vor Produktivbetrieb ändern**, siehe Aufgabe 28), `.env` umgestellt, Server erfolgreich mit neuem User getestet.
- **Aufgabe 20:** `001_rls_policies.sql` neu erstellt (Original-Datei war nicht auffindbar, keine echte Version verloren gegangen — Rekonstruktion aus `schema.prisma` + Session-Variable `app.current_lizenznehmer_id` aus `PrismaTenantService`) und gegen die Datenbank ausgeführt. RLS aktiv auf allen 11 Mandanten-Tabellen (`benutzer`, `partner`, `artikel`, `artikel_merkmal`, `bundle_position`, `baustein_gruppe`, `baustein_option`, `konfigurationsregel`, `konten`, `zugriffshistorie`, `q7_verbindung`).
- **Verifikation:** `verify-rls.ts` geschrieben und ausgeführt — legt zwei Test-Lizenznehmer an, prüft aktiv, ob Lizenznehmer A Daten von B sehen kann. Ergebnis: ✅ Mandantentrennung funktioniert.
- **Rollback-Skripte vorbereitet:** `001_rls_policies_ROLLBACK.sql` liegt bereit, falls RLS je zurückgenommen werden muss.
- **Unerwarteter Folgefehler entdeckt und behoben:** Nach RLS-Aktivierung schlug der Login fehl ("E-Mail oder Passwort falsch"), obwohl Daten korrekt waren — Ursache: `AuthService` kennt beim Login noch keine `lizenznehmerId`, RLS blockierte daher jede Zeile in `benutzer`. **Lösung:** neue, eng begrenzte PostgreSQL-Funktion `login_benutzer_by_email()` (`SECURITY DEFINER`, nur ausführbar von `q7erp_app`, umgeht RLS ausschließlich für den Login-Lookup per E-Mail) — `002_login_function.sql` erstellt und ausgeführt, `auth.service.ts` entsprechend angepasst. Login danach erneut erfolgreich getestet.

## 4. WAS ALS NÄCHSTES ANSTEHT

**Direkt nächster Schritt:** Aufgabe 26 — `LizenznehmerController` mit Admin-Guard absichern. Aktuell komplett offen (kein Auth-Schutz) — jetzt höchste Priorität, weil der Server produktiv läuft und dieser Endpunkt frei erreichbar ist.

**Danach, in ungefährer Reihenfolge:**
1. Aufgabe 27: expliziten App-Layer-Filter zusätzlich zu RLS in Tenant-Services ergänzen (zweite Sicherheitsebene, RLS ist die erste)
2. Aufgabe 19: erster echter Tenant-Service (`PartnerService`/`ArtikelService`)
3. Aufgabe 28: Platzhalter-Passwort von `q7erp_app` vor Produktivbetrieb ändern
4. Aufgabe 29: `login_benutzer_by_email()`-Ausnahme im Master-Dokument dokumentieren (Abschnitt 3.6 ergänzen)
5. Übergabeweg für das Q7-Verbindungs-Geheimnis konzipieren (Aufgabe 24), Verschlüsselung at-rest (Aufgabe 25)
6. Agent XXX selbst bauen

Vollständige Liste: siehe `Q7ERP_Aufgabenliste_v5.md`.

## 5. AKTUELLE DATEIEN (jeweils neueste Version verwenden)

| Datei | Inhalt |
|---|---|
| `Q7ERP_MASTER_v4.md` | Architektur-/Technologieentscheidungen — **Aufgabe 29 offen: RLS-Ausnahme für Login noch nicht eingearbeitet** |
| `Q7ERP_Aufgabenliste_v5.md` | Offene + erledigte Aufgaben |
| `Q7ERP_Agentenkommunikation_v1.md` | Diskussionsgrundlage: OneStack-Vergleich, Zwei-Agenten-Konzept |
| `schema.prisma` | Unverändert seit v4 — enthält `Benutzer`, `Zugriffshistorie`, `Q7Verbindung` |
| `prisma/001_rls_policies.sql` | **Ausgeführt** — RLS auf allen 11 Mandanten-Tabellen aktiv |
| `prisma/001_rls_policies_ROLLBACK.sql` | Bereitliegend, falls RLS zurückgenommen werden muss |
| `prisma/002_login_function.sql` | **Ausgeführt** — `login_benutzer_by_email()`-Funktion für RLS-sicheren Login |
| `prisma/002_login_function_ROLLBACK.sql` | Bereitliegend |
| `verify-rls.ts` (Hauptordner) | RLS-Verifikationsskript, wiederverwendbar für künftige Checks |
| `src/auth/auth.service.ts` | **Aktualisiert** — nutzt jetzt `login_benutzer_by_email()` statt direktem `findUnique` |
| `.env` | `DATABASE_URL` nutzt jetzt `q7erp_app` (nicht-privilegiert) statt `postgres` |

## 6. WICHTIGE TECHNISCHE STOLPERSTEINE (für den nächsten Chat/nächste Session relevant)

- **Prisma 7:** `PrismaClient` braucht überall einen expliziten `@prisma/adapter-pg`-Adapter, keine URL mehr im Schema
- **`.env` wird von NestJS nicht automatisch geladen** — `import 'dotenv/config';` muss ganz oben in `main.ts` stehen
- **DB-User `q7erp_app` ist absichtlich kein Superuser** — falls künftig neue Tabellen mit `lizenznehmerId` entstehen: RLS-Policy + `GRANT` für `q7erp_app` nicht vergessen, sonst "keine Berechtigung"-Fehler oder (schlimmer) stille RLS-Wirkungslosigkeit falls versehentlich wieder mit `postgres` verbunden wird
- **RLS + Login-per-E-Mail ist strukturell ein Henne-Ei-Problem** — jede künftige Abfrage, die VOR Kenntnis der `lizenznehmerId` laufen muss, braucht denselben `SECURITY DEFINER`-Ansatz, nicht einfach `prisma.<table>.findUnique()`
- Beispiel-/Platzhalter-Dateien (`*.example.ts`) dürfen nicht im `src`-Ordner liegen
- **Browser-Downloads mit gleichem Dateinamen** legen teils `dateiname (1).ts` an, statt zu überschreiben — beim Ersetzen von Dateien im Projekt immer prüfen, ob eine Duplikat-Datei entstanden ist (führte heute zu einem TS6053-Compile-Fehler)

## 7. ARBEITSWEISE-REGELN FÜR DEN NEUEN CHAT

- Bei jeder inhaltlichen Änderung an Master-Dokument oder Aufgabenliste: Versionsnummer hochzählen
- Erledigte Aufgaben durchstreichen + "erledigt" markieren, nicht löschen
- Konflikte mit bestehenden Entscheidungen explizit benennen, nicht still auflösen
- Bei Unsicherheit oder mehrdeutiger Formulierung: Rückfrage stellen
- Antworten kurz und knapp halten (Admin-Präferenz)
- Admin ist Unternehmer, kein Entwickler — bei technischen Änderungen möglichst fertige, komplette Dateien liefern statt Anleitungen zum Selbst-Einbauen; Screenshots von Terminal-Ausgaben aktiv auswerten und konkrete nächste Befehle nennen
- Am Ende der Session: dieses Übergabeprotokoll mit neuem Stand überschreiben
