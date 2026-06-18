## Problemas identificados

**1) "Total criados no mês" = 0**
A função `fetchTotalMonth` em `supabase/functions/jira-cancelled-report/index.ts` usa o novo endpoint `/rest/api/3/search/jql` com `maxResults=0` esperando um campo `total` na resposta. Esse endpoint (versão nova/paginada por token) **não retorna mais o campo `total`** — por isso o valor sempre fica 0 e a taxa de cancelamento também fica errada.

**2) Faltam botões de exportação (PDF, XLSX, CSV, Copiar)**
O relatório de cancelados é renderizado sem uma `ExportBar`. O `ReportExportBar` atual é tipado especificamente para `WeeklyReportData` e não serve para os dados de cancelados.

---

## Correções

### A) Edge function — contar total real do mês
Em `supabase/functions/jira-cancelled-report/index.ts`:
- Substituir `fetchTotalMonth` por uma paginação real usando `/rest/api/3/search/jql` com `fields=summary` (mínimo) e `maxResults=100`, percorrendo `nextPageToken` até o fim, retornando a contagem deduplicada por `key`.
- Alternativa mais barata: usar o endpoint `/rest/api/3/search/approximate-count` (POST com `{ jql }`) — bem mais rápido e suficiente para esse indicador. Vou usar essa opção e fazer fallback para paginação caso retorne erro.
- Logar o `totalMonth` retornado para conferência.
- Deploy + teste com `supabase--curl_edge_functions` chamando `jira-cancelled-report` e verificando `totalMonth > 0`.

### B) Nova barra de exportação para o relatório de cancelados
Criar `src/utils/cancelledReportExport.ts` com:
- `exportCancelledAsXlsx(data)` — 2 abas: "Resumo" (Cancelados, Total Mês, Taxa %) e "Detalhamento" (Card, URL com indicador de vínculo via `formatUrlForExport`, Resumo, Relator, Criado).
- `exportCancelledAsCsv(data)` — mesmo conteúdo em CSV com BOM e separador `;`.
- `exportCancelledAsPdf(data)` — capa com período + KPIs, tabela de ranking de relatores, tabela de detalhamento. Mesmo padrão visual do PDF semanal (cabeçalho azul `[76,110,245]`, rodapé "QA Hub — OrçaFascio").
- `copyCancelledReportAsText(data)` — texto plano com KPIs, ranking e lista linha-a-linha (`KEY 🔗 — Resumo — Relator — DD/MM/YYYY`) usando `formatUrlForExport`.

Criar `src/components/Reports/CancelledReportExportBar.tsx` espelhando `ReportExportBar` (mesmos botões/estilo/toast), tipado em `CancelledReportData`.

Em `src/pages/Reports/index.tsx`, renderizar `<CancelledReportExportBar data={cancelled.data} />` logo acima do `<CancelledCardsReport />` quando os dados estiverem prontos.

### Arquivos
| Arquivo | Ação |
|---|---|
| `supabase/functions/jira-cancelled-report/index.ts` | ✏️ trocar `fetchTotalMonth` para `approximate-count` (com fallback paginado) |
| `src/utils/cancelledReportExport.ts` | ➕ criar (XLSX/CSV/PDF/copy) |
| `src/components/Reports/CancelledReportExportBar.tsx` | ➕ criar |
| `src/pages/Reports/index.tsx` | ✏️ montar a barra acima do relatório de cancelados |

Não tocar em: relatório semanal, `ReportExportBar` original, `useCancelledReport`, `CancelledCardsReport`.

### Validação
1. Deploy da edge function → `curl` no endpoint e confirmar `totalMonth > 0` e `cancellationRate` coerente.
2. No preview, em `/reports`, gerar o relatório de cancelados:
   - KPI "Total criados no mês" deve mostrar valor real.
   - Os 4 botões devem aparecer acima do card e devem disparar download/cópia sem erro de console.
3. Playwright headless: abrir `/reports`, restaurar sessão Supabase, clicar "Gerar Relatório" no card de cancelados, capturar screenshot do bloco de KPIs e da export bar para confirmação visual.