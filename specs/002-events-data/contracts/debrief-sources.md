# Contrato do debrief e das fontes

## Entrada do debrief

A feature de fim de missão consome:

- o `GameState.status` e `lostReason` finais;
- o `GameState.log` completo;
- explicações e fontes da configuração validada;
- a citação DONKI arquivada associada a uma tempestade de radiação.

## Saída do debrief

A tela apresenta:

- um resumo de sucesso ou falha;
- entradas agrupadas por ciclo e estação ou por evento;
- uma causa em inglês simples para cada perda registrada de tripulação, estrutura ou recurso;
- a explicação científica ou um rótulo explícito de simplificação de gameplay;
- uma ação de reinício usando a navegação existente da store.

Nenhum resultado histórico pode ser inventado a partir do estoque ou da lista final de estruturas.

## Saída das fontes

A tela de fontes apresenta entradas `DataSource` sem duplicatas, com:

- rótulo da fonte;
- link;
- classificação: valor real, valor escalado, simplificação do jogo ou valor do jogo;
- rótulo de dados arquivados para snapshots DONKI.

As fontes priorizam o inglês e usam palavras curtas adequadas para idades de 7 a 12 anos. Os
componentes leem o estado da aplicação pelo limite existente da store; qualquer exposição ausente
na store exige uma solicitação de alteração de contrato.
