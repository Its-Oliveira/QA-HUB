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

## 4. `cypress.config.js`

Declare o reporter local com caminho absoluto. Isso evita que o GitHub Actions
procure o arquivo na pasta errada:

```js
const path = require("path");

module.exports = defineConfig({
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: [
      "mochawesome",
      path.resolve(__dirname, "cypress/reporters/qahub-reporter.cjs"),
    ],
    mochawesomeReporterOptions: {
      reportDir: "cypress/results",
      overwrite: false,
      html: false,
      json: true,
    },
  },
  // ...resto da configuração
});
```

O arquivo `reporter-config.json` antigo deixa de ser usado e pode ser removido.

## 5. Workflow do GitHub Actions

Dentro do job do Cypress:

```yaml
      - name: Validar integração QA Hub
        shell: bash
        env:
          QAHUB_EVENTS_URL: ${{ secrets.QAHUB_EVENTS_URL }}
          QAHUB_EVENTS_SECRET: ${{ secrets.QAHUB_EVENTS_SECRET }}
        run: |
          test -f cypress/reporters/qahub-reporter.cjs || { echo "Reporter QA Hub não encontrado"; exit 1; }
          test -n "$QAHUB_EVENTS_URL" || { echo "QAHUB_EVENTS_URL não configurado"; exit 1; }
          test -n "$QAHUB_EVENTS_SECRET" || { echo "QAHUB_EVENTS_SECRET não configurado"; exit 1; }

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
        env:
          QAHUB_EVENTS_URL: ${{ secrets.QAHUB_EVENTS_URL }}
          QAHUB_EVENTS_SECRET: ${{ secrets.QAHUB_EVENTS_SECRET }}
        run: |
          test -s cypress/results/merged.json || { echo "Relatório consolidado não encontrado"; exit 1; }
          jq -n \
            --arg run "$GITHUB_RUN_ID" \
            --slurpfile report cypress/results/merged.json \
            '{type:"report", github_run_id:$run, report:$report[0]}' \
          | curl --fail-with-body -sS -X POST "$QAHUB_EVENTS_URL" \
              -H "Content-Type: application/json" \
              -H "X-QAHub-Secret: $QAHUB_EVENTS_SECRET" \
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
