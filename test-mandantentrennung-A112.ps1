# =====================================================================
# A112 - Test: Mandantentrennung im Dashboard/Backend (erweitert)
# Q7-ERP, Admin-Testskript, 20.08.2026
#
# ABLAUF:
# 1. Login als Lizenznehmer A (test-gmbh) -> Token A
# 2. Als A: Artikel-, Partner- und Konto-Liste abfragen, jeweils erste ID merken
# 3. Login als Lizenznehmer B (testfirma-b) -> Token B
# 4. Als B: versuchen, A Artikel-ID fuer einen Warenausgang zu missbrauchen
# 5. Als B: versuchen, A Partner-ID direkt per GET /partner/:id abzurufen
# 6. Als B: versuchen, A Konto-ID direkt per GET /konto/:id abzurufen
#
# ERWARTUNG (richtig, sicher):
#   Jeder Versuch wird mit 404 (nicht gefunden) abgelehnt.
#
# WARNSIGNAL (Sicherheitsproblem):
#   Irgendein Versuch gelingt (200/201) -> B konnte auf A Daten zugreifen.
#   Das waere ein echtes Datenleck (Master-Dokument 3.6).
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
        [string]$Body = $null
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
        Write-Host "WARNSIGNAL: Zugriff ist DURCHGEGANGEN (Status 2xx). Datenleck." -ForegroundColor Red
        $r | ConvertTo-Json -Depth 5 | Write-Host
        return "WARNSIGNAL - durchgegangen"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $fehlerText = $_.ErrorDetails.Message
        Write-Host "Zugriff wurde ABGELEHNT. HTTP-Status: $statusCode" -ForegroundColor Green
        Write-Host "Fehlertext: $fehlerText" -ForegroundColor Green
        if ($statusCode -eq 404) {
            Write-Host "Ergebnis: KORREKT" -ForegroundColor Green
            return "OK - 404"
        } else {
            Write-Host "Hinweis: abgelehnt, aber unerwarteter Status ($statusCode statt 404)." -ForegroundColor Yellow
            return "Abgelehnt, aber Status $statusCode statt 404"
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

$fremdeArtikelId = if ($artikelA.Count -gt 0) { $artikelA[0].id } else { $null }
$fremdePartnerId = if ($partnerA.Count -gt 0) { $partnerA[0].id } else { $null }
$fremdeKontoId   = if ($kontoA.Count -gt 0) { $kontoA[0].id } else { $null }

Write-Host "Artikel-ID von A: $fremdeArtikelId"
Write-Host "Partner-ID von A: $fremdePartnerId"
Write-Host "Konto-ID von A:   $fremdeKontoId"

if (-not $fremdeArtikelId) { Write-Host "Hinweis: A hat keinen Artikel - dieser Teiltest wird uebersprungen." -ForegroundColor Yellow }
if (-not $fremdePartnerId) { Write-Host "Hinweis: A hat keinen Partner - dieser Teiltest wird uebersprungen." -ForegroundColor Yellow }
if (-not $fremdeKontoId)   { Write-Host "Hinweis: A hat kein Konto - dieser Teiltest wird uebersprungen." -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== SCHRITT 3: Login als Lizenznehmer B (testfirma-b) ===" -ForegroundColor Cyan
$tokenB = Invoke-Login -Email "admin@testfirma-b.de" -Passwort "TestFirmaB2026!"
if (-not $tokenB) { Write-Host "Abbruch: Login B fehlgeschlagen." -ForegroundColor Red; exit }
$headersB = @{ Authorization = "Bearer $tokenB" }
$headersBJson = @{ Authorization = "Bearer $tokenB"; "Content-Type" = "application/json" }

Write-Host ""
Write-Host "=== SCHRITT 4-6: B versucht Zugriff auf A Daten ===" -ForegroundColor Cyan

if ($fremdeArtikelId) {
    $bodyWarenausgang = @{ artikelId = $fremdeArtikelId; menge = 1 } | ConvertTo-Json
    $r1 = Test-IdorZugriff -Bezeichnung "Artikel/Lager - Warenausgang mit fremder Artikel-ID" -Method "POST" -Uri "$baseUrl/lager/warenausgang" -Headers $headersBJson -Body $bodyWarenausgang
    $ergebnisse += "Artikel/Lager: $r1"
}

if ($fremdePartnerId) {
    $r2 = Test-IdorZugriff -Bezeichnung "Partner - direkter Abruf mit fremder Partner-ID" -Method "GET" -Uri "$baseUrl/partner/$fremdePartnerId" -Headers $headersB
    $ergebnisse += "Partner: $r2"
}

if ($fremdeKontoId) {
    $r3 = Test-IdorZugriff -Bezeichnung "Konto - direkter Abruf mit fremder Konto-ID" -Method "GET" -Uri "$baseUrl/konto/$fremdeKontoId" -Headers $headersB
    $ergebnisse += "Konto: $r3"
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
