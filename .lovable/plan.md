

## Problema

O workflow do GitHub Actions usa `${{ secrets.VITE_SUPABASE_URL }}`, que lê **Repository secrets**. Porém, os secrets foram configurados dentro de **Environment secrets** (ambientes `gh-pages` e `main`). Como o job não declara `environment:`, ele não consegue acessar esses secrets — resultando em variáveis vazias e no erro "supabaseUrl is required".

## Plano

### 1. Adicionar `environment: github-pages` ao workflow (`.github/workflows/deploy.yml`)

Adicionar a propriedade `environment` no job `deploy` para que ele acesse os secrets do environment correto:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      ...
```

Isso faz o workflow buscar os secrets dentro do environment `github-pages` onde você já os configurou.

### Alternativa (sem alterar código)

Se preferir não alterar o workflow, vá no GitHub → Settings → Secrets and variables → Actions → **Repository secrets** (não environment secrets) e crie os dois secrets lá:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Nesse caso, pode remover os duplicados dos environments para evitar confusão.

