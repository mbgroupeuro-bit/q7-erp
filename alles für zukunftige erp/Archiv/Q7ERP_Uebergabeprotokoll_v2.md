---
agent_id: "Q7_ERP"
agent_name: "Q7_ERP_SYSTEM"
category: "knowledge"
file_id: "Q7ERP_UEBERGABEPROTOKOLL"
version: "2.1.0"
last_updated: "2026-08-15"
author: "ADMIN"
dependencies:
  - "Q7ERP_Arbeitsplan.md"
  - "Q7ERP_MASTER_v5.md"
tags:
  - "uebergabeprotokoll"
  - "lager"
  - "a58-a59"
  - "a60"
---

# Q7-ERP — ÜBERGABEPROTOKOLL

**Zweck:** Aktueller Snapshot, um einen neuen Chat sofort mit vollem Kontext fortzusetzen. Diese Datei wird bei jeder Session überschrieben — kein Verlauf, immer nur der letzte Stand.

**Stand:** 15. August 2026

---

## 1. Purpose & Scope (Zweck & Geltungsbereich)

### Wer ich bin / Kontext
Ich bin Admin (alleinige Entscheidungsinstanz) für Q7 (KI-Betriebssystem) und baue parallel **Q7-ERP** — ein eigenständiges ERP-System, das mit Q7 verbunden, aber unabhängig betreibbar ist. 
* **Terminologie-Regel:** ausschließlich "Admin", niemals "GF". 
* **Rolle & Arbeitsweise:** Ich bin Unternehmer, kein Entwickler — technische Fachbegriffe bitte einfach halten, ich brauche fertige Dateien statt Anleitungen zum Selbst-Zusammenbauen, und bei jeder Datei bitte genau sagen, wo sie hinkommt bzw. wo ich sie finde.
* **Zielabgrenzung:** **Buchhaltungsmodul ist NICHT mehr Teil des Ziels** — Gesamtziel ist Etappe 1–4 (Sicherheits-Fundament, Kern-Datenmodell, Lager, Connector).

---

## 2. Trigger & Context (Auslöser & Kontext)

### Gesamtstand in einem Satz
**Etappe 1 & Phase 3 (Lager-Modul) weit vorangeschritten; Aufgaben A58 & A59 (Bundle-Verkauf / Abbuchung von Stücklisten) sind vollständig implementiert, per SQL-Data-Setup vorbereitet und im End-to-End-Test erfolgreich validiert.**

### Aktuelle Aufgaben-ID: A60 (Nächste Aufgabe)
* **Verbindliche ID-Quelle:** Ab sofort gilt ausschließlich `Q7ERP_Arbeitsplan.md` für Aufgaben-Nummern (Format `Axx`).
* **Status A58 & A59:**
  * **A58 (Code & Endpunkt):** DTO `bundle-verkauf.dto.ts` erstellt, `lager.controller.ts` und `lager.service.ts` um den Endpunkt `@Post('bundle-verkauf')` erweitert.
  * **A59 (Test & Validierung):** 
    * Test-Daten für Bundle (`istBundle = true`) und zugehörige Stückliste (`BundlePosition`: 2x Schraube M6, 1x Dübel 8mm) per SQL in pgAdmin direkt in der Datenbank angelegt.
    * Test-Aufruf `POST /lager/bundle-verkauf` für 5 Bundles erfolgreich durchgeführt.
    * Ergebnis: Bestandteile wurden korrekt in der DB abgebucht (Schraube M6 von 100 auf 90; Dübel 8mm von 100 auf 95).
* **Nächster Schritt:** Start von **Aufgabe A60** gemäß Arbeitsplan.

---

## 3. Execution Rules & Logic (Regeln & Ausführungslogik)

### 3.1 Was zuletzt erledigt wurde
* **Etappe 1 komplett abgeschlossen:** Admin-Guard, App-Layer-Filter, Passwort-Rotation, RLS-Ausnahme dokumentiert, Verschlüsselung at-rest.
* **Partner-Modul & Grundfunktionen erledigt.**
* **Lager-Modul (A58 & A59):**
  * `bundle-verkauf.dto.ts` angelegt und eingebunden.
  * `lager.controller.ts` um die `@Post('bundle-verkauf')`-Route erweitert.
  * Stücklisten-Verknüpfung via SQL (`UPDATE "Artikel"`, `INSERT INTO "BundlePosition"`) hergestellt.
  * End-to-End-Abbuchungstest erfolgreich ausgeführt und Bestandsänderung verifiziert.

### 3.2 Aktuelle Dateistruktur (Lager-Modul Focus)
* `Q7ERP_MASTER_v5.md` — Aktuellste Version des Master-Dokuments
* `Q7ERP_Arbeitsplan.md` — **MASSGEBLICH für Aufgaben-IDs** (`A19`–`A77`)
* `src/lager/dto/bundle-verkauf.dto.ts` — DTO für Bundle-Verkäufe
* `src/lager/lager.controller.ts` — Inkl. `@Post('bundle-verkauf')`
* `src/lager/lager.service.ts` — Inkl. Logik für automatische Bestandsabbuchung von Bundle-Bestandteilen
* `src/lager/lager.module.ts` — Modul-Registrierung

### 3.3 MUST Requirements (Do's) & Richtlinien
* Aufgaben-IDs ausschließlich aus `Q7ERP_Arbeitsplan.md` (Format `Axx`) verwenden.
* Antworten kurz, präzise und direkt halten.
* Bei jeder Dateianpassung den exakten Pfad / Ordner mit angeben.
* Fertigen Code liefern, nicht nur Anleitungen.

---

## 4. Input / Output Schema (Eingabe / Ausgabe Formate)

### Test-Aufruf (PowerShell)
```powershell
$bundleVerkauf = @{ artikelId = "7acb0b1c-449d-4261-9c7c-d216ad964eed"; menge = 5 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/lager/bundle-verkauf" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $bundleVerkauf
```

### Response-Schema
```json
{
  "bundleArtikelId": "7acb0b1c-449d-4261-9c7c-d216ad964eed",
  "verkaufteMenge": 5,
  "abgebuchteBestandteile": [
    { "artikelId": "9473db91-e0a7-4caa-8ada-d133d97dccd9", "menge": 10 },
    { "artikelId": "ffbf9d22-c4e3-484c-9f8c-e018fb3a3ffe", "menge": 5 }
  ]
}
```

---

## 5. Escalation & Fallback (Eskalation & Ausnahmeregeln)

* **404 Not Found bei Serveraufrufen:** Prüfen, ob NestJS neu kompiliert hat; ggf. `npm run start:dev` neu starten.
* **Unvollständige DTOs/Routen:** Prüfung via PowerShell `Select-String -Path "..." -Pattern "..."`.
* **Fehlende UI/Endpunkte für Stammdaten (Stufe 3):** Direktes SQL-Insert via pgAdmin als schneller Fallback für Tests nutzen.
