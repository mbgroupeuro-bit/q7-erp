# ============================================================
# Q7-ERP — E2E-Test: Vorschuss-Modul (A140)
# Muster: analog A139 (Zeiterfassung) — Write-Step/Assert-Struktur
# Ausfuehren aus: D:\Projekt2027\ERP System\test\
# ============================================================

$BaseUrl = "http://localhost:3000"

$MitarbeiterA = "cfbfea35-7085-4b3c-8b06-4303b2b00535"
$MitarbeiterB = "a0af4cac-a29c-4bdf-99cc-73ba11f13012"

$global:TestsGesamt = 0
$global:TestsOk = 0

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Assert {
    param(
        [bool]$Bedingung,
        [string]$Beschreibung
    )
    $global:TestsGesamt++
    if ($Bedingung) {
        $global:TestsOk++
        Write-Host "  [OK] $Beschreibung" -ForegroundColor Green
    } else {
        Write-Host "  [FEHLER] $Beschreibung" -ForegroundColor Red
    }
}

# ------------------------------------------------------------
# LOGIN — Lizenznehmer A und B
# ------------------------------------------------------------
Write-Step "Login Lizenznehmer A und B"

$loginA = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email    = "admin@test-gmbh.de"
    passwort = "Admin2026!"
} | ConvertTo-Json)
$tokenA = $loginA.access_token
$headersA = @{ Authorization = "Bearer $tokenA" }
Assert ($null -ne $tokenA) "Login Lizenznehmer A erfolgreich"

$loginB = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email    = "admin@testfirma-b.de"
    passwort = "TestFirmaB2026!"
} | ConvertTo-Json)
$tokenB = $loginB.access_token
$headersB = @{ Authorization = "Bearer $tokenB" }
Assert ($null -ne $tokenB) "Login Lizenznehmer B erfolgreich"

# ------------------------------------------------------------
# POSITIVFALL — Vorschuss anlegen (Lizenznehmer A)
# ------------------------------------------------------------
Write-Step "Vorschuss anlegen (Lizenznehmer A)"

$vorschussA1 = Invoke-RestMethod -Uri "$BaseUrl/vorschuss" -Method Post -Headers $headersA -ContentType "application/json" -Body (@{
    mitarbeiterId = $MitarbeiterA
    betrag        = 250.00
    datum         = "2026-08-15"
    bemerkung     = "E2E-Test Vorschuss 1"
} | ConvertTo-Json)

Assert ($null -ne $vorschussA1.id) "Vorschuss 1 (A) wurde angelegt, ID vorhanden"
Assert ($vorschussA1.mitarbeiterId -eq $MitarbeiterA) "Vorschuss 1 (A) ist dem richtigen Mitarbeiter zugeordnet"
Assert ([decimal]$vorschussA1.betrag -eq 250.00) "Vorschuss 1 (A) Betrag korrekt gespeichert"

# Zweiter Vorschuss am selben Tag — muss erlaubt sein (kein @@unique bei Vorschuss)
Write-Step "Zweiter Vorschuss am selben Tag (Lizenznehmer A) — muss erlaubt sein"

$vorschussA2 = Invoke-RestMethod -Uri "$BaseUrl/vorschuss" -Method Post -Headers $headersA -ContentType "application/json" -Body (@{
    mitarbeiterId = $MitarbeiterA
    betrag        = 100.00
    datum         = "2026-08-15"
    bemerkung     = "E2E-Test Vorschuss 2 (gleicher Tag)"
} | ConvertTo-Json)

Assert ($null -ne $vorschussA2.id) "Vorschuss 2 (A, gleicher Tag) wurde angelegt"
Assert ($vorschussA2.id -ne $vorschussA1.id) "Vorschuss 2 (A) hat eine eigene, andere ID"

# ------------------------------------------------------------
# NEGATIVFALL — Ungueltige Eingaben
# ------------------------------------------------------------
Write-Step "Negativfall: Betrag 0 (muss abgelehnt werden, Min 0.01)"

try {
    Invoke-RestMethod -Uri "$BaseUrl/vorschuss" -Method Post -Headers $headersA -ContentType "application/json" -Body (@{
        mitarbeiterId = $MitarbeiterA
        betrag        = 0
        datum         = "2026-08-15"
    } | ConvertTo-Json)
    Assert $false "Betrag 0 haette abgelehnt werden muessen"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert ($status -eq 400) "Betrag 0 wurde korrekt mit 400 abgelehnt"
}

Write-Step "Negativfall: fehlende mitarbeiterId (muss abgelehnt werden)"

try {
    Invoke-RestMethod -Uri "$BaseUrl/vorschuss" -Method Post -Headers $headersA -ContentType "application/json" -Body (@{
        betrag = 50
        datum  = "2026-08-15"
    } | ConvertTo-Json)
    Assert $false "Fehlende mitarbeiterId haette abgelehnt werden muessen"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert ($status -eq 400) "Fehlende mitarbeiterId wurde korrekt mit 400 abgelehnt"
}

# ------------------------------------------------------------
# LESEN — findAllByMitarbeiter + Monatsuebersicht
# ------------------------------------------------------------
Write-Step "Alle Vorschuesse fuer Mitarbeiter A lesen"

$listeA = Invoke-RestMethod -Uri "$BaseUrl/vorschuss/mitarbeiter/$MitarbeiterA" -Method Get -Headers $headersA

Assert ($listeA.Count -ge 2) "Mindestens 2 Vorschuesse fuer Mitarbeiter A gefunden"

Write-Step "Vorschuesse fuer Mitarbeiter A gefiltert nach Jahr/Monat (2026-08)"

$listeAGefiltert = Invoke-RestMethod -Uri "$BaseUrl/vorschuss/mitarbeiter/$MitarbeiterA`?jahr=2026&monat=8" -Method Get -Headers $headersA

Assert ($listeAGefiltert.Count -ge 2) "Gefilterte Liste (2026-08) enthaelt beide Testvorschuesse"

Write-Step "Monatsuebersicht fuer Mitarbeiter A (2026-08)"

$uebersichtA = Invoke-RestMethod -Uri "$BaseUrl/vorschuss/mitarbeiter/$MitarbeiterA/monatsuebersicht`?jahr=2026&monat=8" -Method Get -Headers $headersA

Assert ($null -ne $uebersichtA) "Monatsuebersicht wurde zurueckgegeben"

# ------------------------------------------------------------
# MANDANTENTRENNUNG — Lizenznehmer A darf B's Daten nicht sehen
# ------------------------------------------------------------
Write-Step "MANDANTENTRENNUNG: Vorschuss fuer Mitarbeiter B anlegen (als B)"

$vorschussB1 = Invoke-RestMethod -Uri "$BaseUrl/vorschuss" -Method Post -Headers $headersB -ContentType "application/json" -Body (@{
    mitarbeiterId = $MitarbeiterB
    betrag        = 500.00
    datum         = "2026-08-15"
    bemerkung     = "E2E-Test Vorschuss B"
} | ConvertTo-Json)

Assert ($null -ne $vorschussB1.id) "Vorschuss fuer Mitarbeiter B (als B) wurde angelegt"

Write-Step "MANDANTENTRENNUNG: A versucht, Vorschuesse von Mitarbeiter B zu lesen (muss leer/verboten sein)"

try {
    $fremdZugriff = Invoke-RestMethod -Uri "$BaseUrl/vorschuss/mitarbeiter/$MitarbeiterB" -Method Get -Headers $headersA
    # Falls kein Fehler kommt: darf keine Datensaetze von B enthalten
    Assert ($fremdZugriff.Count -eq 0) "A sieht keine Vorschuesse von Mitarbeiter B (leere Liste)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert ($status -eq 403 -or $status -eq 404) "Zugriff von A auf Mitarbeiter B wurde mit $status blockiert"
}

Write-Step "MANDANTENTRENNUNG: A versucht, Vorschuss von B per ID zu loeschen (muss fehlschlagen)"

try {
    Invoke-RestMethod -Uri "$BaseUrl/vorschuss/$($vorschussB1.id)" -Method Delete -Headers $headersA
    Assert $false "A durfte Vorschuss von B NICHT loeschen koennen — Sicherheitsluecke!"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert ($status -eq 403 -or $status -eq 404) "Loeschversuch von A auf B's Vorschuss wurde mit $status blockiert"
}

# Aufraeumen: Vorschuss B als B selbst wieder loeschen
Invoke-RestMethod -Uri "$BaseUrl/vorschuss/$($vorschussB1.id)" -Method Delete -Headers $headersB | Out-Null

# ------------------------------------------------------------
# LOESCHEN (immutable audit entry — kein update, nur delete)
# ------------------------------------------------------------
Write-Step "Vorschuss 2 (A) loeschen"

Invoke-RestMethod -Uri "$BaseUrl/vorschuss/$($vorschussA2.id)" -Method Delete -Headers $headersA | Out-Null

$listeANachLoeschen = Invoke-RestMethod -Uri "$BaseUrl/vorschuss/mitarbeiter/$MitarbeiterA" -Method Get -Headers $headersA
$nochVorhanden = $listeANachLoeschen | Where-Object { $_.id -eq $vorschussA2.id }
Assert ($null -eq $nochVorhanden) "Vorschuss 2 (A) wurde erfolgreich geloescht"

Write-Step "Negativfall: geloeschten Vorschuss erneut loeschen (muss fehlschlagen)"

try {
    Invoke-RestMethod -Uri "$BaseUrl/vorschuss/$($vorschussA2.id)" -Method Delete -Headers $headersA
    Assert $false "Erneutes Loeschen haette fehlschlagen muessen"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Assert ($status -eq 404) "Erneutes Loeschen wurde korrekt mit 404 abgelehnt"
}

# Aufraeumen: Vorschuss 1 (A) ebenfalls loeschen
Invoke-RestMethod -Uri "$BaseUrl/vorschuss/$($vorschussA1.id)" -Method Delete -Headers $headersA | Out-Null

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
