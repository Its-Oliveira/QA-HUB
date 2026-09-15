# Kit de integração Cypress → QA Hub (arquivos prontos para o repositório de testes)

## Objetivo
Entregar ao usuário, como anexos para download aqui no chat, todos os arquivos prontos que ele precisa copiar para o repositório de testes `LeonardoTaadeu/Automa-o-OF`, acompanhados de um guia curto dizendo onde cada arquivo vai.

## O que será criado (em `/mnt/documents/qahub-cypress-kit/`)

1. **`qahub-reporter.cjs`** — copiar para `cypress/reporters/qahub-reporter.cjs`
   (conteúdo já existente em `docs/cypress-integration/qahub-reporter.cjs`, sem alterações)
2. **`reporter-config.json`** — copiar para a raiz do repositório de testes
3. **`cypress.config.exemplo.js`** — apenas as 2 linhas a adicionar no `cypress.config.js` existente do repositório (com comentário explicando onde entra)
4. **`workflow-snippet.yml`** — o bloco a colar no workflow do GitHub Actions (env no passo do Cypress + 3 passos finais: consolidar, enviar ao QA Hub, publicar artefatos)
5. **`LEIA-ME.txt`** — resumo dos passos: onde salvar cada arquivo, o comando `npm i -D mochawesome mochawesome-merge cypress-multi-reporters`, e os 2 segredos (`QAHUB_EVENTS_URL` com a URL já enviada no chat, `QAHUB_EVENTS_SECRET` com a mesma senha aleatória salva no QA Hub)

## Como será entregue
- Cada arquivo como anexo individual no chat, para download.
- Nenhuma alteração no código do QA Hub — é apenas um kit de cópia.

## Verificação
- Conferir que os 5 arquivos existem em `/mnt/documents/qahub-cypress-kit/` e que o conteúdo do repórter é idêntico ao de `docs/cypress-integration/`.
