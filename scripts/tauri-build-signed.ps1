param(
  [switch]$Debug,
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

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  $resolvedKeyPath = Resolve-Path -LiteralPath $env:TAURI_SIGNING_PRIVATE_KEY_PATH -ErrorAction SilentlyContinue
  if (-not $resolvedKeyPath) {
    throw "Arquivo da chave privada nao encontrado em TAURI_SIGNING_PRIVATE_KEY_PATH."
  }

  if (-not (Test-Path -LiteralPath $resolvedKeyPath.Path)) {
    throw "A chave privada encontrada em TAURI_SIGNING_PRIVATE_KEY_PATH nao esta acessivel."
  }

  $env:TAURI_SIGNING_PRIVATE_KEY_PATH = $resolvedKeyPath.Path
  $env:TAURI_SIGNING_PRIVATE_KEY = $resolvedKeyPath.Path
}

Write-Host "`nValidando pre-requisitos do updater..." -ForegroundColor Cyan
& node .\scripts\check-updater.mjs
if ($LASTEXITCODE -ne 0) {
  throw "As chaves do updater/assinatura ainda nao estao prontas para o build assinado."
}

$npmArgs = @("run")
if ($Debug) {
  $npmArgs += "tauri:build:local"
} else {
  $npmArgs += "tauri:build"
}

Write-Host "`nExecutando build desktop..." -ForegroundColor Cyan
& npm @npmArgs
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar o build desktop."
}

Write-Host "`nBuild desktop concluido." -ForegroundColor Green
