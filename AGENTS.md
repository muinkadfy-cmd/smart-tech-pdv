# AGENTS.md

## Objetivo permanente
Continuar a evolução deste sistema em grandes lotes, com foco em estabilidade real, uso offline forte, aparência e sensação de app nativo do Windows, e qualidade comercial rumo ao nível 10/10.

## Regra principal de execução
Trabalhe diretamente nos arquivos do projeto.

**Não gere ZIP. Não entregue ZIP. Não prepare ZIP.**

As alterações devem ser feitas diretamente na base do projeto, preservando a estrutura existente.

## Prioridades obrigatórias
1. **Offline primeiro**
   - Priorizar deixar o sistema pronto para uso offline real.
   - O cliente precisa conseguir trabalhar localmente mesmo se a parte cloud ainda não estiver finalizada.
   - Atualizações e melhorias restantes podem vir depois.

2. **Aparência e sensação de app nativo do Windows**
   - Navegação fluida, rápida e sem travas.
   - Layout com sensação de sistema instalado, não de site comum.
   - Sidebar e topbar estáveis.
   - Scroll do conteúdo organizado.
   - Velocidade percebida alta.

3. **Grandes lotes, nada picado**
   - Sempre trabalhar em grandes lotes.
   - Evitar mudanças pequenas e fragmentadas.
   - Consolidar o máximo possível em cada execução, com segurança.

4. **Sem regressão**
   - Não quebrar nada que já funciona.
   - Não remover lógica existente sem substituição segura equivalente.
   - Não inventar partes do sistema sem base real no projeto.

5. **Organização comercial forte**
   - O sistema deve ficar claro, intuitivo e organizado para o usuário.
   - Calçados e roupas devem continuar no mesmo sistema, com separação por setor/foco, sem dual boot.

## Modelo do sistema
Este sistema deve continuar como **um sistema único**, com foco operacional por setor:
- Geral
- Calçados
- Roupas

Não separar em dois sistemas independentes.

## Diretrizes de produto
- Manter o sistema preparado para loja de moda com:
  - calçados
  - roupas
  - vestidos e categorias relacionadas
- Separar por setor, categoria, filtros e foco operacional.
- Evitar confusão para o operador.

## Regras técnicas obrigatórias
- Preservar a arquitetura atual do projeto.
- Não trocar stack sem necessidade extrema.
- Não mexer em partes não relacionadas sem motivo técnico claro.
- Corrigir erros de runtime, hooks, tipagem, imports, JSX, rotas e regressões quando encontrados.
- Se houver conflito entre estética e estabilidade, priorizar estabilidade.
- Se houver conflito entre online e offline, priorizar offline.

## Regras de validação obrigatórias
Antes de finalizar qualquer lote, sempre:
1. Rodar `type-check`
2. Rodar `build`
3. Corrigir qualquer erro encontrado
4. Revisar se não houve quebra em:
   - offline
   - navegação
   - PDV
   - estoque
   - produtos
   - impressão
   - licença
   - configurações
   - relatórios
   - dashboard

## Regras de UX e interface
- Buscar nível visual e operacional de app nativo do Windows.
- Minimizar sensação de tela vazia.
- Aumentar densidade operacional nas telas de gestão.
- Melhorar velocidade percebida.
- Melhorar busca, atalhos, foco operacional e navegação entre áreas.
- Manter interface organizada, profissional e comercial.

## Regras de execução
- Não parar só em análise; executar o lote.
- Corrigir primeiro os erros que estiverem travando o sistema.
- Depois avançar no próximo lote de melhoria mais valioso.
- Sempre pensar no melhor caminho técnico e comercial.

## Formato obrigatório da resposta final do Codex
Ao terminar, responder sempre com:
- diagnóstico
- causa
- o que foi alterado
- por que não quebra
- testes executados
- rank atual do sistema
- se já está pronto para venda
- o que ainda falta

## Meta contínua
Levar o sistema progressivamente ao nível **10/10**, priorizando nesta ordem:
1. offline real pronto para uso
2. navegação fluida e nativa
3. operação comercial forte
4. estabilidade técnica
5. acabamento premium
6. release final e melhorias futuras

