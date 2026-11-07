param([int]$Port = 8767)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
 try {
  $data = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v5/api/index" -TimeoutSec 3
  if ($data.posts -and $data.version) { Write-Host "V5 is already running: http://127.0.0.1:$Port/v5/"; return }
 } catch {}
 throw "Port $Port is occupied. Existing services were not stopped. Try: .\Start-Demo.ps1 -Port 8768"
}
if (-not (Test-Path -LiteralPath 'node_modules/three/build/three.module.js')) {
 & corepack pnpm install --ignore-workspace --frozen-lockfile
 if ($LASTEXITCODE -ne 0) { throw 'Isolated dependency install failed.' }
}
$env:PORT = "$Port"
& node server.mjs
