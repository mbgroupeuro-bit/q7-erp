# =====================================================================
# A116 - Test: Mandantentrennung ueber alle bestehenden Module (erweitert)
# Q7-ERP, Admin-Testskript, 21.08.2026
# Basis: test-mandantentrennung-A112.ps1 (Artikel/Lager, Partner, Konto)
# NEU in A116: zwei zusaetzliche Testfaelle aus Code-Review-Fund:
#   Test 4 - elternArtikelId in Artikel-Anlage/Update: wird die
#            Tenant-Zugehoerigkeit des Eltern-Artikels geprueft?
#   Test 5 - lagerortId in Lager-Buchungen: wird die Tenant-Zugehoerigkeit
#            des Lagerorts geprueft (ermittleZielLagerort)?
#
# ABLAUF:
# 1. Login als Lizenznehmer A (test-gmbh) -> Token A
# 2. Als A: Artikel-, Partner- und Konto-Liste abfragen, jeweils erste ID merken
# 3. Login als Lizenznehmer B (testfirma-b) -> Token B
# 4. Als B: bekannte Missbrauchsversuche mit A-IDs (Artikel/Lager, Partner, Konto)
# 5. Als B: Artikel anlegen mit elternArtikelId = A-Artikel-ID
# 6. Als B: Wareneingang buchen mit eigener Artikel-ID, aber lagerortId = A-Lagerort-ID
#
# ERWARTUNG (richtig, sicher):
#   Jeder Versuch wird abgelehnt (404 bevorzugt, 400 bei Test 5/6 ebenfalls akzeptabel,
#   da fachliche Ablehnung ueber "nicht gefunden"-Pruefung erfolgen sollte).
#
# WARNSIGNAL (Sicherheitsproblem):
#   Irgendein Versuch gelingt (200/201) -> B konnte fremde Lizenznehmer-Daten
#   referenzieren oder abrufen. Datenleck (Master-Dokument 3.6).
# =====================================================================

$baseUrl = "http://localhost:3000"
$ergebnisse = @()

function Invoke-Login {
    param(
        [string]$Email,
        [string]$Passwort
    )
    $body = @{ email = $Email; passwort = $Passwort } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $body
    } catch {
        Write-Host "FEHLER beim Login von $Email :" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $null
    }

    $token = $response.access_token
    if (-not $token) { $token = $response.token }
    if (-not $token) { $token = $response.accessToken }

    if (-not $token) {
        Write-Host "WARNUNG: Kein Token Feld automatisch gefunden fuer $Email." -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 5 | Write-Host
    }

    return $token
}

function Test-IdorZugriff {
    param(
        [string]$Bezeichnung,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        [string]$Body = $null,
        [int[]]$AkzeptierteAblehnungsCodes = @(404)
    )

    Write-Host ""
    Write-Host "--- Test: $Bezeichnung ---" -ForegroundColor Cyan
    Write-Host "$Method $Uri" -ForegroundColor DarkGray

    try {
        if ($Body) {
            $r = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body $Body -ContentType "application/json"
        } else {
            $r = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
        }
        Write-Host "WARNSIGNAL: Zugriff/Anlage ist DURCHGEGANGEN (Status 2xx)." -ForegroundColor Red
        $r | ConvertTo-Json -Depth 5 | Write-Host
        return "WARNSIGNAL - durchgegangen"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $fehlerText = $_.ErrorDetails.Message
        Write-Host "Zugriff wurde ABGELEHNT. HTTP-Status: $statusCode" -ForegroundColor Green
        Write-Host "Fehlertext: $fehlerText" -ForegroundColor Green
        if ($AkzeptierteAblehnungsCodes -contains $statusCode) {
            Write-Host "Ergebnis: KORREKT" -ForegroundColor Green
            return "OK - $statusCode"
        } else {
            Write-Host "Hinweis: abgelehnt, aber unerwarteter Status ($statusCode)." -ForegroundColor Yellow
            return "Abgelehnt, aber unerwarteter Status $statusCode"
        }
    }
}

Write-Host ""
Write-Host "=== SCHRITT 1: Login als Lizenznehmer A (test-gmbh) ===" -ForegroundColor Cyan
$tokenA = Invoke-Login -Email "admin@test-gmbh.de" -Passwort "Admin2026!"
if (-not $tokenA) { Write-Host "Abbruch: Login A fehlgeschlagen." -ForegroundColor Red; exit }
$headersA = @{ Authorization = "Bearer $tokenA" }

Write-Host ""
Write-Host "=== SCHRITT 2: Referenz-Daten von A abfragen (Artikel, Partner, Konto) ===" -ForegroundColor Cyan

try { $artikelA = Invoke-RestMethod -Method GET -Uri "$baseUrl/artikel" -Headers $headersA } catch { $artikelA = @() }
try { $partnerA = Invoke-RestMethod -Method GET -Uri "$baseUrl/partner" -Headers $headersA } catch { $partnerA = @() }
try { $kontoA = Invoke-RestMethod -Method GET -Uri "$baseUrl/konto" -Headers $headersA } catch { $kontoA = @() }
try { $lagerA = Invoke-RestMethod -Method GET -Uri "$baseUrl/lager/bestand" -Headers $headersA } catch { $lagerA = @() }

$fremdeArtikelId = if ($artikelA.Count -gt 0) { $artikelA[0].id } else { $null }
$fremdePartnerId = if ($partnerA.Count -gt 0) { $partnerA[0].id } else { $null }
$fremdeKontoId   = if ($kontoA.Count -gt 0) { $kontoA[0].id } else { $null }

# Bekannter Standard-Lagerort A aus Testumgebung (siehe Memory):
$fremdeLagerortId = "c6ab56c9-88fa-44b0-9d46-331fed0d65a0"

Write-Host "Artikel-ID von A: $fremdeArtikelId"
Write-Host "Partner-ID von A: $fremdePartnerId"
Write-Host "Konto-ID von A:   $fremdeKontoId"
Write-Host "Lagerort-ID von A (bekannt, Hauptlager): $fremdeLagerortId"

if (-not $fremdeArtikelId) { Write-Host "Hinweis: A hat keinen Artikel - Teiltests werden uebersprungen." -ForegroundColor Yellow }
if (-not $fremdePartnerId) { Write-Host "Hinweis: A hat keinen Partner - Teiltest wird uebersprungen." -ForegroundColor Yellow }
if (-not $fremdeKontoId)   { Write-Host "Hinweis: A hat kein Konto - Teiltest wird uebersprungen." -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== SCHRITT 3: Login als Lizenznehmer B (testfirma-b) ===" -ForegroundColor Cyan
$tokenB = Invoke-Login -Email "admin@testfirma-b.de" -Passwort "TestFirmaB2026!"
if (-not $tokenB) { Write-Host "Abbruch: Login B fehlgeschlagen." -ForegroundColor Red; exit }
$headersB = @{ Authorization = "Bearer $tokenB" }
$headersBJson = @{ Authorization = "Bearer $tokenB"; "Content-Type" = "application/json" }

# Eigene Artikel-ID von B ermitteln (fuer Test 6 gebraucht, isoliert die
# lagerortId-Variable von der artikelId-Variable).
try { $artikelB = Invoke-RestMethod -Method GET -Uri "$baseUrl/artikel" -Headers $headersB } catch { $artikelB = @() }
$eigeneArtikelIdB = if ($artikelB.Count -gt 0) { $artikelB[0].id } else { $null }
Write-Host "Eigene Artikel-ID von B (fuer Test 6): $eigeneArtikelIdB"
if (-not $eigeneArtikelIdB) { Write-Host "Hinweis: B hat keinen eigenen Artikel - Test 6 wird uebersprungen." -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== SCHRITT 4: Bekannte A112-Testfaelle (Regression) ===" -ForegroundColor Cyan

if ($fremdeArtikelId) {
    $bodyWarenausgang = @{ artikelId = $fremdeArtikelId; menge = 1 } | ConvertTo-Json
    $r1 = Test-IdorZugriff -Bezeichnung "Artikel/Lager - Warenausgang mit fremder Artikel-ID" -Method "POST" -Uri "$baseUrl/lager/warenausgang" -Headers $headersBJson -Body $bodyWarenausgang
    $ergebnisse += "1. Artikel/Lager (Warenausgang, fremde Artikel-ID): $r1"
}

if ($fremdePartnerId) {
    $r2 = Test-IdorZugriff -Bezeichnung "Partner - direkter Abruf mit fremder Partner-ID" -Method "GET" -Uri "$baseUrl/partner/$fremdePartnerId" -Headers $headersB
    $ergebnisse += "2. Partner (direkter Abruf): $r2"
}

if ($fremdeKontoId) {
    $r3 = Test-IdorZugriff -Bezeichnung "Konto - direkter Abruf mit fremder Konto-ID" -Method "GET" -Uri "$baseUrl/konto/$fremdeKontoId" -Headers $headersB
    $ergebnisse += "3. Konto (direkter Abruf): $r3"
}

Write-Host ""
Write-Host "=== SCHRITT 5: NEU (A116) - elternArtikelId ueber Tenant-Grenze ===" -ForegroundColor Cyan

if ($fremdeArtikelId) {
    $bodyNeuerArtikel = @{
        artikelnummer = "A116-TEST-ELTERN"
        name          = "A116 Test Eltern-Artikel-Missbrauch"
        grundpreis    = 1.00
        einheit       = "Stueck"
        elternArtikelId = $fremdeArtikelId
    } | ConvertTo-Json
    $r4 = Test-IdorZugriff -Bezeichnung "Artikel anlegen mit elternArtikelId = fremder Artikel (A)" -Method "POST" -Uri "$baseUrl/artikel" -Headers $headersBJson -Body $bodyNeuerArtikel -AkzeptierteAblehnungsCodes @(400, 404)
    $ergebnisse += "4. Artikel (elternArtikelId ueber Tenant-Grenze): $r4"
} else {
    Write-Host "Uebersprungen: keine fremde Artikel-ID verfuegbar." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== SCHRITT 6: NEU (A116) - lagerortId ueber Tenant-Grenze ===" -ForegroundColor Cyan

if ($eigeneArtikelIdB) {
    $bodyWareneingangFremderLagerort = @{
        artikelId  = $eigeneArtikelIdB
        lagerortId = $fremdeLagerortId
        menge      = 1
    } | ConvertTo-Json
    $r5 = Test-IdorZugriff -Bezeichnung "Wareneingang mit eigener Artikel-ID, aber lagerortId = fremder Lagerort (A)" -Method "POST" -Uri "$baseUrl/lager/wareneingang" -Headers $headersBJson -Body $bodyWareneingangFremderLagerort -AkzeptierteAblehnungsCodes @(400, 404)
    $ergebnisse += "5. Lager (lagerortId ueber Tenant-Grenze): $r5"
} else {
    Write-Host "Uebersprungen: keine eigene Artikel-ID von B verfuegbar." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
foreach ($e in $ergebnisse) {
    if ($e -like "*WARNSIGNAL*") {
        Write-Host $e -ForegroundColor Red
    } else {
        Write-Host $e -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== TEST ENDE ===" -ForegroundColor Cyan
