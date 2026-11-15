# Modelo de dados: Eventos e dados da NASA

## Regra de evento sazonal

Configurada em `GameConfig.events` e `src/config/events.json`.

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | Identificador único da regra |
| `kind` | tipo de evento | `dust_devil`, `dust_storm`, `global_dust_storm`, `cold` ou `darkness` |
| `cycles` | array de inteiros positivos | A regra se aplica somente aos ciclos listados |
| `season` | ID da estação | Uma entre spring, summer, autumn, winter |
| `intervalSeconds` | `[min, max]` opcional | Intervalo positivo para eventos repetidos |
| `durationSeconds` | número positivo opcional | Duração ativa; ausente significa instantâneo (com intervalo) ou válido por toda a estação (sem intervalo) |
| `effects` | efeitos do evento | Ver a tabela de efeitos abaixo |

### Efeitos (`effects`)

| Campo | Usado por | Regra |
|---|---|---|
| `damagePanels` | redemoinhos | Até N painéis elegíveis, sorteados sem repetição (`nextIndex`) |
| `clog` | redemoinhos c2–c4, tempestade densa | Um alvo por tipo listado, sorteado entre os elegíveis do tipo |
| `clogChance` | redemoinhos c2–c4 | Sorteada uma vez por ocorrência (`nextFloat`), antes dos alvos; ausente = 100% |
| `solarFactor` | tempestades, escuridão | Copiado para o evento ativo; ausente = 1 |
| `shortCircuitEverySeconds` | tempestade global | Período contado do início da estação; não é escalado no ciclo 4 |
| `shortCircuit` | tempestade global | Tipos que entram num **único** sorteio por ocorrência |
| `blocksExternalJobs` | escuridão | Copiado para o evento ativo; ausente = false |

### Agendamento (`nextEventAt`)

`nextEventAt[rule.id]` é o horário de **início** da próxima ocorrência de uma regra com
`intervalSeconds`:

- primeira da estação: início da estação + intervalo sorteado;
- seguintes: início da anterior + `durationSeconds` (0 se ausente) + intervalo sorteado;
- nunca depois do fim da estação; um horário igual ao fim da estação não é ocorrência.

Regras sem `intervalSeconds` (frio, escuridão, tempestade global) não entram em `nextEventAt`. Os
curtos da tempestade global também não: são contados pela janela de tempo do tick (ver
[research.md](./research.md)).
| `name`, `explain` | texto localizado | Inglês obrigatório; português opcional |
| `source` | fonte de dados | Rótulo, URL válida e classificação científica obrigatórios |

## Evento ativo

Armazenado em `GameState.activeEvents`.

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | Identificador único da ocorrência |
| `ruleId` | string | Referência à regra configurada |
| `kind` | tipo de evento não radioativo | Corresponde à regra |
| `endsAt` | número ou null | Tempo de jogo de término; null significa válido por toda a estação |
| `solarFactor` | número | Da regra (ausente = 1); consumidores combinam usando o menor fator ativo |
| `blocksExternalJobs` | boolean | Da regra (ausente = false); verdadeiro impede trabalhos externos |

Quais regras viram evento ativo:

| Tipo | Quando é criado | `endsAt` | Exemplo de regra |
|---|---|---|---|
| `dust_storm` | em cada ocorrência agendada | início + `durationSeconds` | `c1_local_storm`, `c2_dense_storm` |
| `global_dust_storm` | primeiro tick do verão | `null` | `c3_global_storm`, `c4_global_storm` |
| `darkness` | primeiro tick do inverno | `null` | `c2_dark_winter`, `c3_dark_winter` |
| `cold` | primeiro tick da estação | `null` | `c1_cold_autumn`, `c1_cold_winter`, … |
| `dust_devil` | nunca | — | instantâneo: só status e log |

Eventos de estação inteira são criados uma única vez (só se ainda não houver evento ativo com o
mesmo `ruleId`). O `id` do evento ativo deve ser determinístico (por exemplo `ruleId` + horário de
início), nunca aleatório.

Transições de estado:

```text
scheduled -> active -> expired               (elapsed >= endsAt)
scheduled -> active -> limpeza no limite da estação
```

Eventos válidos por toda a estação expiram no limite da estação. Status persistentes de estruturas
criados por um evento não expiram com a ocorrência ativa.

## Status da estrutura

Armazenado em `StructureInstance.status`.

Cada estrutura tem um único status. Prioridade: `short_circuit` > `damaged` > `clogged`; um evento
nunca troca um status mais grave por um mais leve.

```text
building -> active
active  -> damaged        (redemoinho; só painel solar)
active  -> clogged        (entupimento; gerador de O2, mina, refinaria)
active  -> short_circuit  (tempestade global; mina, refinaria)
clogged -> short_circuit  (o curto é mais grave e substitui o entupimento)
damaged -> active         (reparo, engine)
short_circuit -> active   (reparo, engine; o entupimento anterior não volta)
clogged -> active         (limpeza, engine)
```

Quem pode ser alvo:

| Efeito | Tipos | Elegível |
|---|---|---|
| Dano | `solar_panel` | pronto, sem `dust_filters`, `active` |
| Entupimento | tipos em `clog` | pronto, sem `dust_filters`, `active` (pendente de confirmação do PO) |
| Curto-circuito | tipos em `shortCircuit` | pronto, sem `dust_filters`, status diferente de `short_circuit` |

"Pronto" é status diferente de `building`. O derretedor de gelo aceita o filtro, mas nenhuma regra
o atinge. Instalar o filtro depois não cura um status existente. O código de eventos nunca seleciona
uma estrutura ausente; sem alvo elegível, aquele alvo se perde.

## Tempestade de radiação

Armazenada em `GameState.radiationStorm`. O horário das tempestades **não** fica em
`nextEventAt`: os testes da US1 exigem que esse mapa tenha só as regras de clima, e o
`GameState` não tem outro campo para uma tempestade que ainda não começou. O plano de cada ciclo,
`radiationPlan(seed, cycle, config)` (exportado por `events.ts`), é uma função pura, sorteada com
os helpers de `rng.ts` num fluxo próprio, iniciado pela seed misturada com o ciclo e uma
constante fixa. Não lê nem grava `state.rng`, então tempestades e poeira não deslocam os sorteios
umas das outras (testado). A tempestade começa no tick em que seu horário cai em
`(elapsed − dt, elapsed]`; antes de ciclo `fromCycle` e depois do último ciclo o plano é vazio.

- A tempestade `n` do ciclo começa na `n`-ésima fatia do tempo permitido (estações de
  `radiationStorm.seasons`); toda fatia menos a última deixa espaço para uma tempestade inteira,
  então duas tempestades nunca se sobrepõem.
- Nunca começa nos primeiros `warningSeconds` de uma estação, quando o briefing da comandante
  pausa o jogo, e começa cedo o bastante para o aviso e a fase ativa acabarem antes do fim da
  estação. A margem reaproveita `warningSeconds` (nenhum número novo no código); um valor próprio
  exigiria um campo novo na config (`content/` + `shared/`).
- Os tempos das fases contam do início planejado, nunca do tick, e a tempestade avança no máximo
  uma fase por tick: o aviso sempre aparece e o impacto sempre acontece. Por isso a fase fica em
  `radiationStorm` e não é derivada só do `elapsed`: um tick longo que passa do fim da tempestade
  ainda mostra o aviso.
- Log: uma entrada por tempestade, gravada uma vez, quando o aviso começa (nenhuma → `warning`):
  `kind` `radiation_storm`, `at` = início planejado, `ref` = `url` do evento DONKI citado (ou a
  palavra `radiation_storm` se não houver), `cause` `radiation_storm`.

| Campo | Tipo | Regras |
|---|---|---|
| `phase` | `warning` ou `active` | O aviso precede a fase ativa |
| `phaseEndsAt` | número | Tempo de jogo em que a fase atual muda |
| `basedOn` | `{ date, url }` ou null | Citação do evento DONKI arquivado |

Transições de estado:

```text
none -> warning -> active -> none
```

O aviso dura `mission.radiationStorm.warningSeconds`; a fase ativa dura
`mission.radiationStorm.durationSeconds`. A tempestade é agendada somente a partir do ciclo e da
estação configurados e no máximo pela quantidade `perCycle` configurada.

### Escolha do evento DONKI (sem repetir na partida)

A lista de eventos (`SepEvent[]`, na ordem do snapshot) é dividida em grupos por posição, e cada
tempestade sorteia só dentro do seu grupo, com o `nextIndex` da seed:

- Número de grupos: `(seasons.cycles − radiationStorm.fromCycle + 1) × radiationStorm.perCycle`
  (hoje 3). Nenhum desses números fica no código.
- Grupo da tempestade: `(ciclo − fromCycle) × perCycle + n`, em que `n` é a ordem da tempestade
  dentro do ciclo (0 quando `perCycle` é 1).
- O evento `i` da lista pertence ao grupo `i % grupos`. Os grupos não se cruzam, então duas
  tempestades da mesma partida nunca citam o mesmo evento.
- Grupo vazio (lista com menos eventos do que grupos): essa tempestade sorteia na lista inteira.
  Lista vazia: `basedOn` é `null`.
- A ordem da lista deve ser estável (a do snapshot); a mesma seed escolhe os mesmos eventos.
- Cada tempestade consome um `nextIndex`, como antes.

## Snapshot DONKI

Armazenado como JSON versionado em `src/data/snapshots/`.

Um arquivo por mês, nomeado `<AAAA-MM>.json`. Formato do arquivo:

```text
{
  range: string,
  fetchedAt: string,
  sep: SepRecord[],     // registros brutos do DONKI, como a API devolveu
  flr?: unknown[],      // opcional: omitido no snapshot atual
  cme?: unknown[]       // opcional: omitido no snapshot atual
}
```

O snapshot atual traz só `{ range, fetchedAt, sep }`. `flr` e `cme` são opcionais: quando não
existem, a chave é omitida, nunca gravada como `[]` (um array vazio pareceria "não houve
erupções"). O parser ignora essas chaves se existirem e não as exige. O jogo só lê `sep`.

Cada `SepRecord` é o registro da API. Campos que o jogo lê:

```text
{
  sepID: string,
  eventTime: string,   // ex.: "2024-05-09T13:59Z"
  link: string,        // https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/...
  ...                  // demais campos da API, preservados sem edição
}
```

A conversão para o tipo do jogo acontece em `readSepSnapshot(raw)` (`src/data/donki.ts`), só com o
formato da API:

```text
SepEvent = { date: string, url: string }     // date = eventTime, url = link
readSepSnapshot(raw: unknown): { events: SepEvent[]; problems: string[] }
```

- Registro sem `eventTime` válido (formato e `Date`) ou sem `link` `https://` é descartado e
  entra em `problems`.
- Snapshot corrompido devolve `problems` preenchido, sem lançar erro.
- Mês vazio (`sep: []`) devolve `events: []` e `problems: []`.

Um conjunto elegível vazio ou inválido retorna `null` na seleção (`pickSepEvent`), e o problema é
informado por `problems` (e por `console.warn` em `sepEvents()`); nenhuma citação pode ser
fabricada. Para o alerta nesse caso, o texto exato é combinado com o PO de UI; ele não pode
inventar uma fonte.

## Entrada do log da missão

Armazenada em `GameState.log`.

| Campo | Tipo | Finalidade |
|---|---|---|
| `at` | número | Tempo decorrido do jogo |
| `cycle`, `season` | posição da missão | Agrupamento no debrief |
| `kind` | tipo do log | Evento, status, morte, reparo, limpeza ou registro de energia |
| `ref` | string | Identificador da estrutura, astronauta ou evento |
| `cause` | string opcional | Chave estável usada para explicação em linguagem simples |

O debrief trata o log como histórico somente de acréscimo e não infere perdas históricas a partir
do estado atual.

Entradas gravadas pelos eventos de poeira (US2), uma por estrutura atingida:

| `kind` | `ref` | `cause` |
|---|---|---|
| `damaged` | id do painel | id da regra (ex.: `c1_dust_devils`) |
| `clogged` | id da estrutura | id da regra (ex.: `c2_dense_storm`) |
| `short_circuit` | id da estrutura | id da regra (ex.: `c3_global_storm`) |

Usar o id da regra em `cause` deixa o debrief (US4) buscar `name`, `explain` e `source` direto na
configuração, sem tabela de textos paralela.

## Fonte científica

Configurada por `DataSource`:

```text
{
  label: string,
  url: valid URL,
  kind: real | scaled | simplification | game_value
}
```

A tela de fontes deve exibir a classificação em inglês adequado para crianças e distinguir dados
DONKI arquivados de dados ao vivo.
