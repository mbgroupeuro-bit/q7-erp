# A124_CrmKontakt_Pipeline_Test.ps1
# Testet: pipelineStatus kann beliebig zwischen allen Werten wechseln (A123-Entscheidung: keine Regel-Erzwingung)
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A124_CrmKontakt_Pipeline_Test.ps1

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

# --- Testkontakt anlegen ---
$createBody = @{
    name = "Pipeline Test Kontakt"
} | ConvertTo-Json

try {
    $kontakt = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Post -Headers $headersA -Body $createBody -ContentType "application/json"
    $kontaktId = $kontakt.id
    Write-Result "create() - Testkontakt angelegt (Status NEU)" ($kontakt.pipelineStatus -eq "NEU")
} catch {
    Write-Result "create()" $false
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "`n=== Beliebige Uebergaenge testen (keine Regel-Erzwingung, A123) ===" -ForegroundColor Cyan

# --- Reihenfolge testet auch "unuebliche" Sprünge (z.B. direkt zu GEWONNEN, dann zurueck zu NEU) ---
$reihenfolge = @("KONTAKTIERT", "ANGEBOT", "GEWONNEN", "NEU", "VERLOREN", "ANGEBOT")

foreach ($status in $reihenfolge) {
    $updateBody = @{ pipelineStatus = $status } | ConvertTo-Json
    try {
        $aktualisiert = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
        Write-Result "Uebergang zu $status" ($aktualisiert.pipelineStatus -eq $status)
    } catch {
        Write-Result "Uebergang zu $status" $false
        Write-Host $_.Exception.Message
    }
}

# --- Ungueltiger Enum-Wert soll abgelehnt werden ---
$invalidBody = @{ pipelineStatus = "UNGUELTIGER_STATUS" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Patch -Headers $headersA -Body $invalidBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "Ungueltiger Enum-Wert wird abgelehnt" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "Ungueltiger Enum-Wert wird abgelehnt (400 erwartet)" ($statusCode -eq 400)
}

# --- Aufraeumen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testkontakt aufgeraeumt" $true
} catch {
    Write-Result "Aufraeumen" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen ===" -ForegroundColor Cyan
