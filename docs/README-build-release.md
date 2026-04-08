# Build e release

## Pre-requisitos

1. Instalar dependencias Node e Rust.
2. Definir `TAURI_UPDATER_PUBKEY`.
3. Definir `TAURI_SIGNING_PRIVATE_KEY` e, se aplicavel, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. Definir `GITHUB_RELEASES_REPO` quando o repositorio de release nao for o atual.

## Fluxo manual sugerido

1. `node ./scripts/bump-app-version.mjs`
2. Exportar a chave privada do updater para `TAURI_SIGNING_PRIVATE_KEY`
3. `npm run tauri:build`
4. `npm run release:desktop -- --skip-build`
5. `npm run release:check`
6. Publicar `release/<versao>/*.msi`, `release/<versao>/*.sig` e `release/<versao>/latest.json` no GitHub Release

## Fluxo alinhado ao seu PowerShell

O repositório foi preparado para o ciclo abaixo:

1. Gerar nova versao
2. Buildar com Tauri
3. Assinar o instalador
4. Gerar `latest.json`
5. Publicar release no GitHub
6. Consumir o updater dentro do app

## Workflow GitHub

O arquivo `.github/workflows/release-desktop.yml` publica releases em Windows quando uma tag `v*` e enviada ou quando o workflow e executado manualmente.

## Fluxo automatico sugerido

1. `npm run release:ready`
2. Confirmar secrets no GitHub:
   - `TAURI_UPDATER_PUBKEY`
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
3. `npm run release:github -- --set=2.0.1`
4. A tag `v2.0.1` dispara o workflow `release-desktop`
5. O GitHub Actions:
   - roda `type-check`
   - valida updater
   - builda o MSI
   - gera `.sig`
   - produz `latest.json`
   - publica o GitHub Release

## Fluxo PowerShell para Windows

1. Copiar `.env.release.example` para `.env.release`
2. Ajustar:
   - `TAURI_UPDATER_PUBKEY`
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
3. Rodar `npm run release:github:ps -- -Version 2.0.1`
4. O script:
   - carrega o `.env.release`
   - roda `release:ready`
   - executa bump, commit, tag e push
   - dispara o workflow `release-desktop` no GitHub
