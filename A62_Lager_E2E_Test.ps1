# ============================================================
# A62 — Gesamttest Lager-Modul End-to-End (Teil 1: ohne Bundle-Verkauf)
# Bundle-Verkauf-Test folgt separat, sobald Bundle-Testdaten existieren
# (siehe Option 3, Session vom 16.08.2026).
#
# Getestet werden fuer Lizenznehmer A:
#   1. Login
#   2. Bestand abfragen (Ausgangszustand)
#   3. Wareneingang buchen
#   4. Bestand pruefen (muss gestiegen sein)
#   5. Warenausgang buchen
#   6. Bestand pruefen (muss gesunken sein)
#   7. Warenausgang mit zu hoher Menge (muss ABGELEHNT werden, 400)
#   8. Bestandskorrektur buchen (Ziel-Menge setzen)
#   9. Bestand pruefen (muss exakt der Ziel-Menge entsprechen)
#
# Hinweis: lagerortId wird bewusst NICHT mitgeschickt -> Service
# verwendet automatisch den Standard-Lagerort (siehe lager.service.ts,
# ermittleZielLagerort()).
# ============================================================

$baseUrl = "http://localhost:3000"
$artikelId = "6fadd3bb-4964-4194-8987-7e3dbf9bcdcc"   # ART-001, Lizenznehmer A

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
# 2. Ausgangs-Bestand abfragen
# ---------------------------------------------------------
Write-Step "2. Ausgangs-Bestand abfragen"

$start = Invoke-RestMethod -Uri "$baseUrl/lager/bestand/$artikelId" -Method Get -Headers $headers
Write-Host "Ausgangsbestand: $($start.menge) (Lagerort: $($start.lagerortId))"
$startMenge = [decimal]$start.menge
$lagerortId = $start.lagerortId   # ermittelter Standard-Lagerort, fuer spaetere Anzeige

# ---------------------------------------------------------
# 3. Wareneingang buchen
# ---------------------------------------------------------
Write-Step "3. Wareneingang buchen (+50)"

$weBody = @{
    artikelId = $artikelId
    menge     = 50
    referenz  = "A62-TEST-WE"
    bemerkung = "A62 E2E-Test Wareneingang"
} | ConvertTo-Json

$weResult = Invoke-RestMethod -Uri "$baseUrl/lager/wareneingang" -Method Post -Body $weBody -Headers $headers -ContentType "application/json"
Write-Host "Neuer Bestand laut Antwort: $($weResult.menge)"

# ---------------------------------------------------------
# 4. Bestand nach Wareneingang pruefen
# ---------------------------------------------------------
Write-Step "4. Bestand nach Wareneingang pruefen"

$nachWE = Invoke-RestMethod -Uri "$baseUrl/lager/bestand/$artikelId" -Method Get -Headers $headers
$erwarteteMengeWE = $startMenge + 50
Assert ([decimal]$nachWE.menge -eq $erwarteteMengeWE) "Bestand nach Wareneingang = $erwarteteMengeWE (tatsaechlich: $($nachWE.menge))"

# ---------------------------------------------------------
# 5. Warenausgang buchen
# ---------------------------------------------------------
Write-Step "5. Warenausgang buchen (-20)"

$waBody = @{
    artikelId = $artikelId
    menge     = 20
    referenz  = "A62-TEST-WA"
    bemerkung = "A62 E2E-Test Warenausgang"
} | ConvertTo-Json

$waResult = Invoke-RestMethod -Uri "$baseUrl/lager/warenausgang" -Method Post -Body $waBody -Headers $headers -ContentType "application/json"
Write-Host "Neuer Bestand laut Antwort: $($waResult.menge)"

# ---------------------------------------------------------
# 6. Bestand nach Warenausgang pruefen
# ---------------------------------------------------------
Write-Step "6. Bestand nach Warenausgang pruefen"

$nachWA = Invoke-RestMethod -Uri "$baseUrl/lager/bestand/$artikelId" -Method Get -Headers $headers
$erwarteteMengeWA = $erwarteteMengeWE - 20
Assert ([decimal]$nachWA.menge -eq $erwarteteMengeWA) "Bestand nach Warenausgang = $erwarteteMengeWA (tatsaechlich: $($nachWA.menge))"

# ---------------------------------------------------------
# 7. Warenausgang mit zu hoher Menge -> muss abgelehnt werden
# ---------------------------------------------------------
Write-Step "7. Warenausgang mit unrealistisch hoher Menge (muss fehlschlagen)"

$zuVielBody = @{
    artikelId = $artikelId
    menge     = 999999
    referenz  = "A62-TEST-NEGATIV"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/lager/warenausgang" -Method Post -Body $zuVielBody -Headers $headers -ContentType "application/json"
    Assert $false "Warenausgang mit zu hoher Menge wurde faelschlicherweise akzeptiert!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert ($statusCode -eq 400) "Warenausgang mit zu hoher Menge korrekt abgelehnt (HTTP $statusCode)"
}

# ---------------------------------------------------------
# 8. Bestandskorrektur buchen
# ---------------------------------------------------------
Write-Step "8. Bestandskorrektur buchen (Ziel-Menge: 100)"

$korrekturBody = @{
    artikelId = $artikelId
    neueMenge = 100
    referenz  = "A62-TEST-KORREKTUR"
    bemerkung = "A62 E2E-Test Inventurkorrektur"
} | ConvertTo-Json

$korrekturResult = Invoke-RestMethod -Uri "$baseUrl/lager/korrektur" -Method Post -Body $korrekturBody -Headers $headers -ContentType "application/json"
Write-Host "Neuer Bestand laut Antwort: $($korrekturResult.menge)"

# ---------------------------------------------------------
# 9. Bestand nach Korrektur pruefen
# ---------------------------------------------------------
Write-Step "9. Bestand nach Korrektur pruefen"

$nachKorrektur = Invoke-RestMethod -Uri "$baseUrl/lager/bestand/$artikelId" -Method Get -Headers $headers
Assert ([decimal]$nachKorrektur.menge -eq 100) "Bestand nach Korrektur = 100 (tatsaechlich: $($nachKorrektur.menge))"

Write-Host ""
Write-Host "=== A62 (Teil 1, ohne Bundle-Verkauf) abgeschlossen ===" -ForegroundColor Cyan
Write-Host "Offener Punkt: bundleVerkaufBuchen() noch nicht getestet (fehlende Bundle-Testdaten)." -ForegroundColor Yellow
