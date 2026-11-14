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

Armazenada em `GameState.radiationStorm` e agendada pelo mapa `nextEventAt` existente.

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

## Snapshot DONKI

Armazenado como JSON versionado em `src/data/snapshots/`.

Formato externo esperado:

```text
{
  range: string,
  fetchedAt: string,
  flr: unknown[],
  sep: SepEvent[],
  cme: unknown[]
}
```

O jogo usa somente registros SEP com:

```text
{
  date: string,
  url: string
}
```

Um conjunto elegível vazio ou inválido retorna `null` na seleção e deve ser informado
explicitamente pelo chamador; nenhuma citação pode ser fabricada.

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
