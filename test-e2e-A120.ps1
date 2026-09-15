# =====================================================================
# A120 - Gesamttest End-to-End ueber alle Module
# Q7-ERP, Admin-Testskript, 23.08.2026
# Ablauf (analog A114, erweitert um A119):
#   Partner -> 2 Artikel (1 normal, 1 Bundle) -> Bundle-Position anlegen
#   -> Konto -> Wareneingang -> Bundle-Verkauf (Warenausgang) ->
#   Bestandspruefung -> Bundle-Position loeschen (A119) ->
#   Q7-Verbindungsstatus abrufen
#
# ERWARTUNG: Jeder Schritt liefert einen Erfolgsstatus (2xx). Am Ende
# eine klare Zusammenfassung, welcher Schritt OK/FEHLER war.
# =====================================================================

$baseUrl = "http://localhost:3000"
$ergebnisse = @()

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

function Test-Schritt {
    param(
        [string]$Nr,
        [string]$Bezeichnung,
        [scriptblock]$Aktion
    )
    Write-Host ""
    Write-Host "=== SCHRITT ${Nr}: $Bezeichnung ===" -ForegroundColor Cyan
    try {
        $ergebnis = & $Aktion
        Write-Host "OK" -ForegroundColor Green
        $script:ergebnisse += "$Nr. ${Bezeichnung}: OK"
        return $ergebnis
    } catch {
        Write-Host "FEHLER: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
        $script:ergebnisse += "$Nr. ${Bezeichnung}: FEHLER - $($_.Exception.Message)"
        return $null
    }
}

# --- Bekannter Standard-Lagerort A aus Testumgebung (siehe Memory) ---
# Falls sich das geaendert hat, bitte diese Zeile anpassen.
$lagerortId = "c6ab56c9-88fa-44b0-9d46-331fed0d65a0"

Write-Host ""
Write-Host "=== SCHRITT 1: Login als Lizenznehmer A (test-gmbh) ===" -ForegroundColor Cyan
$tokenA = Invoke-Login -Email "admin@test-gmbh.de" -Passwort "Admin2026!"
if (-not $tokenA) { Write-Host "Abbruch: Login fehlgeschlagen." -ForegroundColor Red; exit }
$headers = @{ Authorization = "Bearer $tokenA"; "Content-Type" = "application/json" }
Write-Host "OK" -ForegroundColor Green
$ergebnisse += "1. Login: OK"

# --- Schritt 2: Partner anlegen ---
$partner = Test-Schritt -Nr "2" -Bezeichnung "Partner anlegen" -Aktion {
    $body = @{
        name = "A120 Test Partner"
        typ  = "KUNDE"
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/partner" -Headers $headers -Body $body
}

# --- Schritt 3: Bestandteil-Artikel anlegen ---
$bestandteil = Test-Schritt -Nr "3" -Bezeichnung "Bestandteil-Artikel anlegen" -Aktion {
    $body = @{
        artikelnummer = "A120-BESTANDTEIL"
        name          = "A120 Test Bestandteil"
        grundpreis    = 5.00
        einheit       = "Stueck"
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel" -Headers $headers -Body $body
}

# --- Schritt 4: Bundle-Artikel anlegen ---
$bundle = Test-Schritt -Nr "4" -Bezeichnung "Bundle-Artikel anlegen" -Aktion {
    $body = @{
        artikelnummer = "A120-BUNDLE"
        name          = "A120 Test Bundle"
        grundpreis    = 15.00
        einheit       = "Stueck"
        istBundle     = $true
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel" -Headers $headers -Body $body
}

# --- Schritt 5: Bundle-Position anlegen ---
$position = Test-Schritt -Nr "5" -Bezeichnung "Bundle-Position anlegen (2x Bestandteil je Bundle)" -Aktion {
    $body = @{
        bestandteilArtikelId = $bestandteil.id
        menge                = 2
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel/$($bundle.id)/bundle-positionen" -Headers $headers -Body $body
}

# --- Schritt 6: Konto anlegen ---
$konto = Test-Schritt -Nr "6" -Bezeichnung "Konto anlegen" -Aktion {
    $body = @{
        kontonummer = "A120-1000"
        bezeichnung = "A120 Test Konto"
        kontotyp    = "AKTIV_KONTO"
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/konto" -Headers $headers -Body $body
}

# --- Schritt 7: Wareneingang fuer Bestandteil-Artikel buchen (genug fuer Bundle-Verkauf) ---
$null = Test-Schritt -Nr "7" -Bezeichnung "Wareneingang buchen (Bestandteil, Menge 10)" -Aktion {
    $body = @{
        artikelId  = $bestandteil.id
        lagerortId = $lagerortId
        menge      = 10
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/lager/wareneingang" -Headers $headers -Body $body
}

# --- Schritt 8: Bundle-Verkauf buchen (eigener Endpunkt, nicht warenausgang) ---
$null = Test-Schritt -Nr "8" -Bezeichnung "Bundle-Verkauf buchen (Menge 1 Bundle)" -Aktion {
    $body = @{
        artikelId  = $bundle.id
        lagerortId = $lagerortId
        menge      = 1
    } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$baseUrl/lager/bundle-verkauf" -Headers $headers -Body $body
}

# --- Schritt 9: Bestand pruefen (Bestandteil sollte um 2 reduziert sein: 10 -> 8) ---
Test-Schritt -Nr "9" -Bezeichnung "Bestandspruefung nach Bundle-Verkauf" -Aktion {
    $bestand = Invoke-RestMethod -Method GET -Uri "$baseUrl/lager/bestand" -Headers $headers
    $bestandteilBestand = $bestand | Where-Object { $_.artikelId -eq $bestandteil.id -and $_.lagerortId -eq $lagerortId }
    if (-not $bestandteilBestand) {
        throw "Kein Bestandsdatensatz fuer Bestandteil-Artikel gefunden."
    }
    Write-Host "Aktueller Bestand Bestandteil: $($bestandteilBestand.menge) (erwartet: 8)" -ForegroundColor DarkGray
    if ($bestandteilBestand.menge -ne 8) {
        throw "Bestand stimmt nicht: erwartet 8, tatsaechlich $($bestandteilBestand.menge)"
    }
}

# --- Schritt 10 (NEU, A119): Bundle-Position wieder loeschen ---
$null = Test-Schritt -Nr "10" -Bezeichnung "Bundle-Position loeschen (A119)" -Aktion {
    Invoke-RestMethod -Method DELETE -Uri "$baseUrl/artikel/$($bundle.id)/bundle-positionen/$($position.id)" -Headers $headers
}

# --- Schritt 11 (NEU, A119): Kontrolle, dass Position wirklich weg ist ---
Test-Schritt -Nr "11" -Bezeichnung "Kontrolle: Bundle-Position nicht mehr vorhanden" -Aktion {
    $positionen = Invoke-RestMethod -Method GET -Uri "$baseUrl/artikel/$($bundle.id)/bundle-positionen" -Headers $headers
    $gefunden = $positionen | Where-Object { $_.id -eq $position.id }
    if ($gefunden) {
        throw "Position ist trotz Loeschung noch vorhanden."
    }
}

# --- Schritt 12: Q7-Verbindungsstatus abrufen ---
Test-Schritt -Nr "12" -Bezeichnung "Q7-Verbindungsstatus abrufen" -Aktion {
    $status = Invoke-RestMethod -Method GET -Uri "$baseUrl/verbindung/status" -Headers $headers
    Write-Host "Verbindungsstatus: $($status | ConvertTo-Json -Depth 3 -Compress)" -ForegroundColor DarkGray
    $status
}

Write-Host ""
Write-Host "=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
foreach ($e in $ergebnisse) {
    if ($e -like "*FEHLER*") {
        Write-Host $e -ForegroundColor Red
    } else {
        Write-Host $e -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Hinweis: Test-Daten (Partner 'A120 Test Partner', Artikel A120-*," -ForegroundColor DarkGray
Write-Host "Konto A120-1000) bleiben in der DB stehen (kein automatisches Aufraeumen)." -ForegroundColor DarkGray
Write-Host ""
Write-Host "=== TEST ENDE ===" -ForegroundColor Cyan
