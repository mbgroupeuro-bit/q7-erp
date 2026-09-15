# A135_Mitarbeiter_E2E_Test.ps1
# Test Mitarbeiter-Stammdaten (Block C, A134): CRUD + Mandantentrennung.
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A135_Mitarbeiter_E2E_Test.ps1

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

# ===========================================================
# ABSCHNITT 1: Mitarbeiter CRUD (A134)
# ===========================================================
Write-Host "`n=== Abschnitt 1: Mitarbeiter CRUD ===" -ForegroundColor Cyan

$createBody = @{ name = "E2E Test Mitarbeiter"; telefon = "0170-1234567"; gehalt = 3200.50 } | ConvertTo-Json
try {
    $mitarbeiter = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Post -Headers $headersA -Body $createBody -ContentType "application/json"
    $mitarbeiterId = $mitarbeiter.id
    Write-Result "Mitarbeiter create()" ($null -ne $mitarbeiterId)
    Write-Result "Mitarbeiter gehalt korrekt gespeichert" ([decimal]$mitarbeiter.gehalt -eq 3200.50)
} catch {
    Write-Result "Mitarbeiter create()" $false
    Write-Host $_.Exception.Message
    exit 1
}

try {
    $alle = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Get -Headers $headersA
    Write-Result "Mitarbeiter findAll()" (($alle | Where-Object { $_.id -eq $mitarbeiterId }) -ne $null)
} catch { Write-Result "Mitarbeiter findAll()" $false }

try {
    $einzeln = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Get -Headers $headersA
    Write-Result "Mitarbeiter findOne()" ($einzeln.id -eq $mitarbeiterId)
} catch { Write-Result "Mitarbeiter findOne()" $false }

$updateBody = @{ telefon = "0170-9999999" } | ConvertTo-Json
try {
    $upd = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
    Write-Result "Mitarbeiter update()" ($upd.telefon -eq "0170-9999999")
} catch { Write-Result "Mitarbeiter update()" $false }

# --- Validierung: leerer Name muss abgelehnt werden (IsNotEmpty) ---
$invalidBody = @{ name = ""; gehalt = 1000 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Post -Headers $headersA -Body $invalidBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "Validierung: leerer Name wird abgelehnt (400)" $false
} catch {
    Write-Result "Validierung: leerer Name wird abgelehnt (400)" ($_.Exception.Response.StatusCode.value__ -eq 400)
}

# ===========================================================
# ABSCHNITT 2: MANDANTENTRENNUNG (Lizenznehmer B darf NICHTS von A sehen/aendern/loeschen)
# ===========================================================
Write-Host "`n=== Abschnitt 2: Mandantentrennung (Mitarbeiter) ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Mitarbeiter findOne() - B blockiert" $false
} catch {
    Write-Result "IDOR Mitarbeiter findOne() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

try {
    $alleB = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Get -Headers $headersB
    Write-Result "IDOR Mitarbeiter findAll() - B sieht A's Mitarbeiter NICHT" (($alleB | Where-Object { $_.id -eq $mitarbeiterId }) -eq $null)
} catch { Write-Result "IDOR Mitarbeiter findAll()" $false }

$crossUpdateBody = @{ telefon = "0000-B-Angriffsversuch" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Patch -Headers $headersB -Body $crossUpdateBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR Mitarbeiter update() - B blockiert" $false
} catch {
    Write-Result "IDOR Mitarbeiter update() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Mitarbeiter remove() - B blockiert" $false
} catch {
    Write-Result "IDOR Mitarbeiter remove() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 3: AUFRAEUMEN
# ===========================================================
Write-Host "`n=== Abschnitt 3: Aufraeumen ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testdaten aufgeraeumt" $true
} catch {
    Write-Result "Aufraeumen" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen: $fehlerZaehler Fehler ===" -ForegroundColor Cyan
