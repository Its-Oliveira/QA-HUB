# Melhoria visual — Painel de Testes Automatizados

Mudança só de aparência. Dados, botões, selects, fluxo de "Rodar testes" / "Nova execução" / "Ver detalhes" e a abertura/fechamento da árvore continuam iguais.

## Etapa 1 — Análise

Arquivos que formam a tela:
- `src/pages/AutomacaoTestes.tsx` — só desta tela (cabeçalho, KPIs, árvore, Nova execução, execuções em andamento/recentes, histórico).
- `src/components/automation/TestTree.tsx` — **compartilhado** com a página "Ver detalhes" (`ExecucaoDetalhe.tsx`).
- `src/components/automation/LatestRunCard.tsx` — card "Última execução".
- `src/components/AppSidebar.tsx` — **compartilhado** com todas as telas.
- Base shadcn (`Button` etc.): não será alterada.

Tokens reaproveitados: `--background`, `--card`, `--secondary`, `--border`, `--primary`, `--success`, `--destructive`, `--warning`, fontes Sora/Manrope, `--radius`.

Riscos e como evito:
1. **Árvore compartilhada** — o novo visual também aparece em "Ver detalhes". Proposta: aceitar (consistência entre as duas telas). Se preferir isolar, adiciono uma prop opcional só de estilo.
2. **Barra lateral (2.8)** — compartilhada; mudar o item ativo afeta todas as telas. Item **não feito** sem sua aprovação explícita — por isso fica fora deste plano.
3. **Scrollbars** — classe utilitária nova `.scrollbar-subtle` em `index.css`, aplicada só nos blocos roláveis desta tela (nada global).
4. Desktop/mobile — mantenho os ajustes responsivos já feitos.

## Etapa 2 — Alterações por área

- **2.1 Sistema visual**: 3 níveis de superfície (fundo < card < hover `secondary`), bordas `border/60`, cards `rounded-xl`, controles `rounded-lg`, espaçamento em múltiplos de 4, `tabular-nums` nos números, mono só em caminhos `.cy.js`. Fundos de status com 10–15% de opacidade; ícone sempre junto da cor.
- **2.2 Cabeçalho**: "Monitoramento ao vivo" vira pill com ponto pulsante (verde conectado / âmbar senão, mesma condição atual); mais respiro título/subtítulo; botão com foco visível; divisória mais suave.
- **2.3 KPIs**: rótulo pequeno, número grande, ícone em chip translúcido; borda superior colorida de 2px nos semânticos; hover só de borda (sem cursor de clique); grid 2 / 3 / 6 colunas.
- **2.4 Árvore**: linhas-guia finas por nível, fundo só no hover, chevron com rotação suave, contadores como badge discreto à direita, faixa vermelha de 2px + leve tint em linhas com falha; contadores do cabeçalho como pills. Altura e rolagem mantidas.
- **2.5 Scrollbars**: finas, escuras, com hover mais claro, nas áreas roláveis desta tela.
- **2.6 Nova execução**: selects nativos (mesmas opções/valores/onChange) com fundo, borda, chevron, hover/focus/disabled consistentes; rótulos com mais contraste; "Rodar testes" como CTA de largura total, estados intactos.
- **2.7 Última execução**: metadados como chips discretos, "Ver detalhes" outline refinado, mini-estatísticas com ponto colorido, lista de falhas com título em caixa alta + contagem, caminho truncado com `title` mostrando completo, nome em até 2 linhas, separadores finos.
- **2.8 Barra lateral**: não incluída (ver risco 2).

Etapa 3: estados existentes (carregando, vazio, erro, disabled) só restilizados; foco visível; alvos de 40px ou mais; animações de 150–200ms com respeito a `prefers-reduced-motion`; coluna lateral abaixo da árvore em telas menores.

## Etapa 4 — Validação
Playwright em 1920/1440/1024/768px com sessão real: comparo os valores dos KPIs/contadores/lista de falhas antes e depois, testo expandir/colapsar, troca de Branch/Workflow, "Ver detalhes", confiro console limpo e ausência de rolagem lateral; capturo as outras telas para confirmar que não mudaram. Entrega no formato pedido (análise, alterações, checklist, sugestões futuras como unificar o botão duplicado "Nova execução").
