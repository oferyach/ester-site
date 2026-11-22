$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeFolder = 'C:\Users\ofery\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$pnpmCommand = 'C:\Users\ofery\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
$processFile = Join-Path $projectRoot '.site-process'

if (-not (Test-Path -LiteralPath $pnpmCommand)) {
  throw 'The local Codex runtime was not found.'
}

$env:Path = "$nodeFolder;$env:Path"

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
  & $pnpmCommand install
  if ($LASTEXITCODE -ne 0) { throw 'Website dependency installation failed.' }
}

$siteProcess = Start-Process -FilePath $pnpmCommand -ArgumentList 'run', 'dev' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
[System.IO.File]::WriteAllText($processFile, [string]$siteProcess.Id)

$siteReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $siteReady = $true; break }
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $siteReady) { throw 'The website did not become ready in time.' }
Start-Process 'http://127.0.0.1:3000/'
