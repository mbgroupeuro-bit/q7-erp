# A127_CrmWiedervorlage_Test.ps1
# Testet: create/findAllByKontakt/update/remove fuer CrmWiedervorlage + Mandantentrennung
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A127_CrmWiedervorlage_Test.ps1

$baseUrl = "http://localhost:3000"

function Write-Result($label, $ok) {
    if ($ok) {
        Write-Host "[OK]   $label" -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] $label" -ForegroundColor Red
    }
}

# --- Login Lizenznehmer A ---
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

# --- Login Lizenznehmer B ---
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

Write-Host "`n=== Abschnitt 1: CRUD-Tests (Lizenznehmer A) ===" -ForegroundColor Cyan

# --- Testkontakt anlegen ---
$createKontaktBody = @{ name = "Wiedervorlage Test Kontakt" } | ConvertTo-Json
try {
    $kontakt = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Post -Headers $headersA -Body $createKontaktBody -ContentType "application/json"
    $kontaktId = $kontakt.id
    Write-Result "Testkontakt angelegt" ($null -ne $kontaktId)
} catch {
    Write-Result "Testkontakt anlegen" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- create() Wiedervorlage ---
$faelligkeit = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$createBody = @{
    crmKontaktId      = $kontaktId
    text              = "Rueckruf wegen Angebot"
    faelligkeitsDatum = $faelligkeit
} | ConvertTo-Json

try {
    $wiedervorlage = Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage" -Method Post -Headers $headersA -Body $createBody -ContentType "application/json"
    Write-Result "create() - Wiedervorlage angelegt" ($null -ne $wiedervorlage.id)
    Write-Result "create() - erledigt Default = false" ($wiedervorlage.erledigt -eq $false)
    $wiedervorlageId = $wiedervorlage.id
} catch {
    Write-Result "create()" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- create() mit ungueltiger crmKontaktId soll fehlschlagen ---
$invalidBody = @{
    crmKontaktId      = "00000000-0000-0000-0000-000000000000"
    text              = "Sollte fehlschlagen"
    faelligkeitsDatum = $faelligkeit
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage" -Method Post -Headers $headersA -Body $invalidBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "create() mit ungueltiger crmKontaktId abgelehnt" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "create() mit ungueltiger crmKontaktId abgelehnt (404 erwartet)" ($statusCode -eq 404)
}

# --- findAllByKontakt() ---
try {
    $liste = Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/kontakt/$kontaktId" -Method Get -Headers $headersA
    $gefunden = $liste | Where-Object { $_.id -eq $wiedervorlageId }
    Write-Result "findAllByKontakt() - Wiedervorlage enthalten" ($null -ne $gefunden)
} catch {
    Write-Result "findAllByKontakt()" $false
    Write-Host $_.Exception.Message
}

# --- update() erledigt=true setzen ---
$updateBody = @{ erledigt = $true } | ConvertTo-Json
try {
    $aktualisiert = Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wiedervorlageId" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
    Write-Result "update() - erledigt auf true gesetzt" ($aktualisiert.erledigt -eq $true)
} catch {
    Write-Result "update()" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Abschnitt 2: Mandantentrennung ===" -ForegroundColor Cyan

# --- findAllByKontakt() von B auf A's Kontakt (IDOR) ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/kontakt/$kontaktId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR-Schutz findAllByKontakt() - B darf A's Kontakt nicht sehen" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz findAllByKontakt() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- update() von B auf A's Wiedervorlage ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wiedervorlageId" -Method Patch -Headers $headersB -Body $updateBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR-Schutz update() - B darf A's Wiedervorlage nicht aendern" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz update() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- remove() von B auf A's Wiedervorlage ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wiedervorlageId" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR-Schutz remove() - B darf A's Wiedervorlage nicht loeschen" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz remove() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- create() von B mit A's crmKontaktId (verknuepfte Abfrage IDOR) ---
$crossTenantBody = @{
    crmKontaktId      = $kontaktId
    text              = "B versucht Wiedervorlage auf A's Kontakt anzulegen"
    faelligkeitsDatum = $faelligkeit
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage" -Method Post -Headers $headersB -Body $crossTenantBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR-Schutz create() ueber fremde crmKontaktId - B abgelehnt" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz create() ueber fremde crmKontaktId - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

Write-Host "`n=== Abschnitt 3: Aufraeumen ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wiedervorlageId" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testdaten aufgeraeumt" $true
} catch {
    Write-Result "Aufraeumen" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen ===" -ForegroundColor Cyan
