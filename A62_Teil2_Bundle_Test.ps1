# ============================================================
# A62 — Gesamttest Lager-Modul End-to-End (Teil 2: Bundle-Verkauf)
# Baut sich die noetigen Testdaten selbst auf (A62b):
#   1. Login
#   2. Bestand von ART-001 (Bestandteil) VOR dem Bundle-Verkauf abfragen
#   3. Neuen Bundle-Artikel anlegen (istBundle = true)
#   4. Bundle-Position anlegen: Bundle besteht aus 2x ART-001
#   5. bundleVerkaufBuchen: 5 Bundles verkaufen -> muss 10x ART-001 abbuchen
#   6. Bestand von ART-001 NACH dem Bundle-Verkauf pruefen (-10)
#   7. Bundle-Verkauf mit zu hoher Menge -> muss abgelehnt werden (400)
# ============================================================

$baseUrl = "http://localhost:3000"
$bestandteilArtikelId = "6fadd3bb-4964-4194-8987-7e3dbf9bcdcc"   # ART-001, Lizenznehmer A

function Write-Step($text) {
    Write-Host ""
    Write-Host "=== $text ===" -ForegroundColor Cyan
}

function Assert($bedingung, $meldung) {
    if ($bedingung) {
        Write-Host "OK: $meldung" -ForegroundColor Green
    } else {
        Write-Host "FEHLER: $meldung" -ForegroundColor Red
    }
}

# ---------------------------------------------------------
# 1. Login (Lizenznehmer A)
# ---------------------------------------------------------
Write-Step "1. Login Lizenznehmer A"

$loginBody = @{
    email    = "admin@test-gmbh.de"
    passwort = "Admin2026!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token
Assert ($null -ne $token -and $token -ne "") "Login erfolgreich, Token erhalten"

$headers = @{ Authorization = "Bearer $token" }

# ---------------------------------------------------------
# 2. Bestand von ART-001 vor dem Bundle-Verkauf
# ---------------------------------------------------------
Write-Step "2. Bestand ART-001 vor Bundle-Verkauf"

$vorBestand = Invoke-RestMethod -Uri "$baseUrl/lager/bestand/$bestandteilArtikelId" -Method Get -Headers $headers
$vorMenge = [decimal]$vorBestand.menge
Write-Host "Bestand ART-001 vorher: $vorMenge"

if ($vorMenge -lt 10) {
    Write-Host "WARNUNG: Bestand ART-001 ist kleiner als 10 - Bundle-Verkauf (5x, je 2 benoetigt) wird vermutlich fehlschlagen." -ForegroundColor Yellow
}

# ---------------------------------------------------------
# 3. Neuen Bundle-Artikel anlegen
# ---------------------------------------------------------
Write-Step "3. Bundle-Artikel anlegen"

$bundleArtikelBody = @{
    artikelnummer = "BUNDLE-A62-TEST"
    name          = "A62 Test-Bundle"
    grundpreis    = 19.99
    einheit       = "Stk"
    istBundle     = $true
} | ConvertTo-Json

$bundleArtikel = Invoke-RestMethod -Uri "$baseUrl/artikel" -Method Post -Body $bundleArtikelBody -Headers $headers -ContentType "application/json"
$bundleArtikelId = $bundleArtikel.id

Assert ($null -ne $bundleArtikelId) "Bundle-Artikel angelegt (ID: $bundleArtikelId)"
Assert ($bundleArtikel.istBundle -eq $true) "istBundle korrekt auf true gesetzt"

# ---------------------------------------------------------
# 4. Bundle-Position anlegen (2x ART-001 pro Bundle)
# ---------------------------------------------------------
Write-Step "4. Bundle-Position anlegen (2x ART-001)"

$bundlePositionBody = @{
    bestandteilArtikelId = $bestandteilArtikelId
    menge                = 2
} | ConvertTo-Json

$bundlePosition = Invoke-RestMethod -Uri "$baseUrl/artikel/$bundleArtikelId/bundle-positionen" -Method Post -Body $bundlePositionBody -Headers $headers -ContentType "application/json"
Assert ($null -ne $bundlePosition.id) "Bundle-Position angelegt (ID: $($bundlePosition.id))"

# ---------------------------------------------------------
# 5. Bundle-Verkauf buchen (5x Bundle = 10x ART-001)
# ---------------------------------------------------------
Write-Step "5. Bundle-Verkauf buchen (5x Bundle)"

$bundleVerkaufBody = @{
    artikelId = $bundleArtikelId
    menge     = 5
    referenz  = "A62-TEIL2-BUNDLEVERKAUF"
    bemerkung = "A62 Teil 2 E2E-Test Bundle-Verkauf"
} | ConvertTo-Json

$verkaufResult = Invoke-RestMethod -Uri "$baseUrl/lager/bundle-verkauf" -Method Post -Body $bundleVerkaufBody -Headers $headers -ContentType "application/json"
Write-Host "Antwort: $($verkaufResult | ConvertTo-Json -Compress)"
Assert ($verkaufResult.abgebuchteBestandteile.Count -eq 1) "Genau 1 Bestandteil abgebucht"
Assert ($verkaufResult.abgebuchteBestandteile[0].menge -eq 10) "Abgebuchte Menge = 10 (2 je Bundle x 5 Bundles)"

# ---------------------------------------------------------
# 6. Bestand von ART-001 nach dem Bundle-Verkauf pruefen
# ---------------------------------------------------------
Write-Step "6. Bestand ART-001 nach Bundle-Verkauf pruefen"

$nachBestand = Invoke-RestMethod -Uri "$baseUrl/lager/bestand/$bestandteilArtikelId" -Method Get -Headers $headers
$erwarteteMenge = $vorMenge - 10
Assert ([decimal]$nachBestand.menge -eq $erwarteteMenge) "Bestand ART-001 = $erwarteteMenge (tatsaechlich: $($nachBestand.menge))"

# ---------------------------------------------------------
# 7. Bundle-Verkauf mit zu hoher Menge -> muss abgelehnt werden
# ---------------------------------------------------------
Write-Step "7. Bundle-Verkauf mit unrealistisch hoher Menge (muss fehlschlagen)"

$zuVielBody = @{
    artikelId = $bundleArtikelId
    menge     = 999999
    referenz  = "A62-TEIL2-NEGATIV"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/lager/bundle-verkauf" -Method Post -Body $zuVielBody -Headers $headers -ContentType "application/json"
    Assert $false "Bundle-Verkauf mit zu hoher Menge wurde faelschlicherweise akzeptiert!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert ($statusCode -eq 400) "Bundle-Verkauf mit zu hoher Menge korrekt abgelehnt (HTTP $statusCode)"
}

Write-Host ""
Write-Host "=== A62 Teil 2 (Bundle-Verkauf) abgeschlossen ===" -ForegroundColor Cyan
Write-Host "Test-Bundle-Artikel-ID (fuer spaetere Tests): $bundleArtikelId" -ForegroundColor Yellow
