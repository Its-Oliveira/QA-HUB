# Detalhamento por spec / describe / it — o que copiar para o repositório de testes

Os testes Cypress vivem em `LeonardoTaadeu/Automa-o-OF`. Para o QA Hub mostrar a
árvore **spec › describe › it** (ao vivo e no histórico), copie os arquivos desta
pasta para aquele repositório e ajuste o workflow conforme abaixo.

O QA Hub identifica a execução pelo `GITHUB_RUN_ID` — não é preciso passar
nenhum parâmetro extra no disparo.

---

## 1. Segredos no repositório de testes

Em **Settings → Secrets and variables → Actions** do repositório dos testes, crie:

| Nome | Valor |
| --- | --- |
| `QAHUB_EVENTS_URL` | URL da função `cypress-events` do QA Hub |
| `QAHUB_EVENTS_SECRET` | o mesmo valor aleatório salvo no QA Hub |

## 2. Dependências

```bash
npm i -D mochawesome mochawesome-merge cypress-multi-reporters
```

## 3. Reporter ao vivo

Copie `qahub-reporter.cjs` para `cypress/reporters/qahub-reporter.cjs`.

## 4. `reporter-config.json` (raiz do repositório)

```json
{
  "reporterEnabled": "mochawesome, cypress/reporters/qahub-reporter.cjs",
  "mochawesomeReporterOptions": {
    "reportDir": "cypress/results",
    "overwrite": false,
    "html": false,
    "json": true
  }
}
```

## 5. `cypress.config.js`

```js
module.exports = defineConfig({
  reporter: "cypress-multi-reporters",
  reporterOptions: { configFile: "reporter-config.json" },
  // ...resto da configuração
});
```

## 6. Workflow do GitHub Actions

Dentro do job do Cypress:

```yaml
      - name: Rodar Cypress
        run: npx cypress run
        env:
          QAHUB_EVENTS_URL: ${{ secrets.QAHUB_EVENTS_URL }}
          QAHUB_EVENTS_SECRET: ${{ secrets.QAHUB_EVENTS_SECRET }}

      - name: Consolidar relatório
        if: always()
        run: npx mochawesome-merge "cypress/results/*.json" > cypress/results/merged.json

      - name: Enviar relatório ao QA Hub
        if: always()
        run: |
          jq -n \
            --arg run "$GITHUB_RUN_ID" \
            --slurpfile report cypress/results/merged.json \
            '{type:"report", github_run_id:$run, report:$report[0]}' \
          | curl -sS -X POST "${{ secrets.QAHUB_EVENTS_URL }}" \
              -H "Content-Type: application/json" \
              -H "X-QAHub-Secret: ${{ secrets.QAHUB_EVENTS_SECRET }}" \
              --data-binary @-

      - name: Publicar artefatos
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-results
          path: |
            cypress/results
            cypress/screenshots
            cypress/videos
```

---

## Comportamento no QA Hub

- Os eventos ao vivo aparecem enquanto o teste roda; o relatório consolidado
  chega no fim e sobrescreve cada teste (chave: execução + arquivo + título).
- **Retentativas:** apenas o resultado final de cada teste é exibido; o número
  de tentativas aparece ao lado do título.
- Se a execução for cancelada ou quebrar no meio, os testes que ficaram em
  "rodando" são marcados como ignorados automaticamente.
- Cada arquivo e cada teste ganha link para o GitHub no commit exato da execução.
