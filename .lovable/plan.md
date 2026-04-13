

# Adicionar coluna "Tarefas em Teste" na tela de Cards Jira

## Resumo

Adicionar uma 4ª coluna no kanban chamada **"Tarefas em Teste"**, mapeando o status "Tarefas em Teste" do Jira. Também incluir cards do projeto **SUS** (sustentação) que estejam nesse status.

## O que será feito

1. **Edge Function `sync-jira`** — Duas alterações:
   - Adicionar mapeamento `'tarefas em teste' → 'Tarefas em Teste'` no `STATUS_MAP`
   - Alterar o JQL para buscar dos dois projetos: `project in (BUG, SUS)`

2. **Tela `CardsJira.tsx`** — Três alterações:
   - Adicionar `"Tarefas em Teste"` ao array `statuses`
   - Adicionar cor para o novo status em `statusColors` (ex: `"purple"` ou outra cor distinta)
   - Ajustar grid do kanban de `grid-cols-3` para `grid-cols-4`

3. **Componente `StatusDot`** — Verificar se já suporta a cor escolhida para "Tarefas em Teste"; se não, adicionar

4. **Filtro de status** — O dropdown de filtro já é gerado dinamicamente a partir do array `statuses`, então já funcionará automaticamente

## Detalhes técnicos

- JQL: `project in (BUG, SUS) ORDER BY created DESC`
- Mapeamento: `'tarefas em teste'` → `'Tarefas em Teste'`
- Nenhuma alteração de banco necessária — o campo `status` já é `text` livre

