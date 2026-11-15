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
- uma ação de reinício que chama `start()` da store (uma partida nova, sem passar pelo título).

Nenhum resultado histórico pode ser inventado a partir do estoque ou da lista final de estruturas.

### Regras do debrief

- **Evento não é perda.** A entrada `radiation_storm` é um evento. Só `death` conta como perda
  (SC-005). Uma tempestade sem mortes aparece como evento, sem perda.
- **O que aconteceu** vem só do log: danos, entupimentos, curtos, mortes e tempestade de
  radiação. O que a estação traz (frio, escuridão, tempestade global) vem das regras de
  `events.json` das estações alcançadas (`season_start`) e é escrito como descrição da estação
  ("o tempo nesta estação"), nunca como fato ocorrido.
- **Mortes:** uma linha por ciclo, estação e causa, com a contagem. "astronaut" e "astronauts"
  são o único plural fixo no código.
- **Estruturas:** uma linha por ciclo, estação, regra e status, no formato "Solar panel × 2".
  Sem plural montado em código. O tipo vem de `game.structures` pelo `ref` (os ids são `s<n>`,
  sem o tipo); estrutura que já não existe aparece como "structure".
- **`ref` da tempestade** tem dois significados (link do DONKI ou a palavra `radiation_storm`);
  um helper único em `debrief.ts` decide, e só link `https://` vira link.
- **Reinício:** o botão chama `start()` da store, como a tela de título, e leva direto a uma
  partida nova (Constituição VII: reiniciar é um clique).

## Saída das fontes

A tela de fontes apresenta entradas `DataSource` sem duplicatas, com:

- rótulo da fonte;
- link;
- classificação: valor real, valor escalado, simplificação do jogo ou valor do jogo;
- rótulo de dados arquivados para snapshots DONKI.

Regras de apresentação:

- As fontes são agrupadas por `url`. Se a mesma URL aparece com classificações diferentes, ela
  sai uma só vez, com as classificações numa linha.
- O evento DONKI citado por uma tempestade aparece como "NASA DONKI solar event (archived)", com o
  link e o id tirado do fim da URL. A data não é exibida (ver `spec.md`, cenário 4 da US4).
- Os títulos e frases fixas das telas ficam em `strings` no componente; o texto de cada evento
  vem do `explain` da regra em `events.json` e o de cada morte, de `narrator.debrief.causes`.
- Em `LogEntry.cause` das estruturas, o valor é o id da regra de `events.json`. Um `cause` que
  não casa com nenhuma regra não quebra a tela: a entrada aparece com um rótulo genérico de
  simplificação.

As fontes priorizam o inglês e usam palavras curtas adequadas para idades de 7 a 12 anos. Os
componentes leem o estado da aplicação pelo limite existente da store; qualquer exposição ausente
na store exige uma solicitação de alteração de contrato.
