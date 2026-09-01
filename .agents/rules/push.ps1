# ==============================================================================
# HaYTooL Cloud StartPage - Automatic GitHub Push Script
# Location: 0nogithub/push.ps1
# ==============================================================================

param(
    [string]$Message = ""
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " 🚀 HaYTooL Cloud StartPage - GitHub Auto Push Script" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Read version from manifest.json or package.json
$ManifestJsonPath = Join-Path $RepoRoot "manifest.json"
$PkgJsonPath = Join-Path $RepoRoot "package.json"
$Version = "v1.0.0"

if (Test-Path $ManifestJsonPath) {
    try {
        $mJson = Get-Content $ManifestJsonPath -Raw | ConvertFrom-Json
        if ($mJson.version) {
            $Version = if ($mJson.version.StartsWith("v")) { $mJson.version } else { "v" + $mJson.version }
        }
    } catch {}
} elseif (Test-Path $PkgJsonPath) {
    try {
        $pJson = Get-Content $PkgJsonPath -Raw | ConvertFrom-Json
        if ($pJson.version) {
            $Version = if ($pJson.version.StartsWith("v")) { $pJson.version } else { "v" + $pJson.version }
        }
    } catch {}
}

Write-Host "[INFO] Current Version: $Version" -ForegroundColor Yellow

# 2. Get Commit Message from user or set default
$DefaultMsg = "$Version - Automated update and improvements"
Write-Host ""
if ([string]::IsNullOrWhiteSpace($Message)) {
    $UserMsg = Read-Host "Enter commit message (Leave blank for '$DefaultMsg')"
    $CommitMsg = if ([string]::IsNullOrWhiteSpace($UserMsg)) { $DefaultMsg } else { "$Version - $UserMsg" }
} else {
    $CommitMsg = if ($Message.StartsWith($Version)) { $Message } else { "$Version - $Message" }
}

# 3. Perform Git Operations
Write-Host ""
Write-Host "[GIT] Adding changed files (git add .)..." -ForegroundColor Green
git add .

Write-Host "[GIT] Creating commit: '$CommitMsg'..." -ForegroundColor Green
try {
    git commit -m "$CommitMsg"
} catch {
    Write-Host "[INFO] Nothing to commit or working tree clean." -ForegroundColor Gray
}

# Determine current branch
$CurrentBranch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($CurrentBranch)) { $CurrentBranch = "master" }

Write-Host "[GIT] Pushing to GitHub (git push origin $CurrentBranch)..." -ForegroundColor Green
try {
    git push origin $CurrentBranch
} catch {
    Write-Host "[ERROR] Failed to push $CurrentBranch branch." -ForegroundColor Red
}

Write-Host "[GIT] Creating and Pushing Tag '$Version'..." -ForegroundColor Green
try {
    git tag -a "$Version" -m "Release $Version"
    git push origin "$Version"
} catch {
    Write-Host "[INFO] Tag might already exist or failed to push." -ForegroundColor Gray
}

Write-Host ""
Write-Host "[SUCCESS] Push operation completed!" -ForegroundColor Green
[System.Media.SystemSounds]::Asterisk.Play()