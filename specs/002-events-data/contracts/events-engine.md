# Contrato do engine de eventos

## Função

```ts
updateEvents(state: GameState, config: GameConfig, dt: number): GameState
```

Definida em `src/engine/events/events.ts` e chamada por `tick()` depois do avanço do tempo.

## Entradas

- `state`: estado imutável atual do jogo, incluindo `time`, `rng`, estruturas, tripulação,
  trabalhos, eventos ativos, estado da radiação e log.
- `config`: configuração validada do jogo a partir dos arquivos JSON sob responsabilidade dos POs.
- `dt`: segundos de jogo decorridos no tick atual.

## Saídas

Retorna uma nova referência de estado somente quando o estado dos eventos muda. A função pode
atualizar:

- `rng`;
- `activeEvents`;
- `nextEventAt`;
- `radiationStorm`;
- status das estruturas;
- resultados da tripulação exigidos pelo contrato existente de radiação;
- trabalhos pausados por um aviso de radiação;
- entradas de eventos e perdas no log.

## Invariantes

- Não alterar o estado de entrada.
- Não usar React, store, fetch, acesso a arquivos, timers ou `Math.random`.
- A mesma seed, estado de entrada, configuração e `dt` produzem a mesma saída.
- Somente regras compatíveis com o ciclo e a estação atuais podem ser agendadas.
- `nextEventAt[rule.id]` é o início da próxima ocorrência; nas regras com duração, o intervalo
  conta do fim da ocorrência anterior.
- Eventos de estação inteira ficam ativos desde o primeiro tick da estação, uma única vez.
- Ocorrências são aplicadas em ordem cronológica; o resultado não depende do tamanho de `dt`.
- Efeitos temporários expiram; status persistentes das estruturas permanecem até sua correção.
- Cada estrutura tem um único status; um evento nunca troca um status mais grave por um mais leve
  (`short_circuit` > `damaged` > `clogged`).
- Só estruturas prontas e sem `dust_filters` podem ser alvo; um tipo sem alvo elegível é ignorado.
- Todo dano, entupimento e curto gera uma entrada de log com a estrutura em `ref` e o id da regra
  em `cause`.
- Nenhum número de balanceamento no código: os valores vêm da configuração.
- Retorna a mesma referência de estado quando nada mudou.

## Fora deste contrato (engine)

`updateEvents` não bloqueia trabalhos, não altera produção e não mata astronautas por frio. O
engine lê `activeEvents` (`solarFactor`, `blocksExternalJobs`, tempestades ativas) e os status das
estruturas. Ver a seção "Fora do escopo da US2" em [spec.md](../spec.md).
- Tempestades de radiação usam uma citação DONKI arquivada quando disponível.
- `events.ts` pode importar `sepEvents()` de `src/data/donki`: o snapshot é um JSON estático
  embutido no pacote, como os JSON da configuração, sem leitura de arquivo em runtime, e não cria
  campo novo em `GameState` nem em `GameConfig`. A lógica da tempestade fica numa função interna
  `updateRadiationStorm(state, config, dt, events: () => readonly SepEvent[])`, que recebe a
  lista por uma função e é a que os testes chamam com `() => fixtures`. `updateEvents` mantém a
  assinatura e passa a própria `sepEvents`, que só é chamada quando uma tempestade vai começar.
  O plano das tempestades é exportado como `radiationPlan(seed, cycle, config)`, para os testes
  calcularem o horário esperado sem copiar a lógica. Se a leitura do snapshot for considerada
  "acesso a arquivos" pelo tech lead, o caminho alternativo é um pedido `shared/` para
  `GameConfig` ganhar a lista.
- Log da tempestade de radiação: uma entrada por tempestade, gravada uma vez, quando o aviso
  começa (nenhuma → `warning`), com `kind` e `cause` `radiation_storm`. O `ref` tem dois
  significados: a `url` do evento DONKI citado ou, quando não há evento (lista vazia), a palavra
  `radiation_storm`. O debrief (US4) deve tratar os dois casos, e o caso sem evento não pode
  inventar uma citação.
- Ausência de estado de contrato necessário bloqueia a implementação e exige uma alteração
  `shared/` separada, não um cast local nem um fallback silencioso.
