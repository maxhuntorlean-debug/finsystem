$ErrorActionPreference = "SilentlyContinue"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

$portInUse = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if (-not $portInUse) {
    Start-Process -FilePath "cmd.exe" -ArgumentList '/c cd /d "C:\Users\John\finsystem" && npx wrangler dev --port 8787 > wrangler-dev.log 2>&1' -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

Start-Process -FilePath "cmd.exe" -ArgumentList '/c cd /d "C:\Users\John\finsystem\apps\configurator" && npm run tauri dev > tauri-dev.log 2>&1' -WindowStyle Hidden
