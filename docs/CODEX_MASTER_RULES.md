# CODEX_MASTER_RULES

## Objetivo central
Levar o sistema para nível comercial alto, com foco em:
- operação offline real
- interface nativa estilo Windows
- calçados + roupas no mesmo sistema, bem separados
- entregas em grandes lotes
- validação forte antes de cada entrega

## Contrato de execução
- Executar exatamente o solicitado sem quebrar código existente.
- Não remover funcionalidades sem equivalente.
- Não inventar comportamentos.
- Preservar arquitetura e estrutura do projeto.
- Corrigir junto tudo que estiver bloqueando build, type-check, runtime ou uso real.

## Checklist mínimo por lote
- [ ] Diagnóstico real do problema
- [ ] Causa identificada
- [ ] Patch seguro aplicado
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] Verificação de regressão básica
- [ ] ZIP somente com arquivos alterados
- [ ] Rank atualizado
- [ ] Status: pronto offline? pronto para venda?

## Diretrizes de UX
- Cara de software desktop nativo
- Fluidez de navegação
- Menos áreas vazias
- Mais densidade operacional nas telas internas
- Estados vazios mais úteis
- Topbar, sidebar e rodapé com função real

## Diretrizes funcionais
- Sistema único com foco operacional por setor
- Setores principais: Calçados / Roupas
- Vestidos como categoria dentro de roupas quando fizer sentido
- Filtros claros por setor
- Cadastro adaptativo por tipo de produto
- Relatórios por setor e consolidado

## Entrega
Sempre escrever no final:
- o que foi feito
- melhorias incluídas
- impacto no sistema
- rank atual
- status de prontidão para venda
