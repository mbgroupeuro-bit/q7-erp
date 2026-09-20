# aufraeumen.ps1
# Verschiebt Dateien in Unterordner. LOESCHT NICHTS.
#
# Probelauf (zeigt nur an):  .\aufraeumen.ps1
# Wirklich verschieben:      .\aufraeumen.ps1 -Ausfuehren

param([switch]$Ausfuehren)

$root = "D:\Projekt2027\ERP System"
Set-Location -LiteralPath $root

$datum  = Get-Date -Format "yyyy-MM-dd"
$archiv = Join-Path $root "_archiv\$datum"
$tests  = Join-Path $root "scripts\manuelle-tests"
$doku   = Join-Path $root "DOKU"

if ($Ausfuehren) {
    Write-Host "=== ECHTLAUF ===" -ForegroundColor Yellow
} else {
    Write-Host "=== PROBELAUF (es wird nichts veraendert) ===" -ForegroundColor Cyan
}

function Verschiebe {
    param([string]$Datei, [string]$Ziel)

    $quelle = Join-Path $root $Datei
    if (-not (Test-Path -LiteralPath $quelle)) {
        Write-Host "  uebersprungen (nicht vorhanden): $Datei" -ForegroundColor DarkGray
        return
    }

    $zielDatei = Join-Path $Ziel $Datei
    if (Test-Path -LiteralPath $zielDatei) {
        Write-Host "  uebersprungen (im Ziel schon vorhanden, Original bleibt liegen): $Datei" -ForegroundColor Yellow
        return
    }

    if ($Ausfuehren) {
        New-Item -ItemType Directory -Force -Path $Ziel | Out-Null
        Move-Item -LiteralPath $quelle -Destination $Ziel
        Write-Host "  verschoben: $Datei" -ForegroundColor Green
    } else {
        Write-Host "  wuerde verschieben: $Datei"
    }
}

# ---------------------------------------------------------------
# 1) Manuelle Test- und Setup-Skripte -> scripts\manuelle-tests
#    (bleiben erhalten, weil sie als Regressionstests nuetzlich sind)
# ---------------------------------------------------------------
Write-Host "`n[1] Test-Skripte -> scripts\manuelle-tests" -ForegroundColor Cyan
$testDateien = @(
    "A62_Lager_E2E_Test.ps1",
    "A62_Teil2_Bundle_Test.ps1",
    "a75-connector-test.js",
    "a75-geheimnis-setzen.js",
    "a76-mandantentrennung-test.js",
    "a76-verbindung-b-anlegen.js",
    "test-a71-connector-partner.mjs",
    "test-a71-connector.mjs",
    "test-a73-event.mjs",
    "test-e2e-A114.ps1",
    "test-e2e-A120.ps1",
    "test-mandantentrennung-A112.ps1",
    "test-mandantentrennung-A116.ps1",
    "test-mandantentrennung-A119.ps1",
    "test-mandantentrennung.js",
    "test-variante-anlegen.js"
)
foreach ($d in $testDateien) { Verschiebe -Datei $d -Ziel $tests }

# ---------------------------------------------------------------
# 2) Dokumente -> DOKU
# ---------------------------------------------------------------
Write-Host "`n[2] Dokumente -> DOKU" -ForegroundColor Cyan
$dokuDateien = @(
    "Q7ERP_Arbeitsplan_Absicherung_CRM_v4_1.md",
    "Q7ERP_Uebergabeprotokoll_2026-09-20.md"
)
foreach ($d in $dokuDateien) { Verschiebe -Datei $d -Ziel $doku }

# ---------------------------------------------------------------
# 3) Archiv: Einmal-Debug-Skripte, versehentliche Build-Dateien, Verknuepfungen
# ---------------------------------------------------------------
Write-Host "`n[3] Archiv -> _archiv\$datum" -ForegroundColor Cyan
$archivDateien = @(
    "debug-geheimnis-entschluesseln.js",
    "debug-q7verbindung-anlegen.js",
    "debug-q7verbindung-sql-generieren.js",
    "app.module.js",
    "app.module.js.map"
)
foreach ($d in $archivDateien) { Verschiebe -Datei $d -Ziel $archiv }

# Verknuepfungen (.lnk) - per Filter, weil der Name ein Umlaut enthaelt
Get-ChildItem -LiteralPath $root -File -Filter "*.lnk" | ForEach-Object {
    Verschiebe -Datei $_.Name -Ziel $archiv
}

# ---------------------------------------------------------------
# 4) Sicherheitscheck (nur lesen): Geheimnis-Dateien und Git
# ---------------------------------------------------------------
Write-Host "`n[4] Sicherheitscheck: Geheimnis-Dateien und Git" -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "  Git nicht gefunden - Check uebersprungen." -ForegroundColor DarkGray
} else {
    git rev-parse --is-inside-work-tree 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Ordner ist kein Git-Repository - Check uebersprungen." -ForegroundColor DarkGray
    } else {
        foreach ($f in @(".env", ".envsuperuser", "envzuruck")) {
            if (-not (Test-Path -LiteralPath $f)) { continue }

            git check-ignore -q --no-index -- $f 2>$null
            $ignoriert = ($LASTEXITCODE -eq 0)

            git ls-files --error-unmatch -- $f 2>$null | Out-Null
            $getrackt = ($LASTEXITCODE -eq 0)

            if ($getrackt) {
                Write-Host "  ACHTUNG: $f ist bereits im Git-Verlauf (wird von Git verfolgt)!" -ForegroundColor Red
            } elseif (-not $ignoriert) {
                Write-Host "  ACHTUNG: $f steht NICHT in .gitignore - kann beim Backup mit hochgeladen werden!" -ForegroundColor Red
            } else {
                Write-Host "  OK: $f wird von Git ignoriert." -ForegroundColor Green
            }
        }
    }
}

Write-Host "`nFertig. Es wurde nichts geloescht." -ForegroundColor Cyan
if (-not $Ausfuehren) {
    Write-Host "Das war nur der Probelauf. Zum Ausfuehren: .\aufraeumen.ps1 -Ausfuehren" -ForegroundColor Cyan
}
