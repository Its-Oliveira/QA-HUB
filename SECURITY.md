# Segurança do QA Hub

O app é um front estático no GitHub Pages: **tudo que vai para o navegador é público**.

## O que pode ficar no front (público por design)
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (chave *anon*). A proteção real dos dados é o **RLS** + login do Supabase.
- Configure-as em *Settings > Secrets and variables > Actions*; o `.env` não é versionado (use `.env.example` como modelo).

## O que NUNCA pode ir ao front/repositório
`service_role`, `JIRA_API_TOKEN`, `GITHUB_PAT`, `*_WEBHOOK_SECRET`, `QAHUB_EVENTS_SECRET`. Ficam só em *Supabase > Edge Functions > Secrets*.

## Checklist no painel do Supabase
1. **Authentication > Providers > Email: desligar "Allow new users to sign up"** (as policies RLS liberam tudo para `authenticated`; com signup aberto, qualquer pessoa cria conta e lê tudo). Crie os usuários manualmente.
2. Habilitar confirmação de e-mail e política de senha forte.
3. Fazer deploy das Edge Functions alteradas (`supabase functions deploy`): as de Jira e `sync-jira` agora exigem usuário logado.
4. Se algum dia um segredo for commitado: **rotacione** a credencial (apagar o commit não basta, o histórico é público).
