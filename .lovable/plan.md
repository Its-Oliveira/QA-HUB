# Correção: Links quebrados no PDF "Detalhamento dos Cards" (Cancelados pelo QA)

## Causa raiz

No PDF gerado por `exportCancelledAsPdf` (em `src/utils/cancelledReportExport.ts`), a coluna "URL" é renderizada apenas como **texto** pelo `jspdf-autotable`. Não existe hiperlink real associado a cada linha. O que torna esse texto "clicável" é o auto-detector de URLs do leitor de PDF (Chrome/Acrobat), que tem dois problemas neste relatório:

1. A URL longa quebra em múltiplas linhas dentro da célula, então o auto-detector pega só um pedaço e gruda com texto da próxima linha/célula — gerando links que apontam para o card errado.
2. O sufixo ` [Vinculado]` adicionado por `formatUrlForExport` entra no texto da URL, confundindo ainda mais a detecção.

Resultado: o usuário clica no link de `QA-100` e o leitor abre `QA-87`, por exemplo.

## Solução

Parar de depender da auto-detecção. Anexar um hiperlink **real** por linha usando o hook `didDrawCell` do `autoTable` + `doc.link(x, y, w, h, { url })`, sempre apontando para `issues[rowIndex].url` (a URL canônica do próprio card daquela linha). Tornar a coluna **Card** o elemento clicável (em azul/sublinhado) e mover o indicador de vínculo para uma coluna dedicada **Vinculado** (Sim / —), removendo a coluna URL do PDF — que era a fonte do problema de wrapping.

Escopo: **apenas** o PDF do relatório "Cancelados pelo QA". CSV, XLSX e Copiar continuam com a URL completa via `formatUrlForExport` (não têm o bug, pois são texto puro consumido por planilhas/chat).

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/utils/cancelledReportExport.ts` | Editar somente `exportCancelledAsPdf`. Restante intacto. |

Nenhum outro arquivo é tocado. Relatório semanal não é alterado.

## Mudanças técnicas em `exportCancelledAsPdf`

1. Trocar o cabeçalho da tabela de detalhamento de  
   `["Card", "URL", "Resumo", "Relator", "Criado"]`  
   para  
   `["Card", "Resumo", "Relator", "Criado", "Vinculado"]`.
2. Montar o body diretamente de `data.issues` (não via `buildDetailRows`, para manter o índice alinhado com `issues[i].url`):
   ```ts
   const detailBody = data.issues.map((i) => [
     i.key,
     i.summary,
     i.reporter || "Sem relator",
     i.created ? fmtDate(new Date(i.created)) : "",
     hasIssueLinks(i.issuelinks) ? "Sim" : "—",
   ]);
   ```
3. Estilizar a coluna 0 (Card) como link: `columnStyles: { 0: { textColor: [37, 99, 235], fontStyle: "bold" }, 1: { cellWidth: 90 } }`.
4. Adicionar `didDrawCell` para anexar hiperlink real apenas em células de body da coluna 0:
   ```ts
   didDrawCell: (hook) => {
     if (hook.section === "body" && hook.column.index === 0) {
       const url = data.issues[hook.row.index]?.url;
       if (url) {
         doc.link(hook.cell.x, hook.cell.y, hook.cell.width, hook.cell.height, { url });
       }
     }
   }
   ```
5. Importar `hasIssueLinks` de `@/utils/jiraLinkUtils`.

## Validação

1. Abrir `/reports` → gerar "Cancelados pelo QA" → exportar PDF.
2. Abrir o PDF no Chrome e no Acrobat:
   - Clicar em pelo menos 3 cards diferentes (primeiro, meio, último da tabela).
   - Confirmar que cada clique abre **exatamente** a URL daquele card no Jira.
3. Conferir visualmente que a coluna **Vinculado** mostra "Sim" para cards com `issuelinks` e "—" caso contrário.
4. Conferir que CSV/XLSX/Copiar continuam com a URL + `[Vinculado]` como antes (sem alteração).
