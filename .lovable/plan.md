

## Problema

O `BrowserRouter` no `App.tsx` não tem `basename="/QA-HUB/"`. Quando o GitHub Pages serve o app em `/QA-HUB/`, o React Router tenta resolver as rotas a partir de `/`, o que causa página em branco ou 404.

## Plano

### 1. Adicionar basename ao BrowserRouter (`src/App.tsx`)

Alterar a linha 49:
```tsx
<BrowserRouter basename="/QA-HUB">
```

Isso faz com que todas as rotas (`/login`, `/cards`, etc.) funcionem corretamente sob o prefixo `/QA-HUB/`.

### 2. Verificar se os secrets do GitHub Actions estão configurados

Confirmar que no repositório `its-oliveira/QA-HUB` existem os secrets:
- `VITE_SUPABASE_URL` → `https://kdmruvwgxepwiwppuzlj.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` → a chave anon

Após o push, o workflow fará o deploy automático.

