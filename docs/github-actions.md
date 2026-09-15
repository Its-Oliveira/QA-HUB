# Central de Automação

React/Vite + Supabase Auth, Edge Functions e Postgres Realtime, seguindo a arquitetura existente. Não existem roles no QAhub: qualquer usuário autenticado pode ler e disparar; identidade vem de `auth.getUser`, nunca do corpo enviado pelo cliente. RLS proíbe gravação direta no histórico. Auditoria e cache só são acessíveis via service role.

## Instalação

1. Aplique `supabase db push` depois de revisar a migration.
2. Configure secrets exclusivamente no Supabase: `GITHUB_PAT`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_WEBHOOK_SECRET`, `TEST_RUN_WEBHOOK_SECRET`. PAT precisa de Actions read/write e Contents read; environments exige acesso de leitura aos environments do repositório. Nunca use prefixo VITE para esses secrets.
3. Faça deploy de `github-actions`, `github-actions-webhook`, `test-run-webhook` e `trigger-cypress-run` (este último desativa a rota antiga). A autenticação da central é validada dentro da função. Os webhooks usam assinatura/secret, não JWT do usuário.
4. Configure webhook no repositório externo: URL `https://<project>.supabase.co/functions/v1/github-actions-webhook`, content type JSON, secret igual a `GITHUB_WEBHOOK_SECRET`, eventos **Workflow runs** e **Workflow jobs**. A função consulta o estado atual para evitar regressão por entrega fora de ordem; as alterações são retransmitidas via WebSocket pelo Supabase Realtime.
5. Workflows devem existir na branch padrão e aceitar `workflow_dispatch`. Inputs são extraídos do YAML da branch selecionada. Workflows sem dispatch mostram erro explícito. A integração usa versão GitHub REST `2026-03-10`, que retorna `workflow_run_id` no disparo.

Não há polling GitHub no navegador. Catálogo, definição e artefatos têm cache backend; importação inicial das últimas 50 execuções tem cache de 5 minutos. Atualizações subsequentes vêm dos webhooks. Esta versão exige webhooks funcionando; não tem scheduler de polling como fallback. O cache não é um lock distribuído de preenchimento; requisições simultâneas podem preencher a mesma chave. A restrição única de execuções locais ativas protege disparos concorrentes dentro do QAhub. Disparos simultâneos feitos diretamente no GitHub não são controlados pelo QAhub; configure `concurrency` no workflow para proteção global.

## Relatórios Cypress existentes

O repositório do QAhub só contém o deploy do frontend e testes Vitest; os E2E Cypress vivem no repositório externo indicado pelos secrets. Não foi possível inspecionar o formato real desses relatórios localmente. Mantivemos o contrato existente de `report_url`, contadores e callback, acrescentando `failures` sem trocar o formato do relatório.

Depois dos testes, envie ao `test-run-webhook`, com header `X-Webhook-Secret`, o `correlation_id` retornado pelo disparo ou recuperado pelo backend, junto de:

```json
{
  "correlation_id": "uuid-da-execucao",
  "report_url": "https://seu-host/relatorio-cypress",
  "total": 10,
  "passed": 9,
  "failed": 1,
  "failures": [{
    "name": "login.cy.ts > autentica usuário",
    "message": "Expected dashboard to be visible",
    "stack": "AssertionError: ...",
    "screenshot": "https://seu-host/screenshot.png",
    "video": "https://seu-host/video.mp4"
  }]
}
```

Como workflows genéricos não recebem correlation_id, o callback também aceita `github_run_id` como identificador (quando correlation_id ausente). Utilize `${{ github.run_id }}`. Envie dados extraídos do reporter já usado no repositório externo. Sem esse callback, os jobs/steps e ZIPs dos artefatos ficam disponíveis, mas não é possível afirmar quais casos de teste falharam apenas pelo status do job. HTML é aberto em link externo, não injetado no QAhub. URLs de relatórios e mídias devem ser HTTPS. Arquivos privados são baixados pelo link assinado temporário do GitHub; PAT nunca é retornado.

Persistência: metadados compactos de execução, resumo de jobs/steps, falhas enviadas pelo reporter e auditoria; artefatos/logs completos permanecem no GitHub e obedecem à retenção do GitHub. História local permanece após expiração do artefato.

## Validação em ambiente integrado

Abra a aba em duas sessões autenticadas, dispare workflow e confirme queued/in_progress/conclusão nas duas. Verifique progresso por steps e duração. Teste filtros, paginação, relatório com falha real e download privado/expirado. Confirme que requisições do frontend vão apenas ao Supabase e ao link assinado de download, sem PAT. Teste PAT inválido, falta de permissão, rate limit, branch removida e workflow sem dispatch. Confirme que insert/update/delete em test_runs com chave de usuário são rejeitados e webhook sem assinatura retorna 401.
