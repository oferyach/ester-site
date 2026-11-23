$projectRoot = Split-Path -Parent $PSScriptRoot
$processFile = Join-Path $projectRoot '.site-process'
$lockFile = Join-Path $projectRoot '.vinext\dev\lock.json'
$processIds = [System.Collections.Generic.HashSet[int]]::new()

if (Test-Path -LiteralPath $lockFile) {
  try {
    $lock = Get-Content -Raw -LiteralPath $lockFile | ConvertFrom-Json
    if ($lock.cwd -eq $projectRoot -and [int]$lock.pid -gt 0) {
      [void]$processIds.Add([int]$lock.pid)
    }
  } catch {
    # A malformed lock is stale and will be removed below.
  }
}

if (Test-Path -LiteralPath $processFile) {
  $storedProcessId = [System.IO.File]::ReadAllText($processFile).Trim()
  if ($storedProcessId -match '^\d+$') {
    $storedProcess = Get-Process -Id ([int]$storedProcessId) -ErrorAction SilentlyContinue
    if ($storedProcess -and $storedProcess.ProcessName -in @('node', 'cmd', 'pnpm')) {
      [void]$processIds.Add([int]$storedProcessId)
    }
  }
}

foreach ($processId in $processIds) {
  & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

Remove-Item -LiteralPath $processFile -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
