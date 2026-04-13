

# Integração Jira — Sincronizar Cards do Projeto BUG

## Resumo

Criar uma Edge Function que se conecta à API do Jira (projeto **BUG** em `orcafascio.atlassian.net`), busca os cards nos status relevantes e sincroniza com a tabela `jira_cards`. O botão "Sincronizar com Jira" será ativado na tela de Cards Jira.

## O que será feito

1. **Armazenar credenciais do Jira** — Salvar o email e API token como secrets seguros no backend (JIRA_EMAIL, JIRA_API_TOKEN)

2. **Criar Edge Function `sync-jira`** — Função backend que:
   - Consulta a API REST do Jira (v3) buscando issues do projeto BUG
   - Filtra por status (Backlog, Em Revisão QA, Em Produção) — será necessário mapear os nomes dos status do Jira para os status do app
   - Mapeia prioridade do Jira (Highest/High → HIGH, Medium → MEDIUM, Low/Lowest → LOW)
   - Faz upsert na tabela `jira_cards` usando a chave `key` como identificador único
   - Retorna o resultado da sincronização

3. **Ativar o botão "Sincronizar com Jira"** — Remover o `disabled` do botão, conectar ao endpoint da Edge Function, mostrar loading durante a sincronização e toast de sucesso/erro

4. **Adicionar coluna `jira_synced`** — Flag booleana na tabela `jira_cards` para distinguir cards criados manualmente dos importados do Jira

## Pré-requisito

Antes de implementar, precisarei solicitar que você insira os dois secrets (email e token da API do Jira) através de um formulário seguro. Os valores nunca ficam expostos no código.

## Detalhes técnicos

- **API do Jira**: `GET /rest/api/3/search?jql=project=BUG` com Basic Auth (base64 de email:token)
- **Edge Function**: `supabase/functions/sync-jira/index.ts` com CORS e validação
- **Mapeamento de status**: Será preciso confirmar os nomes exatos dos status no board do Jira para mapear corretamente para "Backlog", "Em Revisão QA" e "Em Produção"

