# Dados na pasta do SharePoint, um arquivo JSON por alteração

A fila é usada por várias pessoas e precisa de dados compartilhados sem servidor, sem banco externo e sem conta nova. Por isso, o painel é um HTML guardado numa pasta do SharePoint, sincronizada pelo OneDrive em cada PC, e aberto no Edge ou no Chrome. Ele lê e grava a pasta por meio do acesso a arquivos locais do navegador, e cada alteração é salva na hora, como um arquivo JSON próprio que nunca é reescrito. Um `dados.json` único foi descartado: quando duas pessoas salvam ao mesmo tempo, o OneDrive gera cópias em conflito e uma das alterações se perde sem aviso.

## Opções consideradas

- **Um `dados.json` único na pasta**: descartado pelo risco de conflito descrito acima.
- **HTML com Supabase (banco e login)**: tem tempo real e login de verdade, mas coloca os dados fora do Microsoft 365 e exige outra conta.
- **Artifact do claude.ai com banco compartilhado**: exige que todos os usuários tenham conta no claude.ai.
- **Lista do SharePoint via Microsoft Graph**: exige registrar um app no Azure, o que depende da TI.

## Consequências

- Alterações de colegas aparecem com o atraso da sincronização do OneDrive, de segundos a minutos, e não em tempo real.
- Não há login: o painel identifica a pessoa por um nome escolhido no PC, e qualquer um com acesso à pasta pode alterar a fila.
- A fila é montada lendo todos os arquivos de alteração, e esse conjunto de arquivos é também o histórico de quem fez o quê.
