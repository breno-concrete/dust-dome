# Contrato de debrief e fontes

## Entrada do debrief

A feature do fim da missão consome:

- o `GameState.status` e `lostReason` finais;
- o `GameState.log` completo;
- explicações e fontes da configuração validada;
- a citação DONKI arquivada associada a uma tempestade de radiação.

## Saída do debrief

A tela apresenta:

- um resumo de sucesso ou fracasso;
- entradas agrupadas por ciclo e estação ou por evento;
- uma causa em inglês simples para cada perda registrada de tripulação, estrutura ou recurso;
- a explicação científica ou o rótulo explícito de simplificação de gameplay;
- uma ação de reinício usando a navegação existente da store.

Nenhum resultado histórico pode ser inventado a partir do estoque ou da lista de estruturas finais.

## Saída das fontes

A tela de fontes apresenta entradas `DataSource` deduplicadas com:

- rótulo da fonte;
- link;
- classificação: valor real, valor escalado, simplificação do jogo ou valor do jogo;
- rótulo de dados arquivados para snapshots DONKI.

As fontes permanecem com inglês como idioma principal e usam palavras curtas adequadas para
idades de 7 a 12 anos. Os componentes leem o estado da aplicação pelo limite existente da store;
qualquer exposição ausente na store exige uma solicitação de mudança de contrato.
