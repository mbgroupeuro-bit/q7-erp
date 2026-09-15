# Q7-ERP — ARBEITSPLAN: ABSICHERUNG + CRM + HR — v4

**Version:** 4.0
**Datum:** 21.08.2026
**Änderung seit letzter Version:** A115 als bestätigter Endpunkt geklärt (offene Frage 1 aus v3 aufgelöst). A116 überarbeitet: IDOR-Tests für Partner, Artikel/Lager und Konto waren bereits durch A112 abgedeckt (`test-mandantentrennung-A112.ps1`) — A116 jetzt auf die tatsächliche Lücke verschlankt: Verbindung-Modul war nie mitgetestet, und ein aktueller Code-Review über alle 5 Module fehlt (nur alter Lager-only-Review aus A63 vorhanden).

---

## BLOCK A — ABSICHERUNG (vor CRM, laut Master-Dokument 3.6 Pflicht)

| ID | Aufgabe | Bezug | Status |
|---|---|---|---|
| **A116** | **Mandantentrennung Verbindung-Modul testen (IDOR, analog A112) + Code-Review über alle 5 Module (Partner, Artikel, Lager, Konto, Verbindung) aktuell durchführen** | Master 3.6, Maßnahme 3+4. Partner/Artikel/Lager/Konto-IDOR-Tests bereits durch A112 erledigt, hier nicht wiederholen. | ⬜ **← NÄCHSTES** |
| A117 | DB-Verifizierung: RLS-Policies Lagertabellen + Datumsanomalie `q7_verbindung.erstelltAm` klären | Master 3.6 / Übergabeprotokoll Abschnitt 5 | ⬜ |
| A118 | A111 abschließen: globale Fehlerbehandlung/Validierung (falls noch offen) | Übergabeprotokoll 20.08. — **Hinweis: laut Übergabeprotokoll bereits erledigt und getestet, hier nur zur Bestätigung nochmal gegenprüfen** | ⬜ |
| A119 | Fehlendes Backend-Endpoint `DELETE /artikel/:id/bundle-positionen` nachbauen | Memory: bekannter offener Punkt | ⬜ |
| A120 | Gesamttest End-to-End über alle Module + Übergabeprotokoll/Master-Dokument aktualisieren, Block A abschließen | — | ⬜ |

*(Block B — CRM und Block C — HR unverändert aus v3 übernommen, hier nicht erneut aufgeführt.)*

---

## OFFENE FRAGEN

1. ~~Ist A115 wirklich die letzte bestätigte Aufgabe?~~ **Geklärt: Ja.**
2. E-Mail-Verknüpfung (A132): direkter Mail-Import oder erst später über Q7/Connector? — noch offen, erst bei Block B relevant.
3. Datei-Ablage für HR-Dokumente (A146): lokal oder Cloud-Speicher? — noch offen, erst bei Block C relevant.
4. Soll Block A vollständig vor Block B laufen? — **Admin-Entscheidung ausstehend, aktuell wird Block A begonnen.**
