# A122_CrmKontakt_Test.ps1
# Testet: CRUD fuer CrmKontakt (Lizenznehmer A) + Mandantentrennung (A darf B's Daten nicht sehen/aendern/loeschen)
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A122_CrmKontakt_Test.ps1

$baseUrl = "http://localhost:3000"

function Write-Result($label, $ok) {
    if ($ok) {
        Write-Host "[OK]   $label" -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] $label" -ForegroundColor Red
    }
}

# ---------------------------------------------------------
# 1. Login Lizenznehmer A
# ---------------------------------------------------------
$loginBodyA = @{
    email    = "admin@test-gmbh.de"
    passwort = "Admin2026!"
} | ConvertTo-Json

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

# ---------------------------------------------------------
# 2. Login Lizenznehmer B
# ---------------------------------------------------------
$loginBodyB = @{
    email    = "admin@testfirma-b.de"
    passwort = "TestFirmaB2026!"
} | ConvertTo-Json

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
# ABSCHNITT 1: FUNKTIONS-TESTS (CRUD, nur Lizenznehmer A)
# ===========================================================
Write-Host "`n=== Abschnitt 1: CRUD-Tests (Lizenznehmer A) ===" -ForegroundColor Cyan

# --- create() ---
$createBody = @{
    name    = "Max Mustermann"
    email   = "max@beispiel.de"
    telefon = "0123456789"
    quelle  = "Website"
} | ConvertTo-Json

try {
    $kontakt = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Post -Headers $headersA -Body $createBody -ContentType "application/json"
    Write-Result "create() - Kontakt angelegt" ($null -ne $kontakt.id)
    Write-Result "create() - pipelineStatus Default = NEU" ($kontakt.pipelineStatus -eq "NEU")
    $kontaktId = $kontakt.id
} catch {
    Write-Result "create()" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- findAll() ---
try {
    $alle = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Get -Headers $headersA
    $gefunden = $alle | Where-Object { $_.id -eq $kontaktId }
    Write-Result "findAll() - angelegter Kontakt enthalten" ($null -ne $gefunden)
} catch {
    Write-Result "findAll()" $false
    Write-Host $_.Exception.Message
}

# --- findOne() ---
try {
    $einzelner = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Get -Headers $headersA
    Write-Result "findOne() - korrekter Kontakt geladen" ($einzelner.id -eq $kontaktId)
} catch {
    Write-Result "findOne()" $false
    Write-Host $_.Exception.Message
}

# --- update() ---
$updateBody = @{
    pipelineStatus = "KONTAKTIERT"
} | ConvertTo-Json

try {
    $aktualisiert = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
    Write-Result "update() - pipelineStatus geaendert" ($aktualisiert.pipelineStatus -eq "KONTAKTIERT")
} catch {
    Write-Result "update()" $false
    Write-Host $_.Exception.Message
}

# --- partnerId optional testen: Kontakt ohne Partner-Bezug ---
$createOhnePartner = @{
    name = "Lead ohne Partner"
} | ConvertTo-Json

try {
    $leadOhnePartner = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Post -Headers $headersA -Body $createOhnePartner -ContentType "application/json"
    Write-Result "create() - Kontakt ohne partnerId erfolgreich (Option 3)" ($null -eq $leadOhnePartner.partnerId)
    $leadOhnePartnerId = $leadOhnePartner.id
} catch {
    Write-Result "create() ohne partnerId" $false
    Write-Host $_.Exception.Message
}

# ===========================================================
# ABSCHNITT 2: MANDANTENTRENNUNG (Lizenznehmer B darf A's Daten nicht sehen/aendern/loeschen)
# ===========================================================
Write-Host "`n=== Abschnitt 2: Mandantentrennung ===" -ForegroundColor Cyan

# --- findOne() von B auf A's Kontakt (IDOR-Test) ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR-Schutz findOne() - B darf A's Kontakt NICHT sehen" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz findOne() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- update() von B auf A's Kontakt ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Patch -Headers $headersB -Body $updateBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR-Schutz update() - B darf A's Kontakt NICHT aendern" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz update() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- remove() von B auf A's Kontakt ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR-Schutz remove() - B darf A's Kontakt NICHT loeschen" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz remove() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- findAll() von B - darf A's Kontakte nicht enthalten ---
try {
    $alleB = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Get -Headers $headersB
    $leckA = $alleB | Where-Object { $_.id -eq $kontaktId -or $_.id -eq $leadOhnePartnerId }
    Write-Result "findAll() - B's Liste enthaelt KEINE Kontakte von A" ($null -eq $leckA)
} catch {
    Write-Result "findAll() Mandantentrennung" $false
    Write-Host $_.Exception.Message
}

# ===========================================================
# ABSCHNITT 3: AUFRAeUMEN (Testdaten von A loeschen)
# ===========================================================
Write-Host "`n=== Abschnitt 3: Aufraeumen ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$leadOhnePartnerId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "remove() - Testdaten aufgeraeumt" $true
} catch {
    Write-Result "remove() - Aufraeumen" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen ===" -ForegroundColor Cyan
