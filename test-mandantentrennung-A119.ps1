# =====================================================================
# A119 - Test: DELETE /artikel/:id/bundle-positionen/:positionId
# Q7-ERP, Admin-Testskript, 23.08.2026
#
# ABLAUF:
# 1. Login als Lizenznehmer A (test-gmbh) -> Token A
# 2. Als A: neuen Bundle-Artikel anlegen (istBundle = true)
# 3. Als A: neuen Bestandteil-Artikel anlegen
# 4. Als A: Bundle-Position anlegen (Bundle + Bestandteil verknuepfen)
# 5. Als A: GET bundle-positionen -> Position muss vorhanden sein
# 6. Login als Lizenznehmer B (testfirma-b) -> Token B
# 7. Als B: versuchen, A's Bundle-Position zu loeschen (IDOR-Test)
# 8. Als A: eigene Bundle-Position tatsaechlich loeschen
# 9. Als A: GET bundle-positionen -> Position darf NICHT mehr da sein
#
# ERWARTUNG (richtig, sicher):
#   Schritt 7 (B loescht A's Position) -> 404 (abgelehnt)
#   Schritt 8 (A loescht eigene Position) -> 200/204 (erfolgreich)
#   Schritt 9 -> leere Liste bzw. Position fehlt
#
# WARNSIGNAL (Sicherheitsproblem):
#   Schritt 7 gelingt (200/204) -> B konnte fremde Bundle-Position loeschen.
#   Datenleck (Master-Dokument 3.6).
# =====================================================================

$baseUrl = "http://localhost:3000"

function Invoke-Login {
    param([string]$Email, [string]$Passwort)
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
    return $token
}

Write-Host ""
Write-Host "=== SCHRITT 1: Login als Lizenznehmer A (test-gmbh) ===" -ForegroundColor Cyan
$tokenA = Invoke-Login -Email "admin@test-gmbh.de" -Passwort "Admin2026!"
if (-not $tokenA) { Write-Host "Abbruch: Login A fehlgeschlagen." -ForegroundColor Red; exit }
$headersA = @{ Authorization = "Bearer $tokenA"; "Content-Type" = "application/json" }

Write-Host ""
Write-Host "=== SCHRITT 2: Bundle-Artikel anlegen (A) ===" -ForegroundColor Cyan
$bodyBundle = @{
    artikelnummer = "A119-BUNDLE"
    name          = "A119 Test Bundle"
    grundpreis    = 10.00
    einheit       = "Stueck"
    istBundle     = $true
} | ConvertTo-Json
try {
    $bundleArtikel = Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel" -Headers $headersA -Body $bodyBundle
    $bundleArtikelId = $bundleArtikel.id
    Write-Host "Bundle-Artikel angelegt: $bundleArtikelId" -ForegroundColor Green
} catch {
    Write-Host "FEHLER beim Anlegen des Bundle-Artikels:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=== SCHRITT 3: Bestandteil-Artikel anlegen (A) ===" -ForegroundColor Cyan
$bodyBestandteil = @{
    artikelnummer = "A119-BESTANDTEIL"
    name          = "A119 Test Bestandteil"
    grundpreis    = 2.00
    einheit       = "Stueck"
} | ConvertTo-Json
try {
    $bestandteilArtikel = Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel" -Headers $headersA -Body $bodyBestandteil
    $bestandteilArtikelId = $bestandteilArtikel.id
    Write-Host "Bestandteil-Artikel angelegt: $bestandteilArtikelId" -ForegroundColor Green
} catch {
    Write-Host "FEHLER beim Anlegen des Bestandteil-Artikels:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=== SCHRITT 4: Bundle-Position anlegen (A) ===" -ForegroundColor Cyan
$bodyPosition = @{
    bestandteilArtikelId = $bestandteilArtikelId
    menge                = 2
} | ConvertTo-Json
try {
    $position = Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel/$bundleArtikelId/bundle-positionen" -Headers $headersA -Body $bodyPosition
    $positionId = $position.id
    Write-Host "Bundle-Position angelegt: $positionId" -ForegroundColor Green
} catch {
    Write-Host "FEHLER beim Anlegen der Bundle-Position:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=== SCHRITT 5: Positionen abrufen (A) - Position muss vorhanden sein ===" -ForegroundColor Cyan
$positionenVorher = Invoke-RestMethod -Method GET -Uri "$baseUrl/artikel/$bundleArtikelId/bundle-positionen" -Headers $headersA
$gefundenVorher = $positionenVorher | Where-Object { $_.id -eq $positionId }
if ($gefundenVorher) {
    Write-Host "OK: Position ist vorhanden ($($positionenVorher.Count) Position(en) insgesamt)." -ForegroundColor Green
} else {
    Write-Host "WARNUNG: Position wurde nach dem Anlegen nicht gefunden!" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== SCHRITT 6: Login als Lizenznehmer B (testfirma-b) ===" -ForegroundColor Cyan
$tokenB = Invoke-Login -Email "admin@testfirma-b.de" -Passwort "TestFirmaB2026!"
if (-not $tokenB) { Write-Host "Abbruch: Login B fehlgeschlagen." -ForegroundColor Red; exit }
$headersB = @{ Authorization = "Bearer $tokenB" }

Write-Host ""
Write-Host "=== SCHRITT 7: IDOR-Test - B versucht A's Bundle-Position zu loeschen ===" -ForegroundColor Cyan
Write-Host "DELETE /artikel/$bundleArtikelId/bundle-positionen/$positionId (als B)" -ForegroundColor DarkGray
try {
    $r = Invoke-RestMethod -Method DELETE -Uri "$baseUrl/artikel/$bundleArtikelId/bundle-positionen/$positionId" -Headers $headersB
    Write-Host "WARNSIGNAL: B konnte A's Bundle-Position loeschen (Status 2xx)!" -ForegroundColor Red
    $idorErgebnis = "WARNSIGNAL - durchgegangen"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Zugriff wurde ABGELEHNT. HTTP-Status: $statusCode" -ForegroundColor Green
    if ($statusCode -eq 404) {
        Write-Host "Ergebnis: KORREKT (404)" -ForegroundColor Green
        $idorErgebnis = "OK - 404"
    } else {
        Write-Host "Hinweis: abgelehnt, aber unerwarteter Status ($statusCode)." -ForegroundColor Yellow
        $idorErgebnis = "Abgelehnt, aber unerwarteter Status $statusCode"
    }
}

Write-Host ""
Write-Host "=== SCHRITT 8: A loescht eigene Bundle-Position (Regelfall) ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Method DELETE -Uri "$baseUrl/artikel/$bundleArtikelId/bundle-positionen/$positionId" -Headers $headersA
    Write-Host "OK: Position von A erfolgreich geloescht." -ForegroundColor Green
    $loeschErgebnis = "OK - geloescht"
} catch {
    Write-Host "FEHLER: A konnte eigene Position nicht loeschen!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    $loeschErgebnis = "FEHLER - nicht geloescht"
}

Write-Host ""
Write-Host "=== SCHRITT 9: Positionen erneut abrufen (A) - Position darf NICHT mehr da sein ===" -ForegroundColor Cyan
$positionenNachher = Invoke-RestMethod -Method GET -Uri "$baseUrl/artikel/$bundleArtikelId/bundle-positionen" -Headers $headersA
$gefundenNachher = $positionenNachher | Where-Object { $_.id -eq $positionId }
if (-not $gefundenNachher) {
    Write-Host "OK: Position ist nach dem Loeschen nicht mehr vorhanden." -ForegroundColor Green
    $nachherErgebnis = "OK - nicht mehr vorhanden"
} else {
    Write-Host "WARNUNG: Position ist trotz Loeschung noch vorhanden!" -ForegroundColor Red
    $nachherErgebnis = "WARNUNG - noch vorhanden"
}

Write-Host ""
Write-Host "=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
Write-Host "1. IDOR-Schutz (B loescht A's Position): $idorErgebnis"
Write-Host "2. Regulaeres Loeschen (A loescht eigene Position): $loeschErgebnis"
Write-Host "3. Kontrolle nach Loeschung: $nachherErgebnis"
Write-Host ""
Write-Host "Hinweis: Test-Artikel (A119-BUNDLE, A119-BESTANDTEIL) bleiben als" -ForegroundColor DarkGray
Write-Host "INAKTIV/aktiv in der DB stehen (kein automatisches Aufraeumen)." -ForegroundColor DarkGray
Write-Host ""
Write-Host "=== TEST ENDE ===" -ForegroundColor Cyan
