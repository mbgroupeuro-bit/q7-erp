# A139_Zeiterfassung_E2E_Test.ps1
# Test Zeiterfassung/Arbeitstag (Block C, A138): CRUD (ohne update) + Mandantentrennung.
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A139_Zeiterfassung_E2E_Test.ps1

$baseUrl = "http://localhost:3000"
$fehlerZaehler = 0

function Write-Result($label, $ok) {
    if ($ok) {
        Write-Host "[OK]   $label" -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] $label" -ForegroundColor Red
        $script:fehlerZaehler++
    }
}

# --- Login Lizenznehmer A ---
$loginBodyA = @{ email = "admin@test-gmbh.de"; passwort = "Admin2026!" } | ConvertTo-Json
try {
    $loginA = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBodyA -ContentType "application/json"
    $tokenA = $loginA.access_token
    Write-Result "Login Lizenznehmer A" ($null -ne $tokenA)
} catch {
    Write-Result "Login Lizenznehmer A" $false
    Write-Host $_.Exception.Message
    exit 1
}
$headersA = @{ Authorization = "Bearer $tokenA" }

# --- Login Lizenznehmer B ---
$loginBodyB = @{ email = "admin@testfirma-b.de"; passwort = "TestFirmaB2026!" } | ConvertTo-Json
try {
    $loginB = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBodyB -ContentType "application/json"
    $tokenB = $loginB.access_token
    Write-Result "Login Lizenznehmer B" ($null -ne $tokenB)
} catch {
    Write-Result "Login Lizenznehmer B" $false
    Write-Host $_.Exception.Message
    exit 1
}
$headersB = @{ Authorization = "Bearer $tokenB" }

# --- Testmitarbeiter fuer Lizenznehmer A anlegen (Voraussetzung fuer Arbeitstag) ---
$mitarbeiterBody = @{ name = "E2E Test Zeiterfassung"; telefon = "0170-0000000"; gehalt = 2800.00 } | ConvertTo-Json
try {
    $mitarbeiter = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Post -Headers $headersA -Body $mitarbeiterBody -ContentType "application/json"
    $mitarbeiterId = $mitarbeiter.id
    Write-Result "Testmitarbeiter angelegt" ($null -ne $mitarbeiterId)
} catch {
    Write-Result "Testmitarbeiter angelegt" $false
    Write-Host $_.Exception.Message
    exit 1
}

# ===========================================================
# ABSCHNITT 1: Zeiterfassung CRUD (ohne update, A138)
# ===========================================================
Write-Host "`n=== Abschnitt 1: Zeiterfassung CRUD ===" -ForegroundColor Cyan

$arbeitstagIds = @()

$datenListe = @("2026-08-03", "2026-08-04", "2026-08-05")
foreach ($datum in $datenListe) {
    $createBody = @{ mitarbeiterId = $mitarbeiterId; datum = $datum; bemerkung = "E2E-Eintrag" } | ConvertTo-Json
    try {
        $eintrag = Invoke-RestMethod -Uri "$baseUrl/zeiterfassung" -Method Post -Headers $headersA -Body $createBody -ContentType "application/json"
        $arbeitstagIds += $eintrag.id
        Write-Result "Arbeitstag create() $datum" ($null -ne $eintrag.id)
    } catch {
        Write-Result "Arbeitstag create() $datum" $false
        Write-Host $_.Exception.Message
        exit 1
    }
}

# --- Duplikat: gleicher Mitarbeiter + gleiches Datum muss abgelehnt werden (P2002 -> 409) ---
$dupBody = @{ mitarbeiterId = $mitarbeiterId; datum = "2026-08-03" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung" -Method Post -Headers $headersA -Body $dupBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "Duplikat-Datum wird abgelehnt (409)" $false
} catch {
    Write-Result "Duplikat-Datum wird abgelehnt (409)" ($_.Exception.Response.StatusCode.value__ -eq 409)
}

# --- findAllByMitarbeiter mit Monatsfilter ---
try {
    $alle = Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/mitarbeiter/$mitarbeiterId`?jahr=2026&monat=8" -Method Get -Headers $headersA
    Write-Result "findAllByMitarbeiter() liefert 3 Eintraege" ($alle.Count -eq 3)
} catch { Write-Result "findAllByMitarbeiter()" $false }

# --- monatsUebersicht ---
try {
    $uebersicht = Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/mitarbeiter/$mitarbeiterId/monatsuebersicht?jahr=2026&monat=8" -Method Get -Headers $headersA
    Write-Result "monatsUebersicht() anzahlArbeitstage = 3" ($uebersicht.anzahlArbeitstage -eq 3)
} catch { Write-Result "monatsUebersicht()" $false }

# --- Validierung: ungueltiges Datum wird abgelehnt (IsDateString) ---
$invalidBody = @{ mitarbeiterId = $mitarbeiterId; datum = "kein-datum" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung" -Method Post -Headers $headersA -Body $invalidBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "Validierung: ungueltiges Datum wird abgelehnt (400)" $false
} catch {
    Write-Result "Validierung: ungueltiges Datum wird abgelehnt (400)" ($_.Exception.Response.StatusCode.value__ -eq 400)
}

# --- kein update() vorhanden: PATCH-Aufruf muss 404 (Route nicht gefunden) liefern ---
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/$($arbeitstagIds[0])" -Method Patch -Headers $headersA -Body (@{ bemerkung = "geaendert" } | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Result "Kein update()-Endpunkt vorhanden (404)" $false
} catch {
    Write-Result "Kein update()-Endpunkt vorhanden (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 2: MANDANTENTRENNUNG (Lizenznehmer B darf NICHTS von A sehen/anlegen/loeschen)
# ===========================================================
Write-Host "`n=== Abschnitt 2: Mandantentrennung (Zeiterfassung) ===" -ForegroundColor Cyan

# --- B versucht Arbeitstag fuer A's Mitarbeiter anzulegen ---
$crossCreateBody = @{ mitarbeiterId = $mitarbeiterId; datum = "2026-08-10" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung" -Method Post -Headers $headersB -Body $crossCreateBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR Arbeitstag create() - B blockiert" $false
} catch {
    Write-Result "IDOR Arbeitstag create() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B versucht A's Arbeitstage abzufragen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/mitarbeiter/$mitarbeiterId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR findAllByMitarbeiter() - B blockiert" $false
} catch {
    Write-Result "IDOR findAllByMitarbeiter() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B versucht Monatsuebersicht von A's Mitarbeiter abzurufen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/mitarbeiter/$mitarbeiterId/monatsuebersicht?jahr=2026&monat=8" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR monatsUebersicht() - B blockiert" $false
} catch {
    Write-Result "IDOR monatsUebersicht() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B versucht A's Arbeitstag-Eintrag zu loeschen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/$($arbeitstagIds[0])" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Arbeitstag remove() - B blockiert" $false
} catch {
    Write-Result "IDOR Arbeitstag remove() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 3: AUFRAEUMEN
# ===========================================================
Write-Host "`n=== Abschnitt 3: Aufraeumen ===" -ForegroundColor Cyan

foreach ($id in $arbeitstagIds) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/$id" -Method Delete -Headers $headersA | Out-Null
    } catch {
        Write-Result "Aufraeumen Arbeitstag $id" $false
        Write-Host $_.Exception.Message
    }
}
Write-Result "Arbeitstag-Testdaten aufgeraeumt" $true

try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testmitarbeiter aufgeraeumt" $true
} catch {
    Write-Result "Testmitarbeiter aufgeraeumt" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen: $fehlerZaehler Fehler ===" -ForegroundColor Cyan
