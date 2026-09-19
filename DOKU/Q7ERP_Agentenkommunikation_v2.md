# Q7-ERP — AGENTENKOMMUNIKATION (v2 — Admin-Entscheidungen final)

**Version:** 2
**Datum:** 21.08.2026
**Änderungen seit v1:** Fragen 1–3 aus Abschnitt 4 admin-entschieden (siehe Abschnitt 6 neu). Fragen 4 & 5 weiterhin offen.
**Bezug:** Master-Dokument Abschnitt 3.7 (Kontext-Synchronisation Q7 ↔ Q7-ERP)

---

## 6. ADMIN-ENTSCHEIDUNGEN (21.08.2026)

### 6.1 Name des ERP-nativen Agenten
**Entscheidung:** **"ERP-Agent"**
Keine Q7-A-Nummer (Option C bestätigt) — bewusst getrennt vom Q7-Nummernschema (A15/A16/A17), um keine Abhängigkeit von Q7 zu suggerieren (Eigenständigkeits-Test, 3.5).

### 6.2 Aktivierung
**Entscheidung:** **Option C — konfigurierbar pro Lizenznehmer (Feature-Flag)**
- Voreinstellung z.B.: Standalone-Lizenznehmer (kein Q7) → ERP-Agent aktiv; Q7-Kunde → primär A15, ERP-Agent optional zuschaltbar
- Lizenznehmer/Admin kann pro Fall umschalten (z.B. Q7-Kunde will trotzdem Live-Antworten statt gespiegelter Daten)
- Konsistent mit bestehendem Feature-Flag-Muster (Artikel-Stufen, Master-Dok Abschnitt 4)

### 6.3 Schnittstelle ERP-Agent ↔ A15
**Entscheidung:** **Option B — über bestehende Connector-Schicht (3.4)**
ERP-Agent wird als weiterer Teilnehmer der Connector-Schicht behandelt, kein neues Protokoll.

**Zwei Richtungen:**
| Richtung | Verhalten |
|---|---|
| Q7-ERP → Q7 | unverändert: Domain Event → Webhook → Kontext-Speicher (A15 empfängt) |
| Q7 → Q7-ERP (neu) | A15 schickt bei Bedarf (Kontext-Speicher zu alt/fehlt) Anfrage über Connector-Schicht an ERP-Agent |

**Ablauf:**
```
Lizenznehmer fragt Q7-Agent
   → Kontext-Speicher wird geprüft
   → Daten zu alt/fehlen
   → A15 → Connector-Schicht → ERP-Agent (Live-Anfrage)
   → ERP-Agent führt Anfrage über normale Services aus (RLS greift automatisch, keine Sonderrechte)
   → Antwort denselben Weg zurück
```

**Festgelegte Eckpunkte:**
- Asynchron mit Antwort-Webhook (keine dauerhaft offene Verbindung)
- Anfrage enthält mindestens: `lizenznehmerId`, Frage/Aktion, Zeitstempel, Anfrage-ID
- Sicherheitsgrenze: ERP-Agent nutzt normale Service-Kapselung (3.1) + RLS (3.6) mit der `lizenznehmerId` aus der Anfrage — keine erweiterten Rechte. Connector-Schicht prüft nur Herkunft (ist das wirklich Q7, richtiger Lizenznehmer), nicht fachliche Rechte.

**Noch offen (unverändert aus v1):**
- Genaues Nachrichtenformat (JSON-Schema)
- Timeout-/Retry-Verhalten bei asynchroner Anfrage
- Ob ERP-Agent auch unaufgefordert Events an A15 pushen darf, oder nur auf Anfrage antwortet

---

## 7. WEITERHIN OFFEN (aus v1, Abschnitt 4.4–4.5)

| # | Frage | Status |
|---|---|---|
| 4 | Wie wird Service-Kapselung (3.1) "agenten-tauglich"? | Offen — Einschätzung in v1: Option C (agent-safe-Flag pro Methode) |
| 5 | Wann/wie CRM/HR in Roadmap einordnen? | Offen — Einschätzung in v1: Option C (Core vorbereiten, nicht terminieren) |

---

## 8. STATUS

Fragen 1–3 admin-entschieden (Abschnitt 6). Noch **nicht** ins Master-Dokument (Abschnitt 3.7/6) übernommen — das ist ein separater Schritt. Fragen 4 & 5 weiterhin offen.

*Ursprünglicher Inhalt (Abschnitte 1–5, Diskussionsstand v1) bleibt unverändert erhalten — siehe `Q7ERP_Agentenkommunikation_v1.md`.*
