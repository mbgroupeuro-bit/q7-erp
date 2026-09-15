# A129_CrmAngebot_Test.ps1
# Testet: create (Kopf+Positionen, Preis-Snapshot) / findOne (Verfuegbarkeit) /
# update (Status) / addPosition / removePosition / remove + Mandantentrennung
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A129_CrmAngebot_Test.ps1

$baseUrl = "http://localhost:3000"

function Write-Result($label, $ok) {
    if ($ok) {
        Write-Host "[OK]   $label" -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] $label" -ForegroundColor Red
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

# Bekannte Test-IDs aus Memory (Lizenznehmer A)
$artikelId = "6fadd3bb-4964-4194-8987-7e3dbf9bcdcc"  # ART-001

Write-Host "`n=== Abschnitt 1: CRUD-Tests (Lizenznehmer A) ===" -ForegroundColor Cyan

# --- Testkontakt anlegen ---
$createKontaktBody = @{ name = "Angebot Test Kontakt" } | ConvertTo-Json
try {
    $kontakt = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Post -Headers $headersA -Body $createKontaktBody -ContentType "application/json"
    $kontaktId = $kontakt.id
    Write-Result "Testkontakt angelegt" ($null -ne $kontaktId)
} catch {
    Write-Result "Testkontakt anlegen" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- Aktuellen Artikelpreis ermitteln (fuer Preis-Snapshot-Vergleich) ---
try {
    $artikel = Invoke-RestMethod -Uri "$baseUrl/artikel/$artikelId" -Method Get -Headers $headersA
    $aktuellerPreis = $artikel.grundpreis
    Write-Result "Artikel-Referenzpreis ermittelt" ($null -ne $aktuellerPreis)
} catch {
    Write-Result "Artikel-Referenzpreis ermitteln" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- create() Angebot mit einer Position ---
$createAngebotBody = @{
    crmKontaktId = $kontaktId
    gueltigBis   = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    positionen   = @(
        @{ artikelId = $artikelId; menge = 3 }
    )
} | ConvertTo-Json -Depth 5

try {
    $angebot = Invoke-RestMethod -Uri "$baseUrl/crm-angebot" -Method Post -Headers $headersA -Body $createAngebotBody -ContentType "application/json"
    Write-Result "create() - Angebot angelegt" ($null -ne $angebot.id)
    Write-Result "create() - Status Default = ENTWURF" ($angebot.status -eq "ENTWURF")
    Write-Result "create() - eine Position vorhanden" ($angebot.positionen.Count -eq 1)
    Write-Result "create() - Preis-Snapshot korrekt uebernommen" ([decimal]$angebot.positionen[0].einzelpreis -eq [decimal]$aktuellerPreis)
    $angebotId = $angebot.id
    $positionId = $angebot.positionen[0].id
} catch {
    Write-Result "create()" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- create() ohne Positionen soll fehlschlagen ---
$leerBody = @{ crmKontaktId = $kontaktId; positionen = @() } | ConvertTo-Json -Depth 5
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot" -Method Post -Headers $headersA -Body $leerBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "create() ohne Positionen abgelehnt" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "create() ohne Positionen abgelehnt (400 erwartet)" ($statusCode -eq 400)
}

# --- findOne() inkl. Verfuegbarkeit ---
try {
    $einzelnes = Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Get -Headers $headersA
    Write-Result "findOne() - korrektes Angebot geladen" ($einzelnes.id -eq $angebotId)
    Write-Result "findOne() - verfuegbareMenge vorhanden" ($null -ne $einzelnes.positionen[0].verfuegbareMenge)
} catch {
    Write-Result "findOne()" $false
    Write-Host $_.Exception.Message
}

# --- update() Status ---
$updateBody = @{ status = "VERSENDET" } | ConvertTo-Json
try {
    $aktualisiert = Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
    Write-Result "update() - Status auf VERSENDET geaendert" ($aktualisiert.status -eq "VERSENDET")
} catch {
    Write-Result "update()" $false
    Write-Host $_.Exception.Message
}

# --- addPosition() ---
$addPositionBody = @{ artikelId = $artikelId; menge = 1 } | ConvertTo-Json
try {
    $mitNeuerPosition = Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId/positionen" -Method Post -Headers $headersA -Body $addPositionBody -ContentType "application/json"
    Write-Result "addPosition() - zweite Position hinzugefuegt" ($mitNeuerPosition.positionen.Count -eq 2)
} catch {
    Write-Result "addPosition()" $false
    Write-Host $_.Exception.Message
}

# --- removePosition() ---
try {
    $ohnePosition = Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId/positionen/$positionId" -Method Delete -Headers $headersA
    Write-Result "removePosition() - Position entfernt" ($ohnePosition.positionen.Count -eq 1)
} catch {
    Write-Result "removePosition()" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Abschnitt 2: Mandantentrennung ===" -ForegroundColor Cyan

# --- findOne() von B auf A's Angebot ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR-Schutz findOne() - B darf A's Angebot nicht sehen" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz findOne() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- update() von B auf A's Angebot ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Patch -Headers $headersB -Body $updateBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR-Schutz update() - B darf A's Angebot nicht aendern" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz update() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- create() von B mit A's crmKontaktId ---
$crossTenantBody = @{
    crmKontaktId = $kontaktId
    positionen   = @(@{ artikelId = $artikelId; menge = 1 })
} | ConvertTo-Json -Depth 5
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot" -Method Post -Headers $headersB -Body $crossTenantBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR-Schutz create() ueber fremde crmKontaktId - B abgelehnt" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz create() ueber fremde crmKontaktId - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

# --- remove() von B auf A's Angebot ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR-Schutz remove() - B darf A's Angebot nicht loeschen" $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Result "IDOR-Schutz remove() - B bekommt 404 (erwartet)" ($statusCode -eq 404)
}

Write-Host "`n=== Abschnitt 3: Aufraeumen ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testdaten aufgeraeumt" $true
} catch {
    Write-Result "Aufraeumen" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen ===" -ForegroundColor Cyan
