

## Problema

O `basename="/QA-HUB"` funciona no GitHub Pages, mas quebra o preview do Lovable (que serve na raiz `/`).

## Solução

Tornar o `basename` condicional usando uma variável de ambiente do Vite. No Lovable preview, o basename será `"/"`. No GitHub Pages, será `"/QA-HUB"`.

### 1. Alterar `src/App.tsx`

Substituir:
```tsx
<BrowserRouter basename="/QA-HUB">
```
Por:
```tsx
<BrowserRouter basename={import.meta.env.BASE_URL}>
```

### 2. Alterar `vite.config.ts`

Adicionar a propriedade `base` condicional:
```ts
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/QA-HUB/' : '/',
  // ... resto da config
}))
```

### 3. Atualizar `.github/workflows/deploy.yml`

No passo de build, garantir que o modo é `production`:
```yaml
- run: npm run build
```
(O `npm run build` já usa `mode: production` por padrão, então nada muda aqui.)

### Resultado

- **Lovable preview** (dev): `base = "/"` → funciona normalmente
- **GitHub Pages** (build): `base = "/QA-HUB/"` → funciona no subpath

