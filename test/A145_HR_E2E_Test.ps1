# A145_HR_E2E_Test.ps1
# Gesamttest Block C (HR): Mitarbeiter (inkl. search, A144), Zeiterfassung (A138),
# Vorschuss (A140) im Zusammenspiel + eigener Mandantentrennung-Abschnitt.
# Ausfuehren: cd "D:\Projekt2027\ERP System\test" ; .\A145_HR_E2E_Test.ps1

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

# ===========================================================
# ABSCHNITT 1: MITARBEITER (inkl. search, A144)
# ===========================================================
Write-Host "`n=== Abschnitt 1: Mitarbeiter CRUD + search() ===" -ForegroundColor Cyan

# --- create() Tageslohn-Mitarbeiter fuer A ---
$mitarbeiterBodyA = @{ name = "A145 HR Test Tageslohn"; telefon = "0170-2220001"; verguetungsArt = "TAGESLOHN"; verguetungsBetrag = 150 } | ConvertTo-Json
try {
    $mitarbeiterA = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Post -Headers $headersA -Body $mitarbeiterBodyA -ContentType "application/json"
    $mitarbeiterIdA = $mitarbeiterA.id
    Write-Result "Mitarbeiter create() Tageslohn" ($null -ne $mitarbeiterIdA)
} catch {
    Write-Result "Mitarbeiter create() Tageslohn" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- create() Monatsgehalt-Mitarbeiter mit Provision fuer A (fuer search-Abgrenzung) ---
$mitarbeiterBodyA2 = @{ name = "A145 HR Test Monatsgehalt"; telefon = "0170-2220002"; verguetungsArt = "MONATSGEHALT"; verguetungsBetrag = 4000; provisionBetrag = 300 } | ConvertTo-Json
try {
    $mitarbeiterA2 = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter" -Method Post -Headers $headersA -Body $mitarbeiterBodyA2 -ContentType "application/json"
    $mitarbeiterIdA2 = $mitarbeiterA2.id
    Write-Result "Mitarbeiter create() Monatsgehalt + Provision" ($null -ne $mitarbeiterIdA2)
} catch {
    Write-Result "Mitarbeiter create() Monatsgehalt + Provision" $false
    Write-Host $_.Exception.Message
    exit 1
}

# --- findOne() ---
try {
    $einzeln = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA" -Method Get -Headers $headersA
    Write-Result "Mitarbeiter findOne()" ($einzeln.id -eq $mitarbeiterIdA)
} catch { Write-Result "Mitarbeiter findOne()" $false }

# --- update() ---
$updateBody = @{ telefon = "0170-9999999" } | ConvertTo-Json
try {
    $aktualisiert = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA" -Method Patch -Headers $headersA -Body $updateBody -ContentType "application/json"
    Write-Result "Mitarbeiter update()" ($aktualisiert.telefon -eq "0170-9999999")
} catch { Write-Result "Mitarbeiter update()" $false }

# --- search() nach Teilstring "Tageslohn" darf nur den ersten Mitarbeiter finden ---
try {
    $suchergebnis = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/search?q=A145 HR Test Tageslohn" -Method Get -Headers $headersA
    $treffer = @($suchergebnis | Where-Object { $_.id -eq $mitarbeiterIdA })
    $keinFalscherTreffer = @($suchergebnis | Where-Object { $_.id -eq $mitarbeiterIdA2 }).Count -eq 0
    Write-Result "Mitarbeiter search() findet Treffer" ($treffer.Count -eq 1)
    Write-Result "Mitarbeiter search() filtert korrekt (kein Fehltreffer)" $keinFalscherTreffer
} catch { Write-Result "Mitarbeiter search()" $false }

# ===========================================================
# ABSCHNITT 2: ZEITERFASSUNG (A138) fuer Tageslohn-Mitarbeiter
# ===========================================================
Write-Host "`n=== Abschnitt 2: Zeiterfassung im HR-Zusammenspiel ===" -ForegroundColor Cyan

$arbeitstagIds = @()
$arbeitstagDaten = @("2026-08-03", "2026-08-04", "2026-08-05")
foreach ($datum in $arbeitstagDaten) {
    $body = @{ mitarbeiterId = $mitarbeiterIdA; datum = $datum } | ConvertTo-Json
    try {
        $eintrag = Invoke-RestMethod -Uri "$baseUrl/zeiterfassung" -Method Post -Headers $headersA -Body $body -ContentType "application/json"
        $arbeitstagIds += $eintrag.id
        Write-Result "Arbeitstag create() $datum" ($null -ne $eintrag.id)
    } catch {
        Write-Result "Arbeitstag create() $datum" $false
        Write-Host $_.Exception.Message
    }
}

try {
    $zeitUebersicht = Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/mitarbeiter/$mitarbeiterIdA/monatsuebersicht?jahr=2026&monat=8" -Method Get -Headers $headersA
    # A147-ANPASSUNG (28.08.2026): Feld hiess vorher "anzahlArbeitstage",
    # heisst seit A147 (gearbeitet ja/nein) "anzahlGearbeitet". Alle 3
    # angelegten Arbeitstage oben haben kein "gearbeitet"-Feld gesetzt,
    # greift also der Schema-Default true -> muessen als "gearbeitet" zaehlen.
    Write-Result "Zeiterfassung monatsUebersicht() anzahlGearbeitet = 3" ($zeitUebersicht.anzahlGearbeitet -eq 3)
} catch { Write-Result "Zeiterfassung monatsUebersicht()" $false }

# ===========================================================
# ABSCHNITT 3: VORSCHUSS (A140) fuer Tageslohn-Mitarbeiter
# ===========================================================
Write-Host "`n=== Abschnitt 3: Vorschuss im HR-Zusammenspiel ===" -ForegroundColor Cyan

$vorschussIds = @()
$vorschussDaten = @(
    @{ datum = "2026-08-10"; betrag = 200 },
    @{ datum = "2026-08-20"; betrag = 100 }
)
foreach ($v in $vorschussDaten) {
    $body = @{ mitarbeiterId = $mitarbeiterIdA; datum = $v.datum; betrag = $v.betrag } | ConvertTo-Json
    try {
        $eintrag = Invoke-RestMethod -Uri "$baseUrl/vorschuss" -Method Post -Headers $headersA -Body $body -ContentType "application/json"
        $vorschussIds += $eintrag.id
        Write-Result "Vorschuss create() $($v.datum) / $($v.betrag)" ($null -ne $eintrag.id)
    } catch {
        Write-Result "Vorschuss create() $($v.datum) / $($v.betrag)" $false
        Write-Host $_.Exception.Message
    }
}

try {
    $vorschussUebersicht = Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterIdA/monatsuebersicht?jahr=2026&monat=8" -Method Get -Headers $headersA
    Write-Result "Vorschuss monatsUebersicht() anzahlVorschuesse = 2" ($vorschussUebersicht.anzahlVorschuesse -eq 2)
    Write-Result "Vorschuss monatsUebersicht() summeVorschuesse = 300" ([decimal]$vorschussUebersicht.summeVorschuesse -eq 300)
} catch { Write-Result "Vorschuss monatsUebersicht()" $false }

# ===========================================================
# ABSCHNITT 4: MANDANTENTRENNUNG (Block C gesamt)
# ===========================================================
Write-Host "`n=== Abschnitt 4: Mandantentrennung (HR gesamt) ===" -ForegroundColor Cyan

# --- B darf A's Mitarbeiter nicht einzeln abrufen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Mitarbeiter findOne() - B blockiert" $false
} catch {
    Write-Result "IDOR Mitarbeiter findOne() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B darf A's Mitarbeiter nicht aktualisieren ---
try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA" -Method Patch -Headers $headersB -Body (@{ telefon = "hack" } | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Result "IDOR Mitarbeiter update() - B blockiert" $false
} catch {
    Write-Result "IDOR Mitarbeiter update() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B's search() darf A's Mitarbeiter nicht finden ---
try {
    $bSuche = Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/search?q=A145 HR Test" -Method Get -Headers $headersB
    $bSiehtA = @($bSuche | Where-Object { $_.id -eq $mitarbeiterIdA -or $_.id -eq $mitarbeiterIdA2 }).Count -eq 0
    Write-Result "IDOR Mitarbeiter search() - B sieht A's Daten nicht" $bSiehtA
} catch { Write-Result "IDOR Mitarbeiter search()" $false }

# --- B darf Zeiterfassung von A's Mitarbeiter nicht sehen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/mitarbeiter/$mitarbeiterIdA" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Zeiterfassung findAllByMitarbeiter() - B blockiert" $false
} catch {
    Write-Result "IDOR Zeiterfassung findAllByMitarbeiter() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B darf Vorschuss von A's Mitarbeiter nicht sehen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/vorschuss/mitarbeiter/$mitarbeiterIdA" -Method Get -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Vorschuss findAllByMitarbeiter() - B blockiert" $false
} catch {
    Write-Result "IDOR Vorschuss findAllByMitarbeiter() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# --- B darf A's Mitarbeiter nicht loeschen ---
try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA" -Method Delete -Headers $headersB -ErrorAction Stop
    Write-Result "IDOR Mitarbeiter remove() - B blockiert" $false
} catch {
    Write-Result "IDOR Mitarbeiter remove() - B blockiert (404)" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

# ===========================================================
# ABSCHNITT 5: AUFRAEUMEN
# ===========================================================
Write-Host "`n=== Abschnitt 5: Aufraeumen ===" -ForegroundColor Cyan

foreach ($id in $vorschussIds) {
    try { Invoke-RestMethod -Uri "$baseUrl/vorschuss/$id" -Method Delete -Headers $headersA | Out-Null } catch {
        Write-Result "Aufraeumen Vorschuss $id" $false
    }
}
foreach ($id in $arbeitstagIds) {
    try { Invoke-RestMethod -Uri "$baseUrl/zeiterfassung/$id" -Method Delete -Headers $headersA | Out-Null } catch {
        Write-Result "Aufraeumen Arbeitstag $id" $false
    }
}
try {
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA" -Method Delete -Headers $headersA | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/mitarbeiter/$mitarbeiterIdA2" -Method Delete -Headers $headersA | Out-Null
    Write-Result "Testmitarbeiter aufgeraeumt" $true
} catch {
    Write-Result "Testmitarbeiter aufgeraeumt" $false
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Test abgeschlossen: $fehlerZaehler Fehler ===" -ForegroundColor Cyan
