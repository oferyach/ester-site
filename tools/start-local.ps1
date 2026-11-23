param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeFolder = 'C:\Users\ofery\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$pnpmCommand = 'C:\Users\ofery\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
$processFile = Join-Path $projectRoot '.site-process'
$lockFile = Join-Path $projectRoot '.vinext\dev\lock.json'
$stopScript = Join-Path $PSScriptRoot 'stop-local.ps1'
$vinextCommand = Join-Path $projectRoot 'node_modules\.bin\vinext.cmd'
$stdoutLog = Join-Path $projectRoot '.site-process.out.log'
$stderrLog = Join-Path $projectRoot '.site-process.err.log'

if (-not (Test-Path -LiteralPath $pnpmCommand)) {
  throw 'The local Codex runtime was not found.'
}

$env:Path = "$nodeFolder;$env:Path"

# A dev server can leave a stale Vinext lock after dependencies are replaced
# or Windows closes its launcher. Always cleanly restart this project's server.
& $stopScript

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
  & $pnpmCommand install
  if ($LASTEXITCODE -ne 0) { throw 'Website dependency installation failed.' }
}

if (-not (Test-Path -LiteralPath $vinextCommand)) {
  throw 'The local Vinext executable was not found. Run pnpm install first.'
}

Remove-Item -LiteralPath $stdoutLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stderrLog -Force -ErrorAction SilentlyContinue

$siteProcess = Start-Process -FilePath $vinextCommand -ArgumentList 'dev', '--hostname', '0.0.0.0' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
[System.IO.File]::WriteAllText($processFile, [string]$siteProcess.Id)

$siteReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  if ($siteProcess.HasExited) { break }
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $siteReady = $true; break }
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $siteReady) {
  $details = @()
  if (Test-Path -LiteralPath $stdoutLog) { $details += Get-Content -LiteralPath $stdoutLog -Tail 12 }
  if (Test-Path -LiteralPath $stderrLog) { $details += Get-Content -LiteralPath $stderrLog -Tail 12 }
  & $stopScript
  throw "The website did not become ready in time.`n$($details -join [Environment]::NewLine)"
}

$siteProcessId = $siteProcess.Id
if (Test-Path -LiteralPath $lockFile) {
  try {
    $lock = Get-Content -Raw -LiteralPath $lockFile | ConvertFrom-Json
    if ($lock.cwd -eq $projectRoot -and [int]$lock.pid -gt 0) {
      $siteProcessId = [int]$lock.pid
    }
  } catch {
    # The wrapper PID is still useful if the lock is briefly unavailable.
  }
}
[System.IO.File]::WriteAllText($processFile, [string]$siteProcessId)

if (-not $NoBrowser) {
  Start-Process 'http://127.0.0.1:3000/'
}
