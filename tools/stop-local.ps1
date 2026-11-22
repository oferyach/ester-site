$projectRoot = Split-Path -Parent $PSScriptRoot
$processFile = Join-Path $projectRoot '.site-process'

if (Test-Path -LiteralPath $processFile) {
  $siteProcessId = [System.IO.File]::ReadAllText($processFile).Trim()
  if ($siteProcessId -match '^\d+$') {
    & taskkill.exe /PID $siteProcessId /T /F 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Stop-Process -Id ([int]$siteProcessId) -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item -LiteralPath $processFile -Force -ErrorAction SilentlyContinue
}
