# PROJECT_STATUS

## Produto
PDV/ERP desktop offline-first para moda, com foco em calçados + roupas.

## Stack
- React + TypeScript + Vite
- Tauri
- SQLite local

## Estratégia atual
- Priorizar offline real primeiro
- Melhorias restantes via atualizações posteriores
- Buscar experiência próxima de app Windows nativo

## Decisões fixas
- Não separar em dois sistemas independentes
- Um sistema só, com foco por setor:
  - Geral
  - Calçados
  - Roupas
- Entregas em grandes lotes
- Sempre validar build e tipagem antes de entregar
- Sempre entregar ZIP com apenas arquivos alterados

## Critérios de “offline pronto”
- App abre sem depender da nuvem
- Navegação fluida
- Produtos, estoque, PDV, dashboard e settings funcionam localmente
- Banco local consistente
- Sem crash de migrations já aplicadas
- Updater não derruba o modo local/dev

## Critérios de “pronto para venda”
- Offline estável
- Impressão forte
- Release publicado
- Licença/cloud final públicos
- Validação final em runtime Tauri real

## Observações para próximos lotes
- Nunca editar migrations antigas já aplicadas
- Criar migrations aditivas novas
- Evitar regressão visual ou runtime nas telas de gestão
