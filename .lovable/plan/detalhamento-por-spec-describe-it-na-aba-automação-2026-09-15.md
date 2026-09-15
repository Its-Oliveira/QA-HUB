# Detalhamento por spec / describe / it na aba Automação

## O que já existe (e será reaproveitado)

- Disparo de workflow, histórico e detalhe já funcionam em `src/pages/AutomacaoTestes.tsx`.
- Tempo real já é feito por Supabase Realtime no canal `actions-control` sobre `test_runs` — **não será criado outro canal**; o novo detalhe entra no mesmo mecanismo.
- `github-actions-webhook` + `syncRun` já sincronizam status, jobs e passos do GitHub.
- Já existe um endpoint de callback (`test-run-webhook`) que o CI pode chamar, mas hoje só aceita um resumo achatado (`failures[].name` como texto único). Ele continua funcionando; o novo caminho é mais detalhado.

## O que falta

Nada hoje guarda a árvore spec > describe > it. É preciso capturar isso de dentro do Cypress.

## Mudanças

### 1. Banco — nova tabela `test_results`

Uma linha por teste (`it`) de cada execução:
`run_id` (→ `test_runs.id`), `spec` (caminho relativo), `describe_path` (array, suporta aninhamento), `title`, `full_title`, `status` (`running` | `passed` | `failed` | `pending` | `skipped`), `duration_ms`, `error_message`, `error_stack`, `screenshot`, `video`, `source_line`, `attempts`, `created_at`, `updated_at`.

- Chave única `(run_id, spec, full_title)` → upsert idempotente, sem duplicar entre o ao vivo e o relatório final.
- RLS: leitura para autenticados; escrita só pelas funções de servidor.
- Realtime ligado na tabela (mesmo padrão de `test_runs`).
- Também gravar `spec` e contagens em `test_runs` quando o relatório final chegar.

### 2. Novo endpoint `cypress-events`

Autenticado por segredo compartilhado (o mesmo padrão já usado), recebe:

- **eventos ao vivo**: `suite:start`, `test:start`, `test:end` → upsert de uma linha em `test_results`;
- **lote final**: o JSON consolidado do mochawesome → upsert de toda a árvore, com erro, stack, duração, screenshot/vídeo e linha do arquivo.

Retentativas: apenas o resultado final de cada teste é mostrado; o número de tentativas fica no campo `attempts`.

### 3. Reconciliação e execuções interrompidas

Quando `syncRun` marcar a execução como concluída/cancelada/falha, todos os testes ainda em `running` daquela execução passam a `skipped`. Nenhum teste fica preso rodando.

### 4. Interface

- **Árvore spec > describe > it** no detalhe da execução (ao vivo e no histórico), expansível, com ícone de estado por nó e erro/stack do `it` que falhou. Atualização incremental por linha (Realtime) e renderização virtualizada para suítes grandes.
- **Card da última execução** fixo no topo da aba, independente dos filtros, listando direto os testes que falharam; reflete o estado ao vivo enquanto roda e reconcilia com o relatório final ao terminar.
- **Link para o código**: cada spec/it vira link para `https://github.com/{owner}/{repo}/blob/{commit_sha}/{spec}#L{linha}`; sem a linha, link para o arquivo.

### 5. Arquivos a entregar para o repositório de testes

Como os testes vivem em `LeonardoTaadeu/Automa-o-OF`, vou gerar nesse projeto (em `docs/cypress-integration/`) os arquivos prontos para você copiar para lá:

- `qahub-reporter.cjs` — reporter Mocha que envia os eventos ao vivo;
- ajuste de `cypress.config` com mochawesome + o reporter;
- trecho do workflow do GitHub Actions que envia o relatório consolidado no final.

Os runners hospedados do GitHub têm saída de rede aberta, então conseguem alcançar o backend do QAhub — não é preciso runner próprio.

## Fora do escopo

Relatórios de Jira, lembretes e demais abas permanecem intocados.
