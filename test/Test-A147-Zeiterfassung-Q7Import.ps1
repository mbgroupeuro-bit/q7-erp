# ============================================================
# Q7-ERP — Test A147 (Schritt 10): Zeiterfassung "gearbeitet ja/nein"
# + Q7-Import ueber Connector-Schicht
# Ausfuehren aus: D:\Projekt2027\ERP System\test\
# ============================================================

$BaseUrl = "http://localhost:3000"
$MitarbeiterA = "cfbfea35-7085-4b3c-8b06-4303b2b00535"
$MitarbeiterB = "a0af4cac-a29c-4bdf-99cc-73ba11f13012"
$GeheimnisA = "a75-test-geheimnis-2026"

$global:TestsGesamt = 0
$global:TestsOk = 0

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Assert {
    param([bool]$Bedingung, [string]$Beschreibung)
    $global:TestsGesamt++
    if ($Bedingung) {
        $global:TestsOk++
        Write-Host "  [OK] $Beschreibung" -ForegroundColor Green
    } else {
        Write-Host "  [FEHLER] $Beschreibung" -ForegroundColor Red
    }
}

function Berechne-Signatur {
    param(
        [string]$Geheimnis,
        [string]$LizenznehmerId,
        [string]$AnfrageId,
        [string]$Zeitstempel
    )
    $nachricht = "$LizenznehmerId.$AnfrageId.$Zeitstempel"
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Geheimnis)
    $hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($nachricht))
    return ([System.BitConverter]::ToString($hashBytes) -replace '-', '').ToLower()
}

# ------------------------------------------------------------
# LOGIN — Lizenznehmer A (fuer normale API-Aufrufe)
# ------------------------------------------------------------
Write-Step "Login Lizenznehmer A"

$loginA = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email    = "admin@test-gmbh.de"
    passwort = "Admin2026!"
} | ConvertTo-Json)
$tokenA = $loginA.access_token
$headersA = @{ Authorization = "Bearer $tokenA" }
Assert ($null -ne $tokenA) "Login Lizenznehmer A erfolgreich"

# ------------------------------------------------------------
# TEIL 1 — POST /zeiterfassung mit gearbeitet: false
# ------------------------------------------------------------
Write-Step "POST /zeiterfassung mit gearbeitet: false (Mitarbeiter A)"

$eintragNichtGearbeitet = Invoke-RestMethod -Uri "$BaseUrl/zeiterfassung" -Method Post -Headers $headersA -ContentType "application/json" -Body (@{
    mitarbeiterId = $MitarbeiterA
    datum         = "2026-08-20"
    gearbeitet    = $false
} | ConvertTo-Json)

Assert ($null -ne $eintragNichtGearbeitet.id) "Eintrag (gearbeitet=false) wurde angelegt"
Assert ($eintragNichtGearbeitet.gearbeitet -eq $false) "Feld 'gearbeitet' korrekt als false gespeichert"

# Zusaetzlich einen gearbeitet=true Eintrag fuer die Monatsuebersicht anlegen
Write-Step "POST /zeiterfassung mit gearbeitet: true (Mitarbeiter A, anderer Tag)"

$eintragGearbeitet = Invoke-RestMethod -Uri "$BaseUrl/zeiterfassung" -Method Post -Headers $headersA -ContentType "application/json" -Body (@{
    mitarbeiterId = $MitarbeiterA
    datum         = "2026-08-21"
    gearbeitet    = $true
} | ConvertTo-Json)

Assert ($null -ne $eintragGearbeitet.id) "Eintrag (gearbeitet=true) wurde angelegt"

# ------------------------------------------------------------
# TEIL 2 — GET Monatsuebersicht
# ------------------------------------------------------------
Write-Step "GET /zeiterfassung/mitarbeiter/:id/monatsuebersicht?jahr=2026&monat=8"

$uebersicht = Invoke-RestMethod -Uri "$BaseUrl/zeiterfassung/mitarbeiter/$MitarbeiterA/monatsuebersicht`?jahr=2026&monat=8" -Method Get -Headers $headersA

Assert ($null -ne $uebersicht.anzahlGearbeitet) "Feld 'anzahlGearbeitet' ist vorhanden"
Assert ($null -ne $uebersicht.anzahlNichtGearbeitet) "Feld 'anzahlNichtGearbeitet' ist vorhanden"
Assert ($null -ne $uebersicht.tage) "Feld 'tage[]' ist vorhanden"
Assert ($uebersicht.anzahlGearbeitet -ge 1) "Mindestens 1 gearbeiteter Tag gezaehlt"
Assert ($uebersicht.anzahlNichtGearbeitet -ge 1) "Mindestens 1 nicht gearbeiteter Tag gezaehlt"

Write-Host "  -> anzahlGearbeitet: $($uebersicht.anzahlGearbeitet), anzahlNichtGearbeitet: $($uebersicht.anzahlNichtGearbeitet), Anzahl Tage-Eintraege: $($uebersicht.tage.Count)" -ForegroundColor Gray

# ------------------------------------------------------------
# TEIL 3 — POST /connector/q7/zeiterfassung (signierter Import)
# ------------------------------------------------------------
Write-Step "POST /connector/q7/zeiterfassung — signierter Q7-Import (Lizenznehmer A)"

$lizenznehmerIdA = "ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e"
$anfrageId = [guid]::NewGuid().ToString()
$zeitstempel = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$signatur = Berechne-Signatur -Geheimnis $GeheimnisA -LizenznehmerId $lizenznehmerIdA -AnfrageId $anfrageId -Zeitstempel $zeitstempel

$connectorHeaders = @{
    "X-Lizenznehmer-Id"   = $lizenznehmerIdA
    "X-Anfrage-Id"        = $anfrageId
    "X-Q7ERP-Timestamp"   = $zeitstempel
    "X-Q7ERP-Signature"   = $signatur
}

$importDaten = @(
    @{ mitarbeiterId = $MitarbeiterA; datum = "2026-08-27"; gearbeitet = $true },
    @{ mitarbeiterId = $MitarbeiterA; datum = "2026-08-24"; gearbeitet = $false }
)

try {
    $importErgebnis = Invoke-RestMethod -Uri "$BaseUrl/connector/q7/zeiterfassung" -Method Post -Headers $connectorHeaders -ContentType "application/json" -Body ($importDaten | ConvertTo-Json)
    Assert $true "Signierter Q7-Import wurde angenommen (kein Fehler geworfen)"
    Write-Host "  -> Antwort: $($importErgebnis | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Assert $false "Signierter Q7-Import wurde abgelehnt (Status $status): $body"
    Write-Host "  HINWEIS: Falls Status 403 'Unbekannte IP-Adresse' -> das ist beim allerersten Zugriff dieser IP erwartetes Verhalten (Tuersteher-Regel), kein Bug. Bitte Ruecksprache halten." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# TEIL 4 — Negativfall: falsche Signatur muss abgelehnt werden
# ------------------------------------------------------------
Write-Step "Negativfall: Q7-Import mit falscher Signatur (muss abgelehnt werden)"

$falscheHeaders = @{
    "X-Lizenznehmer-Id"   = $lizenznehmerIdA
    "X-Anfrage-Id"        = [guid]::NewGuid().ToString()
    "X-Q7ERP-Timestamp"   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    "X-Q7ERP-Signature"   = "0000000000000000000000000000000000000000000000000000000000000000"
}

try {
    Invoke-RestMethod -Uri "$BaseUrl/connector/q7/zeiterfassung" -Method Post -Headers $falscheHeaders -ContentType "application/json" -Body ($importDaten | ConvertTo-Json)
    Assert $false "Falsche Signatur haette abgelehnt werden muessen"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert ($status -eq 403) "Falsche Signatur wurde korrekt mit 403 abgelehnt"
}

# ------------------------------------------------------------
# AUFRAEUMEN (nur die ueber die normale API angelegten Eintraege;
# Connector-Import wird bewusst NICHT zurueckgerollt, da Prod-Verhalten
# geprueft werden soll)
# ------------------------------------------------------------
# Hinweis: ZeiterfassungController bietet laut Vorgabe keine
# delete-Methode-Aenderung in diesem Schritt -- falls remove() existiert,
# hier optional ergaenzen. Aktuell bewusst weggelassen, um nichts zu
# erraten, das nicht Teil der Anleitung war.

# ------------------------------------------------------------
# ZUSAMMENFASSUNG
# ------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "ERGEBNIS: $global:TestsOk von $global:TestsGesamt Tests erfolgreich" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

if ($global:TestsOk -eq $global:TestsGesamt) {
    Write-Host "ALLE TESTS BESTANDEN" -ForegroundColor Green
} else {
    Write-Host "ES GIBT FEHLGESCHLAGENE TESTS — siehe oben" -ForegroundColor Red
}
