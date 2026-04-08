# Updater

## Como esta configurado

- Plugin `tauri-plugin-updater` habilitado no Rust
- Endpoint configurado em `src-tauri/tauri.conf.json`
- Tela `Atualizacoes` com botao `Verificar atualizacao`
- Script `check-updater.mjs` bloqueando build sem chave publica e assinatura privada
- Script `release-desktop.mjs` gerando `latest.json` compativel com GitHub Releases

## Variaveis esperadas

- `TAURI_UPDATER_ENDPOINT`
- `TAURI_UPDATER_PUBKEY`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## latest.json

O manifest gerado segue a estrutura de plataforma `windows-x86_64` e aponta para o MSI publicado no GitHub Release da versao correspondente.

## Validacao rapida

1. Confirmar variaveis do updater
2. Rodar `npm run tauri:build`
3. Rodar `npm run release:desktop -- --skip-build`
4. Rodar `npm run release:check`
5. Abrir a tela `Atualizacoes` e usar `Verificar atualizacao`

## Validacao automatica do pipeline

Antes de subir uma tag para o GitHub, rode:

1. `npm run release:ready`
2. `npm run release:github -- --set=2.0.1`

O primeiro comando valida:
- pasta `.git`
- remote `origin`
- versoes sincronizadas
- workflow do GitHub
- scripts de release
- endpoint do updater
- chaves do updater no ambiente atual

## Fluxo PowerShell recomendado no Windows

1. Copiar `.env.release.example` para `.env.release`
2. Rodar `npm run release:github:ps -- -Version 2.0.1`
3. Se quiser apenas carregar as variaveis na sessao:
   - `npm run release:env`
