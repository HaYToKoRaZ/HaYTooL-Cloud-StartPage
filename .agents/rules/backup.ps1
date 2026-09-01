<#
.SYNOPSIS
    HaYTooL Cloud StartPage yedekleme scripti.
    Haric tutulanlar: 0nogithub, ornek, .git, node_modules, temp, dist
    Islem sonunda Windows uyari sesi calar.
#>

$SourceFolder     = "$PSScriptRoot\.."
$SourceFolder     = (Resolve-Path $SourceFolder).Path
$BackupDir        = Join-Path $PSScriptRoot "backup"
$MaxBackupCount   = 30
$SevenZipPath     = "C:\Program Files\7-Zip\7z.exe"

$ExcludeList      = @("0nogithub", "ornek", ".git", "node_modules", "temp", "dist", "scratch")

if (-not (Test-Path -Path $SevenZipPath)) {
    if (Get-Command 7z -ErrorAction SilentlyContinue) {
        $SevenZipPath = (Get-Command 7z).Source
    } else {
        Write-Host "[TR] Hata: 7z.exe bulunamadi!" -ForegroundColor Red
        Exit
    }
}

$TimeStamp        = Get-Date -Format "yyyy-MM-dd_HH-mm.ss"
$BackupFileName   = "HaYTooL_StartPage_Yedek_$TimeStamp.7z"
$BackupFilePath   = Join-Path -Path $BackupDir -ChildPath $BackupFileName

if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "
[TR] Yedekleme baslatiliyor... / [EN] Backup starting..." -ForegroundColor Cyan

Push-Location -Path $SourceFolder

$7zArgs = @("a", "-t7z", "-mx=9", "-ms=on", $BackupFilePath, "*")
foreach ($Exclude in $ExcludeList) {
    $7zArgs += "-xr!$Exclude"
}

& $SevenZipPath $7zArgs
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "
[TR] Yedekleme Basarili! / [EN] Backup Successful!" -ForegroundColor Green
    [System.Media.SystemSounds]::Exclamation.Play()
    
    $ExistingBackups = Get-ChildItem -Path $BackupDir -Filter "HaYTooL_StartPage_Yedek_*.7z" | Sort-Object LastWriteTime
    if ($ExistingBackups.Count -gt $MaxBackupCount) {
        $FilesToDelete = $ExistingBackups.Count - $MaxBackupCount
        $ExistingBackups | Select-Object -First $FilesToDelete | ForEach-Object { Remove-Item -Path $_.FullName -Force }
        Write-Host "[TR] $FilesToDelete adet eski yedek silindi." -ForegroundColor Green
    }
} else {
    Write-Host "
[TR] Yedekleme sirasinda hata olustu!" -ForegroundColor Red
    [System.Media.SystemSounds]::Hand.Play()
}

Start-Sleep -Seconds 2