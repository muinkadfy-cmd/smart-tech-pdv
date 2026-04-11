param(
  [string]$Version,
  [switch]$SkipPush,
  [switch]$SkipTag,
  [switch]$DryRun,
  [switch]$SkipEnvLoad,
  [string]$EnvPath = ".env.release"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $SkipEnvLoad) {
  $loaderPath = Join-Path $PSScriptRoot "load-release-env.ps1"
  if (Test-Path -LiteralPath $loaderPath) {
    & $loaderPath -Path $EnvPath
  }
}

Write-Host "`n[1/2] Validando pipeline automatico..." -ForegroundColor Cyan
$readinessArgs = @(".\scripts\check-release-readiness.mjs")
if ($Version) {
  $readinessArgs += "--target-version=$Version"
}
& node @readinessArgs
if ($LASTEXITCODE -ne 0) {
  throw "O pipeline automatico ainda tem pendencias estruturais."
}

$nodeArgs = @(".\scripts\release-github.mjs")

if ($Version) {
  $nodeArgs += "--set=$Version"
}

if ($SkipPush) {
  $nodeArgs += "--skip-push"
}

if ($SkipTag) {
  $nodeArgs += "--skip-tag"
}

if ($DryRun) {
  $nodeArgs += "--dry-run"
}

Write-Host "`n[2/2] Executando bump/tag/push..." -ForegroundColor Cyan
& node @nodeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao executar o fluxo automatico de release."
}

Write-Host "`nRelease automatica preparada com sucesso." -ForegroundColor Green
