# Contrato do motor de eventos

## Função

```ts
updateEvents(state: GameState, config: GameConfig, dt: number): GameState
```

Definida em `src/engine/events/events.ts` e chamada por `tick()` depois do avanço do tempo.

## Entradas

- `state`: estado imutável atual do jogo, incluindo `time`, `rng`, estruturas, tripulação,
  trabalhos, eventos ativos, estado da radiação e log.
- `config`: configuração de jogo validada a partir dos arquivos JSON pertencentes aos POs.
- `dt`: segundos de jogo decorridos no tick atual.

## Saídas

Retorna uma nova referência de estado somente quando o estado dos eventos muda. A função pode
atualizar:

- `rng`;
- `activeEvents`;
- `nextEventAt`;
- `radiationStorm`;
- status das estruturas;
- resultados da tripulação exigidos pelo contrato atual de radiação;
- trabalhos pausados por um aviso de radiação;
- entradas de log de eventos e perdas.

## Invariantes

- Não mutar o estado de entrada.
- Não usar React, store, fetch, I/O de arquivo, timers ou `Math.random`.
- A mesma seed, estado de entrada, configuração e `dt` produzem a mesma saída.
- Somente regras correspondentes ao ciclo e estação atuais podem ser agendadas.
- Efeitos temporários expiram; status persistentes de estruturas permanecem até sua correção.
- Tempestades de radiação usam uma citação DONKI arquivada quando disponível.
- Ausência de estado necessário no contrato bloqueia uma alteração separada em `shared/`, não um
  cast local ou fallback silencioso.
