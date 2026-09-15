# Corrigir o reporter Cypress e o envio ao QA Hub

## Diagnóstico confirmado

- O `cypress-multi-reporters` resolve `./cypress/reporters/qahub-reporter.cjs` a partir da pasta onde `npx cypress run` é executado.
- A mensagem `Reporter not found` confirma que esse arquivo não existe nesse caminho durante o GitHub Actions, ou que o teste está rodando em outra pasta.
- Os testes continuam porque o Mochawesome foi carregado, mas o reporter ao vivo não foi executado.
- Não houve chamada recente à função `cypress-events`; portanto, o relatório consolidado também não chegou ao QA Hub.

## Implementação

1. **Tornar o reporter independente da pasta atual**
   - Resolver o caminho absoluto do `qahub-reporter.cjs` no `cypress.config.js`.
   - Passar esse caminho ao `cypress-multi-reporters`, evitando depender do diretório de execução do workflow.

2. **Garantir que o arquivo esteja no GitHub Actions**
   - Adicionar uma validação antes dos testes que confirma a existência de `cypress/reporters/qahub-reporter.cjs`.
   - Se estiver ausente, encerrar imediatamente com uma mensagem clara, em vez de executar sem resultados ao vivo.

3. **Aguardar os eventos antes de encerrar**
   - Implementar o método `done` do reporter para aguardar todos os envios pendentes.
   - Registrar erros de envio no log sem esconder o status HTTP retornado pelo QA Hub.

4. **Fortalecer o envio consolidado**
   - Manter o Mochawesome como fonte final dos resultados.
   - Fazer o passo de envio falhar de forma explícita quando a URL, o segredo, o arquivo consolidado ou a resposta do QA Hub estiverem incorretos.
   - Exibir no log a confirmação com as quantidades recebidas pelo QA Hub.

5. **Entregar os arquivos corrigidos**
   - Atualizar o kit pronto com o reporter, configuração do Cypress, configuração dos reporters e workflow.
   - Incluir instruções exatas de destino para substituir os arquivos no repositório `LeonardoTaadeu/Automa-o-OF`.

## Validação

- Confirmar que o workflow encontra o arquivo antes de iniciar os testes.
- Confirmar que não aparece mais `Reporter not found`.
- Confirmar chamadas HTTP bem-sucedidas para eventos ao vivo e relatório final.
- Confirmar que os testes aparecem por `spec / describe / it` na execução correspondente do QA Hub.
