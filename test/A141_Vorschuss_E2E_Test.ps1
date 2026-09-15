# A141_Vorschuss_E2E_Test.ps1
# Test Vorschuss-Erfassung (Block C, A140): CRUD (ohne update) + Mandantentrennung.
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A141_Vorschuss_E2E_Test.ps1

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

# --- Testmitarbeiter fuer Lizenznehmer A anlegen (Voraussetzung fuer Vorschuss) ---
$mitarbeiterBody = @{ name = "E2E Test Vorschuss"; telefon = "0170-1111111"; gehalt = 2600.00 } | ConvertTo-Json
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
# ABSCHNITT 1: Vorschuss CRUD (ohne update, A140)
# ===========================================================
Write-Host "`n=== Abschnitt 1: Vorschuss CRUD ===" -ForegroundColor Cyan

$vorschussIds = @()

# Zwei Vorschuesse am selben Tag zulaessig (kein @@unique, anders als Arbeitstag)
$eintraege = @(
    @{ datum = "2026-08-05"; betrag = 100.00 },
    @{ datum = "2026-08-05"; betrag = 50.00 },
    @{ datum = "2026-08-15"; betrag = 75.50 }
)
foreach ($e in $eintraege) {
    $createBody = @{ mitarbeiterId = $mitarbeiterId; datum = $e.datum; betrag = $e.betrag; bemerkung = "E2E-Eintrag" } | ConvertTo-Json
    try {
        $eintrag = Invoke-RestMethod -Uri "$baseUrl/vorschuss" -Method Post -Headers $headersA -Body $createBody -ContentType "application/json"
        $vorschussIds += $eintrag.id
        Write-Result "Vorschuss create() $($e.datum) / $($e.betrag)" ($null -ne $eintrag.id)
    } catch {
        Write-Result "Vorschuss create() $($e.datum) / $($e.betrag)" $false
        Write-Host $_.Exception.Message
        exit 1
    }
}

# --- Mehrere Vorschuesse am selben Tag muessen erlaubt sein (kein @@unique) ---
try {
    $alleTag = Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterId`?jahr=2026&monat=8" -Method Get -Headers $headersA
    $anzahlAmSelbenTag = ($alleTag | Where-Object { $_.datum -like "2026-08-05*" }).Count
    Write-Result "Zwei Vorschuesse am selben Tag erlaubt" ($anzahlAmSelbenTag -eq 2)
} catch { Write-Result "Zwei Vorschuesse am selben Tag erlaubt" $false }

# --- findAllByMitarbeiter mit Monatsfilter: 3 Eintraege insgesamt ---
try {
    $alle = Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterId`?jahr=2026&monat=8" -Method Get -Headers $headersA
    Write-Result "findAllByMitarbeiter() liefert 3 Eintraege" ($alle.Count -eq 3)
} catch { Write-Result "findAllByMitarbeiter()" $false }

# --- monatsUebersicht: Anzahl 3, Summe 225.50 ---
try {
    $uebersicht = Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterId/monatsuebersicht?jahr=2026&monat=8" -Method Get -Headers $headersA
    Write-Result "monatsUebersicht() anzahlVorschuesse = 3" ($uebersicht.anzahlVorschuesse -eq 3)
    Write-Result "monatsUebersicht() summeVorschuesse = 225.50" ([decimal]$uebersicht.summeVorschuesse -eq 225.50)
} catch { Write-Result "monatsUebersicht()" $false }

# --- Validierung: negativer/0-Betrag wird abgelehnt (Min 0.01) ---
$invalidBetragBody = @{ mitarbeiterId = $mitarbeiterId; datum = "2026-08-20"; betrag = 0 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss" -Method Post -Headers $headersA -Body $invalidBetragBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "Validierung: Betrag 0 wird abgelehnt (400)" $false
} catch {
    Write-Result "Validierung: Betrag 0 wird abgelehnt (400)" ($_.Exception.Response.StatusCode.value__ -eq 400)
}

# --- Validierung: ungueltiges Datum wird abgelehnt (IsDateString) ---
$invalidDatumBody = @{ mitarbeiterId = $mitarbeiterId; datum = "kein-datum"; betrag = 10 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss" -Method Post -Headers $headersA -Body $invalidDatumBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "Validierung: ungueltiges Datum wird abgelehnt (400)" $false
} catch {
    Write-Result "Validierung: ungueltiges Datum wird abgelehnt (400)" ($_.Exception.Response.StatusCode.value__ -eq 400)
}

# --- kein update() vorhanden: PATCH-Aufruf muss 404 (Route nicht gefunden) liefern ---
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss/$($vorschussIds[0])" -Method Patch -Headers $headersA -Body (@{ betrag = 999 } | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Result "Kein update()-Endpunkt vorhanden (404)" $false
} catch {
    Write-Result "Kein update()-Endpunkt vorhanden (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 2: MANDANTENTRENNUNG (Lizenznehmer B darf NICHTS von A sehen/anlegen/loeschen)
# ===========================================================
Write-Host "`n=== Abschnitt 2: Mandantentrennung (Vorschuss) ===" -ForegroundColor Cyan

# --- B versucht Vorschuss fuer A's Mitarbeiter anzulegen ---
$crossCreateBody = @{ mitarbeiterId = $mitarbeiterId; datum = "2026-08-10"; betrag = 20 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss" -Method Post -Headers $headersB -Body $crossCreateBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR Vorschuss create() - B blockiert" $false
} catch {
    Write-Result "IDOR Vorschuss create() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B versucht A's Vorschuesse abzufragen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR findAllByMitarbeiter() - B blockiert" $false
} catch {
    Write-Result "IDOR findAllByMitarbeiter() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B versucht Monatsuebersicht von A's Mitarbeiter abzurufen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterId/monatsuebersicht?jahr=2026&monat=8" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR monatsUebersicht() - B blockiert" $false
} catch {
    Write-Result "IDOR monatsUebersicht() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B versucht A's Vorschuss-Eintrag zu loeschen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss/$($vorschussIds[0])" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Vorschuss remove() - B blockiert" $false
} catch {
    Write-Result "IDOR Vorschuss remove() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 3: AUFRAEUMEN
# ===========================================================
Write-Host "`n=== Abschnitt 3: Aufraeumen ===" -ForegroundColor Cyan

foreach ($id in $vorschussIds) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/vorschuss/$id" -Method Delete -Headers $headersA | Out-Null
    } catch {
        Write-Result "Aufraeumen Vorschuss $id" $false
        Write-Host $_.Exception.Message
    }
}
Write-Result "Vorschuss-Testdaten aufgeraeumt" $true

try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testmitarbeiter aufgeraeumt" $true
} catch {
    Write-Result "Testmitarbeiter aufgeraeumt" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen: $fehlerZaehler Fehler ===" -ForegroundColor Cyan
