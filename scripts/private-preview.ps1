param([switch]$Stop, [switch]$OwnerAccess)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$serverFile = Join-Path $projectRoot 'server.mjs'
$runtimeFolder = Join-Path $projectRoot '.sites-runtime'
$pidFile = Join-Path $runtimeFolder 'city-wars-preview.pid'
New-Item -ItemType Directory -Force -Path $runtimeFolder | Out-Null

if ($Stop) {
  if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output 'No preview started by this launcher.'; return }
  $previewProcessId = [int](Get-Content -LiteralPath $pidFile)
  $previewProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$previewProcessId"
  $previewListener = Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $previewProcessId -and $_.LocalAddress -eq '127.0.0.1' }
  if ($previewListener -and $previewProcess -and $previewProcess.Name -eq 'node.exe' -and $previewProcess.CommandLine.Contains($serverFile)) {
    Stop-Process -Id $previewProcessId
    Write-Output 'Private preview stopped. Saved test progress is kept.'
  } else { Write-Output 'The recorded preview process is no longer running.' }
  return
}

if (Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue) {
  Write-Output 'Port 4191 is already in use. Existing preview: http://127.0.0.1:4191/'
  return
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
$previousPreview = $env:TECHCRUSH_PRIVATE_PREVIEW
$previousOwnerAccess = $env:TECHCRUSH_OWNER_ACCESS
try {
  $env:TECHCRUSH_PRIVATE_PREVIEW = '1'
  $env:TECHCRUSH_OWNER_ACCESS = if ($OwnerAccess) { '1' } else { '0' }
  $previewProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeFolder 'city-wars-preview.log') -RedirectStandardError (Join-Path $runtimeFolder 'city-wars-preview-error.log')
  $previewProcess.Id | Set-Content -LiteralPath $pidFile
} finally {
  $env:TECHCRUSH_PRIVATE_PREVIEW = $previousPreview
  $env:TECHCRUSH_OWNER_ACCESS = $previousOwnerAccess
}
Write-Output 'Local game: http://127.0.0.1:4191/'
Write-Output 'This computer only. Separate saves. Ordinary event access and real countdown by default.'
