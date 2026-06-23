# Correção do Indicador 1 — Fluxo Completo retornando 0

## Diagnóstico

Testei a edge function `jira-monthly-report` agora e o bloco retornou:

```json
"flowCompleted": { "count": 0, "sample": [], "scanned": 0 }
```

`scanned: 0` significa que o JQL **não trouxe nenhum card** — ou seja, o problema acontece **antes** de avaliarmos o changelog. A regra de etapas (`FLOW_STEPS`) nem chegou a ser executada.

O JQL atual (linha 148 de `supabase/functions/jira-monthly-report/index.ts`) é:

```
project = "Bugs OrçaFascio"
AND status changed to "Concluído" DURING ("2026-06-01", "2026-06-23 23:59")
```

Pela resposta do próprio relatório (campo `cancelledIssues`) sabemos que existem dezenas de cards com `resolutiondate` dentro de junho/2026 e status `Concluído` — portanto a cláusula `status changed to ... DURING (...)` está sendo rejeitada/zerada pelo endpoint `/rest/api/3/search/jql`, mesmo quando há dados. (Esse endpoint novo do Jira tem incompatibilidades conhecidas com `DURING` em algumas configs.)

A regra de 4 etapas (`Backlog → Em desenvolvimento → Em produção → Concluído`) está correta e você confirmou — **não vou mexer** nela.

## Mudança proposta (escopo restrito)

Único arquivo tocado: `supabase/functions/jira-monthly-report/index.ts`, apenas dentro da função `computeFlowCompleted`.

### 1. Trocar o JQL de filtragem inicial

De:
```
project = X AND status changed to "Concluído" DURING ("start", "end 23:59")
```

Para o mesmo padrão usado no relatório de cancelados (que comprovadamente funciona):
```
project = X AND status = "Concluído" AND resolutiondate >= "start" AND resolutiondate <= "end 23:59"
```

Isso traz todos os cards que entraram em "Concluído" dentro do período (resolvidos no intervalo). A validação fina de ordem cronológica continua sendo feita pelo `evaluateFlow()` lendo o changelog de cada card — então cards que chegaram em "Concluído" mas pularam etapas continuam sendo descartados corretamente.

### 2. Manter checagem dupla por `completedAt`

O bloco que já existe (linhas 165–170) que compara `ev.completedAt` contra `[startDate, endDate]` permanece — garante que o "Concluído válido" cai dentro do período pedido, mesmo que o card tenha entrado e saído de Concluído várias vezes.

### 3. Logging de diagnóstico temporário

Adicionar `console.log` do JQL final usado e da contagem retornada, para validarmos via logs após o deploy:

```ts
console.log("Flow JQL:", jql, "→ issues:", issues.length);
```

### 4. NÃO mexer

- `FLOW_STEPS` permanece `["Backlog", "Em desenvolvimento", "Em produção", "Concluído"]` (confirmado por você).
- `evaluateFlow()` permanece igual.
- Indicador 2 (BUG CLIENTE) e Indicador 3 (BUG QA) — nenhuma alteração.
- Frontend, hook `useMonthlyReport`, componente `MonthlyQAReport`, exportações — nenhuma alteração.
- Relatórios "Cards em Aberto" e "Cards Cancelados" — não tocados.

## Validação após implementar

1. Deploy da edge function.
2. `curl` direto na função com `{ "startDate": "2026-06-01", "endDate": "2026-06-23" }` e verificar:
   - `flowCompleted.scanned` > 0 (deve trazer os cards resolvidos do mês).
   - `flowCompleted.count` ≥ 1 (cards que cumpriram as 4 etapas em ordem).
   - `flowCompleted.sample` com pelo menos um `{ key, completedAt }`.
3. Inspecionar o log do JQL para conferir que ficou bem formado.
4. Comparar com a contagem manual no Jira (`project = "Bugs OrçaFascio" AND status = Concluído AND resolutiondate >= 2026-06-01`).
5. Reportar a você o número de `scanned` e `count` antes/depois.

## Risco

Baixíssimo: a mudança fica isolada em uma única função do edge, mantém a regra de negócio, e o JQL novo é idêntico em padrão ao já validado pelo relatório de cancelados.
