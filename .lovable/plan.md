# Detalhes dos Cards Jira

- Abrir um modal ao clicar no card, no ID ou no título, sem mudar o layout da listagem. Botões de editar/excluir continuam independentes.
- Mostrar ID, título, módulo, prioridade colorida e descrição original, com link para abrir no Jira.
- Buscar os campos completos pelo Jira usando as credenciais já existentes, somente no servidor. A listagem atual não conserva a descrição completa nem o módulo; por isso será necessária uma consulta ao abrir, com cache temporário para evitar consultas repetidas.
- Preservar parágrafos, listas, negrito, links e código na descrição, tratando ADF, HTML e texto/wiki sem executar conteúdo recebido.
- Incluir carregamento, erro com nova tentativa, campos vazios e rolagem interna; permitir fechar por X, Escape ou clique fora.
- Manter a ferramenta atual de reescrever o card acessível por um botão no modal.

## Detalhes técnicos

- Novo Dialog e renderizador seguro de descrição; consulta por React Query.
- Nova função `jira-issue-details` com validação de sessão e da chave do bug, reutilizando `JIRA_EMAIL` e `JIRA_API_TOKEN`. Sem alterações no banco ou na sincronização atual.
- Testes de prioridades, links seguros, formatos de descrição e validação; verificação do fluxo real em desktop e celular.