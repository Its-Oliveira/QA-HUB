## Ajustes no Relatório Mensal de QA

### 1. Excluir relatores Caio de Oliveira e Leonardo Tadeu Brito Pedro
Filtrar essas duas pessoas em todos os 3 indicadores (BUG CLIENTE, BUG QA, Fluxo completo) — eles não devem ser contados nos totais, no breakdown por relator, nos gráficos nem nas tabelas de detalhamento.

Local: `supabase/functions/jira-monthly-report/index.ts`
- Adicionar constante `EXCLUDED_REPORTERS = ["Caio de Oliveira", "Leonardo Tadeu Brito Pedro"]`
- Filtrar via JQL nas 3 buscas (`AND reporter not in ("Caio de Oliveira", "Leonardo Tadeu Brito Pedro")` — mais eficiente) e/ou filtro defensivo em código por `displayName`.

### 2. Regra do Fluxo completo — exigir resolução "Itens concluídos"
Atualmente o Indicador 1 considera qualquer card com `statusCategory = Done` (qualquer resolução). Passa a considerar apenas cards com **resolução = "Itens concluídos"**.

Local: `computeFlowCompleted` em `supabase/functions/jira-monthly-report/index.ts`
- JQL passa de `statusCategory = Done AND resolutiondate >= ...` para `status = Done AND resolution = "Itens concluídos" AND resolutiondate >= ...`.
- Demais regras (passagem cronológica por Backlog → Em Desenvolvimento → Done) ficam iguais.

### 3. Link na chave dos cards para o JIRA
Nas tabelas de detalhamento (Fluxo completo, BUG QA, BUG CLIENTE cancelados), a coluna "Chave" passa a ser um link clicável (`target="_blank"`, `rel="noopener noreferrer"`) usando o `url` que já vem da edge function (`https://orcafascio.atlassian.net/browse/<KEY>`).

Local: `src/components/Reports/MonthlyQAReport.tsx`
- Componente `DetailTable` ganha suporte a células React (não só string). As 3 chamadas passam o `Chave` como `<a href={i.url} ...>{i.key}</a>` em vez de string.
- Estilo: cor `text-primary` + underline no hover, mantendo paleta dark existente.

### Exportação (PDF/XLSX/CSV)
Mantém a chave como texto puro (não há clique em CSV/XLSX e o PDF atual usa autoTable com strings). Sem alterações em `monthlyReportExport.ts` exceto garantir que os dados exportados também respeitem o filtro de relatores e a nova regra de resolução — o que acontece automaticamente, já que vêm da mesma resposta da edge function.

### Verificação
- Rodar a edge function para 01/06/2026–23/06/2026 e conferir que Caio e Leonardo não aparecem em nenhuma seção.
- Confirmar que o número de "Fluxo completo" muda (provavelmente cai) porque a restrição de resolução é mais estreita.
- Conferir visualmente no preview que as chaves estão clicáveis e abrem o Jira em nova aba.
- Indicadores 2/3 agregados, "Cards em Aberto — Semana Atual" e "Cards Cancelados pelo QA — Mês Atual" não são tocados.
