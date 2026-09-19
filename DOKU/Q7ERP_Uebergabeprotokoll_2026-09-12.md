# Q7-ERP — Übergabeprotokoll

**Datum:** 12.09.2026
**Zweck:** Zusammenfassung der heutigen Testsession mit echten Daten — erledigte Arbeiten, offene Punkte, Empfehlung für die nächste Session.

---

## 1. Ausgangslage dieser Session

Erstmaliger Test von Q7-ERP mit **echten Geschäftsdaten** (statt Test-Lizenznehmer A/B), Ziel: Artikel, Lager, Bestellvorschlag praktisch ausprobieren und dabei auftretende Probleme sammeln.

---

## 2. Neu angelegt (Stammdaten)

| Was | Details |
|---|---|
| Lizenznehmer | **MB Group** — `id: b57929a1-e147-4900-8b5d-c132886f3793`, angelegt per SQL in pgAdmin |
| Benutzer | `mbgroupeuro@gmail.com`, Passwort `Tanger2030#`, `istSystemAdmin: true` |
| Lagerort | "Hauptlager", als Standard markiert (`istStandard: true`) |
| Artikel | **149 echte Artikel** importiert aus `D2_Artikelnummer_Doku_D2.ods` (Blätter: Artikel VM, Artikel Holz Band, Artikel Kantenband, Artikel Werkzeuge). `grundpreis` überall als Platzhalter `0` (siehe Abschnitt 5, Punkt A151). Beschreibung = Material+Oberfläche+Dicke+Format+Bemerkung zusammengefasst. Blätter "Artikelstamm" (reine Indexliste) und "Artikel mdf teile" (Zuschnittliste, vermutlich Produktionsdaten statt Stammdaten) bewusst **nicht** importiert. |

**Werkzeug:** `artikel-import.js` (Node-Script mit Login, Vorschau, Bestätigungs-Abfrage, Fehler-Report) — liegt unter `scripts/` im Backend-Projekt.

---

## 3. Erledigte Änderungen am System (diese Session)

| ID | Titel | Was wurde gemacht |
|---|---|---|
| **A153** | Artikel-Formular um `mindestbestand`/`lagerrelevant` erweitert | Beide Felder existierten im Backend (A148), fehlten aber in `artikel/neu` und `artikel/[id]/bearbeiten`. Ergänzt und **erfolgreich end-to-end getestet** (Wert gespeichert, `GET /einkauf/bestellvorschlag` zeigt korrekt fehlende Menge). |
| **A152** | Mitarbeiter konnte nicht bearbeitet werden | Ursache gefunden: Die Seite `mitarbeiter/[id]/bearbeiten/page.tsx` **existierte im Frontend gar nicht** — nur Anlegen und Löschen waren möglich. Seite neu gebaut (Felder: Name, Telefon, Vergütungsart, Vergütungsbetrag "Brutto", Provision) und **Bearbeiten-Link in der Mitarbeiter-Liste ergänzt**, der bisher komplett fehlte. Erfolgreich getestet. |
| — | Frontend-Design vereinheitlicht (Teil 1) | Sidebar (`Navigation.tsx`), Partner-Liste, Artikel-Liste/Bearbeiten/Neu, Login, Mitarbeiter-Liste auf das gemeinsame `.q7-*`-Klassensystem (`globals.css`) umgestellt. Sidebar zusätzlich neu gestaltet: heller Hintergrund statt Navy-Dunkel, abgerundete "Pillen"-Menüpunkte, goldig gefüllter aktiver Punkt, neue Ein-/Ausklapp-Funktion (Desktop). Mobile Hamburger-Logik unverändert erhalten. |
| — | CRM-Mockup erweitert | Bestehendes HTML-Mockup um eine **Kontakt-Detail-Ansicht** ergänzt (Stammdaten inkl. Typ-Feld, Aktivitäten, Wiedervorlagen, Angebote) — dient als bestätigtes Ziel-Design für den späteren CRM-Frontend-Ausbau (A154/A155). |

---

## 4. Technisches Infrastruktur-Problem gelöst

**Befund:** Port 3000 ist auf diesem Rechner **dauerhaft durch Q7** (das andere System) belegt — das führte wiederholt zu `EADDRINUSE`-Fehlern und Verwirrung, welches System gerade auf welchem Port lief. Eine `.env`-Einstellung (`PORT=3010`) allein reichte nicht, vermutlich wegen einer vorrangigen System-Umgebungsvariable.

**Lösung (diese Session umgesetzt):**
- Backend wird jetzt mit `$env:PORT="3010"; npm run start` gestartet → läuft zuverlässig auf **Port 3010**
- Frontend `package.json` fest auf **Port 3001** gesetzt (`next dev -p 3001` / `next start -p 3001`), damit es nicht mehr zufällig auf einen freien Port ausweicht
- `frontend/src/lib/api.ts` und `frontend/src/app/login/page.tsx` (hatte eine **eigene, unabhängige** Backend-Adresse fest einprogrammiert) auf `http://localhost:3010` korrigiert

**Für die nächste Session wichtig:** Backend künftig **immer** mit
```
$env:PORT="3010"
npm run start
```
starten, nicht nur mit `npm run start` — sonst versucht es wieder Port 3000 und kollidiert mit Q7.

---

## 5. Offene Punkte (gesammelt, nach Grill-Me-Session priorisiert)

| # | ID | Problem | Beschluss | Status |
|---|---|---|---|---|
| 1 | **A149** | Kein Standard-Lagerort wird automatisch angelegt, wenn ein neuer Lizenznehmer entsteht | Automatisch beim Anlegen eines Lizenznehmers mit erzeugen (Beschluss: Option B) | Offen — setzt voraus, dass geklärt wird, wo/wie Lizenznehmer künftig angelegt werden (aktuell nur per SQL) |
| 2 | **A150** | Mehrere Frontend-Seiten noch im alten Design | Reihenfolge: erst Listen-Seiten, dann Formular-Seiten | **Läuft** — erledigt: Sidebar, Partner, Artikel, Login, Mitarbeiter-Liste. **Noch offen:** Konto, Lager, CRM-Kontakt-Liste, Vorschuss, Verbindung, Zeiterfassung, sowie diverse "Neu"/"Bearbeiten"-Formulare dieser Module |
| 3 | **A151** | `grundpreis` als Pflichtfeld am Artikel passt nicht zur gewünschten Trennung "Lager-Ansicht ohne Preis" vs. "Einkaufs-Ansicht mit Preis" | Zurückgestellt für eigene Session — erst Code-Suche, wo `grundpreis` heute schon gelesen wird (Bundle-Verkauf, CRM-Angebote), bevor das Schema geändert wird | Offen, bewusst nicht heute angefasst |
| 4 | **A152** | Mitarbeiter nicht bearbeitbar | — | ✅ **Erledigt** (siehe Abschnitt 3) |
| 5 | **A153** | `mindestbestand`/`lagerrelevant` fehlten im Artikel-Formular | — | ✅ **Erledigt und getestet** (siehe Abschnitt 3) |
| 6 | **A154** | CRM-Kontakt-Formular hat kein Typ-Feld (Kunde/Interessent/Partner/Sonstige) und keine Pipeline-Status-Auswahl | Erst prüfen, ob Backend-DTO (`create-crm-kontakt.dto.ts`) `typ`/`pipelineStatus` überhaupt kennt, dann Formular ergänzen | Offen — DTO noch nicht geprüft |
| 7 | **A155** | CRM: Aktivitäten, Wiedervorlagen, Angebote existieren bereits im Backend (`CrmAktivitaetModul`, `CrmWiedervorlageModul`, `CrmAngebotModul`), aber **nicht im Frontend** sichtbar/nutzbar | Als eigener, größerer Block nach A154 angehen — Ziel-Design bereits im erweiterten Mockup festgehalten | Offen, größerer Umfang |

### Zusätzlich im Hinterkopf behalten (aus früheren Sessions, weiterhin unverändert offen)
- RLS-Policies für Lager-Tabellen (`lagerbestand`/`lagerbewegung`/`lagerort`) formal nicht verifiziert
- `bundleVerkaufBuchen()` liest weiterhin direkt aus `artikel`/`bundlePosition` (dokumentierte Abweichung von Prinzip 3.2)
- Zwei unabhängige Prisma-Services (`PrismaService` vs. `PrismaTenantService`) — noch nicht geklärt, ob beabsichtigt

---

## 6. Empfehlung für die nächste Session

1. **A154 zuerst** (klein, schnell): Backend-DTO für CRM-Kontakt prüfen, dann Typ-Feld + Pipeline-Status im Formular ergänzen
2. **A150 fortsetzen**: Konto- und Lager-Listen-Seiten ins neue Design bringen (nächstgrößte, aber risikoarme Bausteine)
3. **A149 klären**: Wie werden künftige echte Lizenznehmer angelegt (Admin-Endpunkt vorhanden oder weiterhin nur SQL)? Danach Automatik für Standard-Lagerort einbauen
4. **A155 separat einplanen**: CRM-Ausbau (Aktivitäten/Wiedervorlagen/Angebote im Frontend) ist der größte verbleibende Brocken — eigene, mehrteilige Session
5. **A151 (`grundpreis`) weiterhin zurückgestellt**, bis Zeit für die nötige Code-Suche vorhanden ist

---

## 7. Für die nächste Session mitzubringen/hochzuladen

Falls in einer neuen Chat-Session fortgesetzt wird, sind folgende Dateien hilfreich, damit nicht erneut gesucht werden muss:
- Dieses Übergabeprotokoll
- `create-crm-kontakt.dto.ts` (für A154)
- `konto/page.tsx`, `lager/page.tsx` (für A150-Fortsetzung)
- Aktuelle `schema.prisma` (falls seit dieser Session weitere Änderungen erfolgt sind)
