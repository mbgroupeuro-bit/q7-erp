# =====================================================================
# A114 - Gesamttest: komplettes Dashboard End-to-End
# Q7-ERP, Admin-Testskript, 21.08.2026
#
# ABLAUF (zusammenhaengender Geschaeftsvorgang, kein Einzeltest):
# 1. Login als Lizenznehmer A (test-gmbh)
# 2. Partner anlegen (Lieferant)
# 3. Artikel 1 anlegen (Stufe 1, Grundbestandteil)
# 4. Artikel 2 anlegen als Bundle (istBundle = true)
# 5. Bundle-Position hinzufuegen (Artikel 2 enthaelt 2x Artikel 1)
# 6. Konto anlegen
# 7. Wareneingang fuer Artikel 1 buchen (Menge 10)
# 8. Bundle-Verkauf: 3x Artikel 2 verkaufen (bucht 6x Artikel 1 ab)
# 9. Bestandsuebersicht abfragen und pruefen: Artikel 1 sollte bei 4 stehen
# 10. Q7-Verbindungsstatus abfragen
#
# Jeder Schritt wird einzeln ausgewertet. Ein Fehlschlag in einem
# Schritt stoppt nicht das gesamte Skript, damit man sieht, wie weit
# der Ablauf tatsaechlich kommt.
# =====================================================================

$baseUrl = "http://localhost:3000"
$zeitstempel = Get-Date -Format "yyyyMMddHHmmss"
$ergebnisse = @()

function Log-Ergebnis {
    param([string]$Schritt, [bool]$Erfolg, [string]$Detail = "")
    if ($Erfolg) {
        Write-Host "OK   - $Schritt" -ForegroundColor Green
        $script:ergebnisse += "OK   - $Schritt"
    } else {
        Write-Host "FEHL - $Schritt" -ForegroundColor Red
        $script:ergebnisse += "FEHL - $Schritt"
    }
    if ($Detail) {
        Write-Host "       $Detail" -ForegroundColor DarkGray
    }
}

function Invoke-Login {
    param([string]$Email, [string]$Passwort)
    $body = @{ email = $Email; passwort = $Passwort } | ConvertTo-Json
    $response = Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $body
    $token = $response.access_token
    if (-not $token) { $token = $response.token }
    if (-not $token) { $token = $response.accessToken }
    return $token
}

Write-Host ""
Write-Host "=== SCHRITT 1: Login als Lizenznehmer A (test-gmbh) ===" -ForegroundColor Cyan
try {
    $token = Invoke-Login -Email "admin@test-gmbh.de" -Passwort "Admin2026!"
    if (-not $token) { throw "Kein Token erhalten." }
    Log-Ergebnis "Login" $true
} catch {
    Log-Ergebnis "Login" $false $_.Exception.Message
    Write-Host "Abbruch: ohne Login kann der Rest nicht getestet werden." -ForegroundColor Red
    exit
}

$headers = @{ Authorization = "Bearer $token" }
$headersJson = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host ""
Write-Host "=== SCHRITT 2: Partner anlegen (Lieferant) ===" -ForegroundColor Cyan
$partnerId = $null
try {
    $bodyPartner = @{
        name = "E2E-Test-Lieferant-$zeitstempel"
        typ  = "LIEFERANT"
    } | ConvertTo-Json
    $partner = Invoke-RestMethod -Method POST -Uri "$baseUrl/partner" -Headers $headersJson -Body $bodyPartner
    $partnerId = $partner.id
    Log-Ergebnis "Partner anlegen" $true "ID: $partnerId"
} catch {
    Log-Ergebnis "Partner anlegen" $false $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== SCHRITT 3: Artikel 1 anlegen (Grundbestandteil) ===" -ForegroundColor Cyan
$artikel1Id = $null
try {
    $bodyArtikel1 = @{
        artikelnummer = "E2E-A1-$zeitstempel"
        name          = "E2E Grundbestandteil"
        grundpreis    = 5.50
        einheit       = "Stueck"
    } | ConvertTo-Json
    $artikel1 = Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel" -Headers $headersJson -Body $bodyArtikel1
    $artikel1Id = $artikel1.id
    Log-Ergebnis "Artikel 1 anlegen" $true "ID: $artikel1Id"
} catch {
    Log-Ergebnis "Artikel 1 anlegen" $false $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== SCHRITT 4: Artikel 2 anlegen (Bundle) ===" -ForegroundColor Cyan
$artikel2Id = $null
try {
    $bodyArtikel2 = @{
        artikelnummer = "E2E-A2-$zeitstempel"
        name          = "E2E Bundle Testpaket"
        grundpreis    = 15.00
        einheit       = "Stueck"
        istBundle     = $true
    } | ConvertTo-Json
    $artikel2 = Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel" -Headers $headersJson -Body $bodyArtikel2
    $artikel2Id = $artikel2.id
    Log-Ergebnis "Artikel 2 (Bundle) anlegen" $true "ID: $artikel2Id"
} catch {
    Log-Ergebnis "Artikel 2 (Bundle) anlegen" $false $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== SCHRITT 5: Bundle-Position hinzufuegen (Bundle enthaelt 2x Grundbestandteil) ===" -ForegroundColor Cyan
if ($artikel1Id -and $artikel2Id) {
    try {
        $bodyPosition = @{
            bestandteilArtikelId = $artikel1Id
            menge = 2
        } | ConvertTo-Json
        $position = Invoke-RestMethod -Method POST -Uri "$baseUrl/artikel/$artikel2Id/bundle-positionen" -Headers $headersJson -Body $bodyPosition
        Log-Ergebnis "Bundle-Position hinzufuegen" $true "Bundle $artikel2Id enthaelt 2x $artikel1Id"
    } catch {
        Log-Ergebnis "Bundle-Position hinzufuegen" $false $_.ErrorDetails.Message
    }
} else {
    Log-Ergebnis "Bundle-Position hinzufuegen" $false "Uebersprungen, da Artikel 1 oder 2 nicht angelegt werden konnten."
}

Write-Host ""
Write-Host "=== SCHRITT 6: Konto anlegen ===" -ForegroundColor Cyan
try {
    $bodyKonto = @{
        kontonummer = "E2E-$zeitstempel"
        bezeichnung = "E2E Testkonto"
        kontotyp    = "ERTRAG"
    } | ConvertTo-Json
    $konto = Invoke-RestMethod -Method POST -Uri "$baseUrl/konto" -Headers $headersJson -Body $bodyKonto
    Log-Ergebnis "Konto anlegen" $true "ID: $($konto.id)"
} catch {
    Log-Ergebnis "Konto anlegen" $false $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== SCHRITT 7: Wareneingang fuer Artikel 1 buchen (Menge 10) ===" -ForegroundColor Cyan
if ($artikel1Id) {
    try {
        $bodyWareneingang = @{ artikelId = $artikel1Id; menge = 10 } | ConvertTo-Json
        $ergebnisWareneingang = Invoke-RestMethod -Method POST -Uri "$baseUrl/lager/wareneingang" -Headers $headersJson -Body $bodyWareneingang
        Log-Ergebnis "Wareneingang buchen" $true "Neuer Bestand: $($ergebnisWareneingang.menge)"
    } catch {
        Log-Ergebnis "Wareneingang buchen" $false $_.ErrorDetails.Message
    }
} else {
    Log-Ergebnis "Wareneingang buchen" $false "Uebersprungen, da Artikel 1 nicht angelegt werden konnte."
}

Write-Host ""
Write-Host "=== SCHRITT 8: Bundle-Verkauf (3x Bundle verkaufen, sollte 6x Grundbestandteil abbuchen) ===" -ForegroundColor Cyan
if ($artikel2Id) {
    try {
        $bodyBundleVerkauf = @{ artikelId = $artikel2Id; menge = 3 } | ConvertTo-Json
        $ergebnisBundleVerkauf = Invoke-RestMethod -Method POST -Uri "$baseUrl/lager/bundle-verkauf" -Headers $headersJson -Body $bodyBundleVerkauf
        Log-Ergebnis "Bundle-Verkauf buchen" $true "Verkaufte Menge: $($ergebnisBundleVerkauf.verkaufteMenge)"
    } catch {
        Log-Ergebnis "Bundle-Verkauf buchen" $false $_.ErrorDetails.Message
    }
} else {
    Log-Ergebnis "Bundle-Verkauf buchen" $false "Uebersprungen, da Artikel 2 nicht angelegt werden konnte."
}

Write-Host ""
Write-Host "=== SCHRITT 9: Bestand pruefen (Artikel 1 sollte bei 10 - 6 = 4 stehen) ===" -ForegroundColor Cyan
if ($artikel1Id) {
    try {
        $bestand = Invoke-RestMethod -Method GET -Uri "$baseUrl/lager/bestand/$artikel1Id" -Headers $headers
        $erwarteteMenge = 4
        if ([decimal]$bestand.menge -eq $erwarteteMenge) {
            Log-Ergebnis "Bestandspruefung nach Bundle-Verkauf" $true "Bestand ist korrekt: $($bestand.menge)"
        } else {
            Log-Ergebnis "Bestandspruefung nach Bundle-Verkauf" $false "Erwartet: $erwarteteMenge, tatsaechlich: $($bestand.menge)"
        }
    } catch {
        Log-Ergebnis "Bestandspruefung nach Bundle-Verkauf" $false $_.ErrorDetails.Message
    }
} else {
    Log-Ergebnis "Bestandspruefung nach Bundle-Verkauf" $false "Uebersprungen, da Artikel 1 nicht angelegt werden konnte."
}

Write-Host ""
Write-Host "=== SCHRITT 10: Q7-Verbindungsstatus abfragen ===" -ForegroundColor Cyan
try {
    $verbindungsstatus = Invoke-RestMethod -Method GET -Uri "$baseUrl/verbindung/status" -Headers $headers
    Log-Ergebnis "Q7-Verbindungsstatus abfragen" $true ($verbindungsstatus | ConvertTo-Json -Compress)
} catch {
    Log-Ergebnis "Q7-Verbindungsstatus abfragen" $false $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
foreach ($e in $ergebnisse) {
    if ($e -like "FEHL*") {
        Write-Host $e -ForegroundColor Red
    } else {
        Write-Host $e -ForegroundColor Green
    }
}

$anzahlFehler = ($ergebnisse | Where-Object { $_ -like "FEHL*" }).Count
Write-Host ""
if ($anzahlFehler -eq 0) {
    Write-Host "ALLE SCHRITTE ERFOLGREICH ($($ergebnisse.Count) von $($ergebnisse.Count))" -ForegroundColor Green
} else {
    Write-Host "$anzahlFehler von $($ergebnisse.Count) Schritten fehlgeschlagen - bitte oben pruefen." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== TEST ENDE ===" -ForegroundColor Cyan
