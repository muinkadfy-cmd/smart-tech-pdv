# Estrutura do projeto

## Frontend

- `src/app`: bootstrap do aplicativo
- `src/assets`: imagens e marcas do produto
- `src/components/ui`: base visual estilo shadcn/ui
- `src/components/shared`: cabecalhos, cards e utilitarios visuais compartilhados
- `src/components/<modulo>`: componentes focados por dominio
- `src/hooks`: hooks de carregamento, atalhos e versao
- `src/layouts`: shell principal do desktop
- `src/lib`: helpers transversais
- `src/pages`: paginas lazy-loaded por modulo
- `src/routes`: roteamento e navegacao do shell
- `src/services`: servicos de updater e dados
- `src/repositories`: camada de acesso aos dados
- `src/stores`: Zustand segmentado por contexto
- `src/types`: contratos de dominio
- `src/styles`: tema global e tokens visuais

## Desktop

- `src-tauri/src`: bootstrap Rust/Tauri
- `src-tauri/migrations`: schema SQLite e seed demo
- `src-tauri/capabilities`: permissoes da janela principal
- `src-tauri/icons`: assets do bundle

## Automacao

- `scripts/bump-app-version.mjs`: incrementa a versao central do app
- `scripts/release-desktop.mjs`: prepara os artefatos desktop e o `latest.json`
- `scripts/check-release.mjs`: valida a pasta `release/<versao>`
- `scripts/check-updater.mjs`: exige as variaveis de updater e assinatura antes do build
