# SA Invoice Pro – Windows Launcher
# Double-click or run: powershell -ExecutionPolicy Bypass -File Start-SA-Invoice.ps1

$ErrorActionPreference = 'SilentlyContinue'
$Port = 8080
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "    SA Invoice Pro  -  Starting..." -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""

# Reset port every time (kill previous server)
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "  Resetting port $Port (PID $($_.OwningProcess))..." -ForegroundColor Yellow
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# Find Python
$python = $null
foreach ($cmd in @('python', 'py')) {
  $c = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($c) { $python = $c.Source; break }
}
if (-not $python) {
  Write-Host "  Python not found. Install from https://www.python.org/downloads/" -ForegroundColor Red
  Write-Host "  Enable 'Add Python to PATH' during install." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

# Start server in background
$server = Start-Process -FilePath $python -ArgumentList "-m","http.server",$Port -WorkingDirectory $Root -WindowStyle Minimized -PassThru
Start-Sleep -Seconds 1

$url = "http://127.0.0.1:$Port"

# Prefer Edge/Chrome app mode (feels like a real app)
$opened = $false
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" }

if (Test-Path $edge) {
  Start-Process $edge -ArgumentList "--app=$url","--new-window"
  $opened = $true
} elseif (Test-Path $chrome) {
  Start-Process $chrome -ArgumentList "--app=$url","--new-window"
  $opened = $true
} else {
  Start-Process $url
}

Write-Host "  Running at $url" -ForegroundColor Cyan
Write-Host "  Server PID: $($server.Id)  (port resets on next launch)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Create a desktop shortcut to this script for one-click open." -ForegroundColor DarkGray
Write-Host "  Press Enter to STOP the server and exit." -ForegroundColor Yellow
Read-Host
Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
Write-Host "  Server stopped." -ForegroundColor Green
