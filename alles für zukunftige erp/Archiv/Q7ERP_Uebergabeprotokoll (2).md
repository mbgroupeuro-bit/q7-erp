# Q7-ERP — ÜBERGABEPROTOKOLL

**Zweck:** Aktueller Snapshot, um einen neuen Chat sofort mit vollem Kontext fortzusetzen. Diese Datei wird bei jeder Session überschrieben — kein Verlauf, immer nur der letzte Stand. (Verlauf liegt stattdessen in der Aufgabenliste — erledigte Punkte bleiben dort durchgestrichen stehen — und in der Änderungshistorie des Master-Dokuments.)

**Stand:** 09.08.2026, Abend

---

## 1. WER ICH BIN / KONTEXT

Ich bin Admin (alleinige Entscheidungsinstanz) für Q7 (KI-Betriebssystem) und baue parallel **Q7-ERP** — ein eigenständiges ERP-System, das mit Q7 verbunden, aber unabhängig betreibbar ist. Terminologie-Regel: ausschließlich "Admin", niemals "GF". Ich bin Unternehmer, kein Entwickler — technische Fachbegriffe bitte einfach halten, ich brauche meist fertige Dateien statt Anleitungen zum Selbst-Zusammenbauen.

## 2. GESAMTSTAND IN EINEM SATZ

**Der NestJS-Server startet zum ersten Mal fehlerfrei end-to-end** (09.08.2026, `Nest application successfully started`) — Auth (JWT), Tenancy-Middleware, RLS-Code, ERP-Türsteher und Signaturprüfung sind vollständig implementiert und kompilieren sauber. RLS-SQL läuft aber noch nicht gegen die produktive Datenbank, und es wurde noch kein echter Login getestet.

## 3. WAS ZULETZT ERLEDIGT WURDE (heute, 09.08.2026)

- **Grill-Me-Review** der Vortag-Entscheidungen durchgeführt — 5 kritische Punkte identifiziert (fehlender App-Layer-Filter neben RLS, Transaktion-pro-Request-Skalierung, doppelte JWT-Prüfung, offener `LizenznehmerController`, unausgereiftes Live-Agent-Konzept)
- **ERP-Türsteher** entwickelt: deterministischer Guard vor dem künftigen "Agent XXX", prüft Replay, Rate-Limit, IP-Anomalien; protokolliert in neuer Tabelle `zugriffshistorie`; sendet bei Verdacht E-Mail an separate, Q7-unabhängige `sicherheitsEmail`
- **Zweiter Grill-Me** auf den Türsteher: aufgedeckt, dass IP-/Replay-Prüfung allein die Hauptbedrohung (kompromittiertes Q7) nicht abdeckt
- **Signaturprüfung (HMAC-SHA256)** ergänzt: neue Tabelle `q7_verbindung` mit geteiltem Geheimnis pro Lizenznehmer, läuft als Schritt 0 vor allen anderen Türsteher-Checks
- **Vollständige lokale Einrichtung durchgeführt** (gemeinsam Schritt für Schritt): `schema.prisma` um `Benutzer`, `Zugriffshistorie`, `Q7Verbindung` erweitert, zwei Migrationen ausgeführt, `app.module.ts` verdrahtet, mehrere Prisma-7-spezifische Laufzeitfehler behoben (PrismaClient braucht jetzt expliziten Adapter statt URL im Schema; `dotenv/config` musste in `main.ts` ergänzt werden, da NestJS die `.env` sonst nicht lädt)
- Diverse Compile-Fehler behoben: fehlende Pakete (`class-validator`, `class-transformer`, `nodemailer`, `@prisma/adapter-pg`, `pg`, `dotenv`), TypeScript-Strenge bei `JWT_SECRET`, versehentlich mitkopierte Beispiel-Dateien entfernt
- **Ergebnis:** Server läuft, alle Module (AuthModule, LizenznehmerModule, ErpTuersteherModule) laden fehlerfrei, alle Routen sind gemappt

## 4. WAS ALS NÄCHSTES ANSTEHT

**Direkt nächster Schritt:** Ersten Lizenznehmer + Benutzer anlegen, Login End-to-End testen (Aufgabe 23) — noch nicht gemacht, Admin war für heute fertig.

**Danach, in ungefährer Reihenfolge:**
1. `001_rls_policies.sql` gegen die Datenbank ausführen (Aufgabe 20 — Code fertig, aber noch nicht ausgeführt!)
2. Sicherheitslücken aus Grill-Me schließen: `LizenznehmerController` absichern (Aufgabe 26), expliziten App-Layer-Filter zusätzlich zu RLS ergänzen (Aufgabe 27)
3. Aufgabe 19: erster echter Tenant-Service (`PartnerService`/`ArtikelService`)
4. Übergabeweg für das Q7-Verbindungs-Geheimnis konzipieren (Aufgabe 24), Verschlüsselung at-rest (Aufgabe 25)
5. Agent XXX selbst bauen (existiert bisher nur als Konzept + Türsteher davor)

Vollständige Liste: siehe `Q7ERP_Aufgabenliste_v4.md`.

## 5. AKTUELLE DATEIEN (jeweils neueste Version verwenden)

| Datei | Inhalt |
|---|---|
| `Q7ERP_MASTER_v4.md` | Alle Architektur-/Technologieentscheidungen, inkl. Türsteher (3.7.2) |
| `Q7ERP_Aufgabenliste_v4.md` | Offene + erledigte Aufgaben |
| `Q7ERP_Agentenkommunikation_v1.md` | Diskussionsgrundlage: OneStack-Vergleich, Zwei-Agenten-Konzept |
| `Q7_Aenderung_2.md` | Q7-Governance-Entscheidung A15/A16/A17 |
| `schema.prisma` | Produktiv migriert, enthält jetzt: Kern-Tabellen, `Benutzer`, `Zugriffshistorie`, `Q7Verbindung` |
| `001_rls_policies.sql` | **Noch nicht gegen die DB ausgeführt** — höchste Priorität für nächste Session |
| lokale Ordner `src\auth`, `src\common\tenancy`, `src\common\prisma`, `src\lizenznehmer`, `src\erp-tuersteher` | Vollständig eingerichtet und lauffähig |

## 6. WICHTIGE TECHNISCHE STOLPERSTEINE (für den nächsten Chat/nächste Session relevant)

- **Prisma 7:** `PrismaClient` braucht überall einen expliziten `@prisma/adapter-pg`-Adapter, keine URL mehr im Schema — bei jeder neuen Stelle, die `new PrismaClient()` aufruft, dran denken
- **`.env` wird von NestJS nicht automatisch geladen** — `import 'dotenv/config';` muss ganz oben in `main.ts` stehen
- Beispiel-/Platzhalter-Dateien (`*.example.ts`) dürfen nicht im `src`-Ordner liegen, sonst werden sie mitkompiliert und werfen Fehler

## 7. ARBEITSWEISE-REGELN FÜR DEN NEUEN CHAT

- Bei jeder inhaltlichen Änderung an Master-Dokument oder Aufgabenliste: Versionsnummer hochzählen (v4 → v5 → ...)
- Erledigte Aufgaben durchstreichen + "erledigt" markieren, nicht löschen
- Konflikte mit bestehenden Entscheidungen explizit benennen, nicht still auflösen
- Bei Unsicherheit oder mehrdeutiger Formulierung: Rückfrage stellen
- Antworten kurz und knapp halten (Admin-Präferenz)
- Admin ist Unternehmer, kein Entwickler — bei technischen Änderungen möglichst fertige, komplette Dateien liefern statt Anleitungen zum Selbst-Einbauen; Screenshots von Terminal-Ausgaben aktiv auswerten und konkrete nächste Befehle nennen
- Am Ende der Session: dieses Übergabeprotokoll mit neuem Stand überschreiben
