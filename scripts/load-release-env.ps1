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

if ($loaded.Count -eq 0) {
  Write-Warning "Nenhuma variavel foi carregada de $($resolvedPath.Path)."
  exit 0
}

Write-Host "Variaveis carregadas na sessao atual:" -ForegroundColor Cyan
$loaded | Sort-Object | ForEach-Object {
  Write-Host " - $_" -ForegroundColor Green
}
