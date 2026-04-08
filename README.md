# Smart Tech PDV

Sistema desktop Tauri v2 para loja de calcados com shell premium, arquitetura modular, dados locais em SQLite e pipeline pronto para release com updater.

## Scripts principais

- `npm run dev`: sobe o frontend Vite
- `npm run build`: build web do frontend
- `npm run type-check`: validacao TypeScript
- `npm run tauri:dev`: executa o app desktop em desenvolvimento
- `npm run tauri:build`: gera o build desktop assinado
- `npm run version:bump -- --set=2.0.1`: atualiza versao em package/app/Cargo/Tauri
- `npm run release:ready`: valida se o pipeline automatico esta pronto para release
- `npm run release:check`: valida os artefatos da pasta `release`
- `npm run release:desktop`: prepara MSI, `.sig` e `latest.json`
- `npm run release:github -- --set=2.0.1`: faz bump, commit, tag e push para disparar o GitHub Release
- `npm run release:github:ps -- -Version 2.0.1`: fluxo PowerShell completo para Windows

## Guias internos

- [Estrutura do projeto](./docs/README-structure.md)
- [Build e release](./docs/README-build-release.md)
- [Updater](./docs/README-updater.md)
