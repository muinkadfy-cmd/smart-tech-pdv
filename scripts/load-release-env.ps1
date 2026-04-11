param(
  [string]$Path = ".env.release"
)

$resolvedPath = Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue

if (-not $resolvedPath) {
  throw "Arquivo de ambiente nao encontrado: $Path"
}

$loaded = @()

Get-Content -LiteralPath $resolvedPath.Path | ForEach-Object {
  $line = $_.Trim()

  if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
    return
  }

  $separatorIndex = $line.IndexOf("=")
  if ($separatorIndex -lt 1) {
    return
  }

  $name = $line.Substring(0, $separatorIndex).Trim()
  $value = $line.Substring($separatorIndex + 1).Trim()

  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Trim('"')
  }

  Set-Item -Path "Env:$name" -Value $value
  $loaded += $name
}

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  $resolvedKeyPath = Resolve-Path -LiteralPath $env:TAURI_SIGNING_PRIVATE_KEY_PATH -ErrorAction SilentlyContinue
  if (-not $resolvedKeyPath) {
    throw "Arquivo da chave privada nao encontrado em TAURI_SIGNING_PRIVATE_KEY_PATH."
  }

  if (-not (Test-Path -LiteralPath $resolvedKeyPath.Path)) {
    throw "A chave privada encontrada em TAURI_SIGNING_PRIVATE_KEY_PATH nao esta acessivel."
  }

  Set-Item -Path "Env:TAURI_SIGNING_PRIVATE_KEY" -Value $resolvedKeyPath.Path
  if ($loaded -notcontains "TAURI_SIGNING_PRIVATE_KEY") {
    $loaded += "TAURI_SIGNING_PRIVATE_KEY"
  }
}

if ($loaded.Count -eq 0) {
  Write-Warning "Nenhuma variavel foi carregada de $($resolvedPath.Path)."
  exit 0
}

Write-Host "Variaveis carregadas na sessao atual:" -ForegroundColor Cyan
$loaded | Sort-Object | ForEach-Object {
  Write-Host " - $_" -ForegroundColor Green
}
