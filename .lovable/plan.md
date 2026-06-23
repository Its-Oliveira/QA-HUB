## Relatório Mensal de QA — Plano de Implementação

### Princípio de isolamento
Tudo novo. Nada nos arquivos existentes (`useWeeklyReport`, `useCancelledReport`, `WeeklyOpenCardsReport`, `CancelledCardsReport`, `ReportExportBar`, `CancelledReportExportBar`, edge functions `jira-weekly-report` e `jira-cancelled-report`) será alterado. Única exceção: `src/pages/Reports/index.tsx` recebe o novo `<ReportCard>` e o bloco de renderização do novo relatório (aditivo, sem mexer nos blocos existentes).

### Pontos a confirmar com você antes de codar
A spec exige parar se algo divergir do board real. Pelo código atual sei que:
- **Project**: `"Bugs OrçaFascio"` (string exata usada hoje no edge `jira-cancelled-report`).
- **Issue Type BUG CLIENTE**: hoje o código usa `"BUG cliente"` (com letra minúscula). Vou reusar esse mesmo literal.
- **Issue Type BUG QA**: ainda não usado em lugar nenhum do código. Preciso do nome exato no Jira (ex.: `"BUG QA"`, `"Bug QA"`, `"BUG qa"`?).
- **Status do fluxo (Indicador 1)**: os 7 nomes — `Backlog`, `Não iniciado`, `Em desenvolvimento`, `Revisão QA`, `Aprovado QA`, `Em produção`, `Concluído` — precisam bater **exatamente** com os do board. Vou usar esses literais; se algum estiver diferente no Jira, o indicador retornará 0 e eu vou reportar antes de tentar adaptar.

Se preferir, eu implemento com os literais acima (mesma capitalização) e, na primeira execução, se o Indicador 1 vier zerado/inconsistente, paro e te peço os nomes oficiais.

### Arquivos novos

```text
supabase/functions/jira-monthly-report/index.ts   (novo edge)
src/hooks/useMonthlyReport.ts                     (novo hook)
src/components/Reports/MonthlyQAReport.tsx        (novo componente)
src/components/Reports/MonthlyReportExportBar.tsx (novo, reusa utils existentes)
src/utils/monthlyReportExport.ts                  (novo, PDF/XLSX/CSV/Copiar)
```

Edit único: `src/pages/Reports/index.tsx` — adicionar o terceiro `<ReportCard>` no grid e o bloco condicional de renderização (espelhando o padrão dos outros dois).

### Edge function `jira-monthly-report`
Recebe `{ startDate, endDate }` (ISO). Valida datas (`endDate >= startDate`, não-futuras, formato ISO; sanitização contra injeção JQL — só aceito `YYYY-MM-DD`). Default no client = mês vigente.

Faz **5 chamadas** ao Jira em paralelo:

1. **BUG CLIENTE criados no período** → JQL `project = "Bugs OrçaFascio" AND issuetype = "BUG cliente" AND created >= "X" AND created <= "Y"` — busca paginada com campos `reporter,created,resolution,status` → usado para total criado + agrupamento por relator.
2. **BUG CLIENTE cancelados no período** → mesma JQL + `AND resolution = "Cancelado QA"` (mesmo literal do edge existente — paridade total de definição de "cancelado") → total cancelado + agrupamento por relator + dados detalhados.
3. **BUG QA criados no período** → `approximate-count` com JQL análoga (preciso do issuetype exato).
4. **Indicador 1 — Fluxo completo**:
   - JQL pré-filtro: `status = "Concluído" AND resolved >= "X" AND resolved <= "Y"` (no projeto Orçafascio? a spec não restringe a projeto — vou assumir o mesmo projeto `"Bugs OrçaFascio"`; confirme se for outro escopo).
   - Para cada card, busca paginada do changelog via `/rest/api/3/issue/{key}?expand=changelog` (a API atual não tem bulk changelog estável; uso `Promise.all` em chunks de 10 para limitar concorrência).
   - Algoritmo: para cada um dos 7 status, encontrar a **primeira** transição cujo `toString` casa com o status. Se todos os 7 existem e as datas são monotonicamente crescentes (`t1 ≤ t2 ≤ ... ≤ t7`), conta. Status extras entre as transições são ignorados (não invalidam).
   - Retorna número absoluto + lista mínima `{ key, completedAt }` para debugging.
5. **`totalMonth` BUG CLIENTE** via `approximate-count` (igual ao edge existente) para consistência do KPI.

Cache: o hook mantém o último resultado no estado React e só refaz quando o usuário troca o período ou aperta "atualizar". Sem persistência.

### Hook `useMonthlyReport`
- Estado: `{ data, isLoading, error, startDate, endDate, setRange, resetToCurrentMonth, generate }`.
- Default: `startDate = primeiro dia do mês corrente`, `endDate = agora`. Recalcula dinamicamente a cada `generate()` — nada cacheado entre sessões.
- Validações no client antes de chamar o edge: `endDate >= startDate`, sem futuro, ambos preenchidos.
- Carregamento progressivo: o edge retorna parciais? Para manter simples e robusto, vou retornar tudo numa resposta só, mas com cada bloco em try/catch independente no servidor → cada indicador pode vir como `{ value, error }`, e o componente renderiza skeleton/erro por bloco sem derrubar os outros.

### Componente `MonthlyQAReport`
Mesmo padrão visual de `CancelledCardsReport.tsx` (header, separadores tracejados, grid de KPI cards, tabela monoespaçada). Layout:

```text
Header + período + "gerado em"
[ Seletor de período: DatePicker início | DatePicker fim | Botão "Voltar ao mês atual" ]
─────
KPI grid (3 cards):
  [ Fluxo completo: N ]  [ BUG QA criados: N ]  [ BUG CLIENTE — taxa: X% ]
─────
Bloco BUG CLIENTE:
  Mini KPIs: Criados | Cancelados | Taxa
  Tabela detalhada por relator: Relator | Criados | Cancelados | % | (ordenada por cancelados desc)
─────
(opcional) Lista resumida dos cards de fluxo completo
```

Estados vazios e de erro **por bloco** (cada um com `<AlertCircle/>` e "tentar novamente" só para aquele indicador).

### Exportação
Reuso a mesma stack (`jspdf` + `autotable`, `xlsx`, copy-to-clipboard) que já está em `cancelledReportExport.ts`. Arquivo novo `monthlyReportExport.ts` com as funções específicas (não alterar o existente). Exporta exatamente o período selecionado.

### Validação que vou rodar antes de fechar
- Build limpo (`tsgo`).
- Smoke via `curl_edge_functions`: chamar `jira-monthly-report` com mês atual e conferir os 3 indicadores contra contagens manuais no Jira.
- Verificar que os relatórios "Semana Atual" e "Cancelados" continuam idênticos (mesmos arquivos, sem diff).
- Caso de borda Indicador 1: simular um card sem changelog completo no log do edge.

### Pergunta única antes de seguir
**Qual é o nome exato do issuetype "BUG QA" no Jira** (`"BUG QA"`, `"Bug QA"`, outro)? E confirma que o projeto é o mesmo `"Bugs OrçaFascio"` para os 3 indicadores? Com isso eu sigo direto para implementação.
