$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dest = "backup_$timestamp"
New-Item -ItemType Directory -Path $dest | Out-Null
Copy-Item -Path src, manifest.json -Destination $dest -Recurse -Force
Write-Output "Backup created at $dest"
