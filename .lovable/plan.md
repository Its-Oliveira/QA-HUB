## Problema

O Indicador 1 (Fluxo completo) usa a JQL correta (`statusCategory = Done AND resolution = "Itens concluídos"` no período), mas depois passa cada card por uma validação extra de changelog (`evaluateFlow`) exigindo as transições `Backlog → Em Desenvolvimento → Done` em ordem cronológica. Cards que foram criados direto em "Em Desenvolvimento", ou cuja primeira transição registrada não tem `fromString = "Backlog"`, ou que pularam etapas, são descartados — mesmo estando em Done com a resolução correta. Por isso o número fica abaixo do esperado.

A regra solicitada agora é mais simples: **todo card em Done com resolução "Itens concluídos" no período conta**, sem validação de changelog.

## Mudanças

Arquivo único: `supabase/functions/jira-monthly-report/index.ts`

1. **`computeFlowCompleted`** — remover a busca de changelog e a chamada a `evaluateFlow`. Para cada issue retornado pela JQL, montar diretamente o registro com:
   - `key`, `url`, `summary`
   - `reporter` = `fields.reporter.displayName`
   - `created` = `fields.created`
   - `completedAt` = `fields.resolutiondate` (já filtrado pela JQL no período)
   
   Manter o shape de retorno `{ count, issues, scanned }` para não quebrar o front nem o export.

2. **Remover código morto**: `fetchChangelog`, `evaluateFlow`, `FLOW_STEPS`, pool de workers e a constante `CONC` deixam de ser usados — remover para manter o arquivo limpo.

3. Adicionar `resolutiondate` à lista de fields de `searchPaginated` dentro de `computeFlowCompleted`.

4. Deploy do edge function e validação via curl no período `2026-06-01 → 2026-06-23`, confirmando que `flowCompleted.count` aumentou e bate com o total de issues retornados pela JQL.

## Fora do escopo

- UI (`MonthlyQAReport.tsx`), hook e export — já consomem `flowCompleted.issues` no formato atual; nada muda.
- Indicadores 2 (BUG CLIENTE) e 3 (BUG QA) — intocados.
