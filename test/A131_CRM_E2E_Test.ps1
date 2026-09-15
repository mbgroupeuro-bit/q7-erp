# A131_CRM_E2E_Test.ps1
# Gesamttest CRM (Block B, A121-A130): CrmKontakt, Pipeline, Aktivitaeten,
# Wiedervorlagen, Angebote, Suche - jeweils mit CRUD + eigenem
# Mandantentrennung-Abschnitt am Ende.
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A131_CRM_E2E_Test.ps1

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

$artikelId = "6fadd3bb-4964-4194-8987-7e3dbf9bcdcc"  # ART-001

# ===========================================================
# ABSCHNITT 1: CrmKontakt (A121/A122) + Pipeline (A123/A124)
# ===========================================================
Write-Host "`n=== Abschnitt 1: CrmKontakt + Pipeline ===" -ForegroundColor Cyan

$createKontaktBody = @{ name = "E2E Test Kontakt"; email = "e2e@test.de"; quelle = "Website" } | ConvertTo-Json
try {
    $kontakt = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Post -Headers $headersA -Body $createKontaktBody -ContentType "application/json"
    $kontaktId = $kontakt.id
    Write-Result "CrmKontakt create()" ($null -ne $kontaktId)
    Write-Result "CrmKontakt pipelineStatus Default = NEU" ($kontakt.pipelineStatus -eq "NEU")
} catch {
    Write-Result "CrmKontakt create()" $false
    Write-Host $_.Exception.Message
    exit 1
}

try {
    $alle = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Get -Headers $headersA
    Write-Result "CrmKontakt findAll()" (($alle | Where-Object { $_.id -eq $kontaktId }) -ne $null)
} catch { Write-Result "CrmKontakt findAll()" $false }

foreach ($status in @("KONTAKTIERT", "ANGEBOT")) {
    $updateBody = @{ pipelineStatus = $status } | ConvertTo-Json
    try {
        $upd = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
        Write-Result "Pipeline-Uebergang zu $status" ($upd.pipelineStatus -eq $status)
    } catch { Write-Result "Pipeline-Uebergang zu $status" $false }
}

try {
    $treffer = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/search?q=E2E" -Method Get -Headers $headersA
    Write-Result "CrmKontakt search() findet Testkontakt" (($treffer | Where-Object { $_.id -eq $kontaktId }) -ne $null)
} catch { Write-Result "CrmKontakt search()" $false }

# ===========================================================
# ABSCHNITT 2: CrmAktivitaet (A125)
# ===========================================================
Write-Host "`n=== Abschnitt 2: CrmAktivitaet ===" -ForegroundColor Cyan

$createAktivitaetBody = @{ crmKontaktId = $kontaktId; text = "E2E Telefonat" } | ConvertTo-Json
try {
    $aktivitaet = Invoke-RestMethod -Uri "$baseUrl/crm-aktivitaet" -Method Post -Headers $headersA -Body $createAktivitaetBody -ContentType "application/json"
    $aktivitaetId = $aktivitaet.id
    Write-Result "CrmAktivitaet create()" ($null -ne $aktivitaetId)
} catch { Write-Result "CrmAktivitaet create()" $false; Write-Host $_.Exception.Message }

try {
    $liste = Invoke-RestMethod -Uri "$baseUrl/crm-aktivitaet/kontakt/$kontaktId" -Method Get -Headers $headersA
    Write-Result "CrmAktivitaet findAllByKontakt()" (($liste | Where-Object { $_.id -eq $aktivitaetId }) -ne $null)
} catch { Write-Result "CrmAktivitaet findAllByKontakt()" $false }

# ===========================================================
# ABSCHNITT 3: CrmWiedervorlage (A126/A127)
# ===========================================================
Write-Host "`n=== Abschnitt 3: CrmWiedervorlage ===" -ForegroundColor Cyan

$faelligkeit = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$createWvBody = @{ crmKontaktId = $kontaktId; text = "E2E Rueckruf"; faelligkeitsDatum = $faelligkeit } | ConvertTo-Json
try {
    $wv = Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage" -Method Post -Headers $headersA -Body $createWvBody -ContentType "application/json"
    $wvId = $wv.id
    Write-Result "CrmWiedervorlage create()" ($null -ne $wvId)
} catch { Write-Result "CrmWiedervorlage create()" $false; Write-Host $_.Exception.Message }

$updateWvBody = @{ erledigt = $true } | ConvertTo-Json
try {
    $wvUpd = Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wvId" -Method Patch -Headers $headersA -Body $updateWvBody -ContentType "application/json"
    Write-Result "CrmWiedervorlage update() erledigt=true" ($wvUpd.erledigt -eq $true)
} catch { Write-Result "CrmWiedervorlage update()" $false }

# ===========================================================
# ABSCHNITT 4: CrmAngebot (A128/A129)
# ===========================================================
Write-Host "`n=== Abschnitt 4: CrmAngebot ===" -ForegroundColor Cyan

try {
    $artikel = Invoke-RestMethod -Uri "$baseUrl/artikel/$artikelId" -Method Get -Headers $headersA
    $aktuellerPreis = $artikel.grundpreis
} catch { Write-Result "Artikel-Referenzpreis ermitteln" $false; Write-Host $_.Exception.Message }

$createAngebotBody = @{
    crmKontaktId = $kontaktId
    positionen   = @(@{ artikelId = $artikelId; menge = 2 })
} | ConvertTo-Json -Depth 5
try {
    $angebot = Invoke-RestMethod -Uri "$baseUrl/crm-angebot" -Method Post -Headers $headersA -Body $createAngebotBody -ContentType "application/json"
    $angebotId = $angebot.id
    Write-Result "CrmAngebot create()" ($null -ne $angebotId)
    Write-Result "CrmAngebot Preis-Snapshot korrekt" ([decimal]$angebot.positionen[0].einzelpreis -eq [decimal]$aktuellerPreis)
} catch { Write-Result "CrmAngebot create()" $false; Write-Host $_.Exception.Message }

try {
    $angebotEinzeln = Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Get -Headers $headersA
    Write-Result "CrmAngebot findOne() inkl. Verfuegbarkeit" ($null -ne $angebotEinzeln.positionen[0].verfuegbareMenge)
} catch { Write-Result "CrmAngebot findOne()" $false }

# ===========================================================
# ABSCHNITT 5: MANDANTENTRENNUNG (Lizenznehmer B darf NICHTS von A sehen/aendern/loeschen)
# ===========================================================
Write-Host "`n=== Abschnitt 5: Mandantentrennung (alle CRM-Module) ===" -ForegroundColor Cyan

# --- CrmKontakt ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR CrmKontakt findOne() - B blockiert" $false
} catch {
    Write-Result "IDOR CrmKontakt findOne() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

try {
    $alleB = Invoke-RestMethod -Uri "$baseUrl/crm-kontakt" -Method Get -Headers $headersB
    Write-Result "IDOR CrmKontakt findAll() - B sieht A's Kontakt NICHT" (($alleB | Where-Object { $_.id -eq $kontaktId }) -eq $null)
} catch { Write-Result "IDOR CrmKontakt findAll()" $false }

# --- CrmAktivitaet ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-aktivitaet/kontakt/$kontaktId" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR CrmAktivitaet findAllByKontakt() - B blockiert" $false
} catch {
    Write-Result "IDOR CrmAktivitaet findAllByKontakt() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- CrmWiedervorlage ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wvId" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR CrmWiedervorlage remove() - B blockiert" $false
} catch {
    Write-Result "IDOR CrmWiedervorlage remove() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- CrmAngebot ---
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR CrmAngebot remove() - B blockiert" $false
} catch {
    Write-Result "IDOR CrmAngebot remove() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- Verknuepfte Abfrage IDOR (Szenario 3): B legt Aktivitaet/Angebot auf A's Kontakt an ---
$crossAktivitaetBody = @{ crmKontaktId = $kontaktId; text = "B Angriffsversuch" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-aktivitaet" -Method Post -Headers $headersB -Body $crossAktivitaetBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR CrmAktivitaet create() ueber fremde crmKontaktId - B blockiert" $false
} catch {
    Write-Result "IDOR CrmAktivitaet create() ueber fremde crmKontaktId - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

$crossAngebotBody = @{ crmKontaktId = $kontaktId; positionen = @(@{ artikelId = $artikelId; menge = 1 }) } | ConvertTo-Json -Depth 5
try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot" -Method Post -Headers $headersB -Body $crossAngebotBody -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR CrmAngebot create() ueber fremde crmKontaktId - B blockiert" $false
} catch {
    Write-Result "IDOR CrmAngebot create() ueber fremde crmKontaktId - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 6: AUFRAEUMEN
# ===========================================================
Write-Host "`n=== Abschnitt 6: Aufraeumen ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$baseUrl/crm-angebot/$angebotId" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/crm-wiedervorlage/$wvId" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/crm-aktivitaet/$aktivitaetId" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/crm-kontakt/$kontaktId" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testdaten aufgeraeumt" $true
} catch {
    Write-Result "Aufraeumen" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen: $fehlerZaehler Fehler ===" -ForegroundColor Cyan
