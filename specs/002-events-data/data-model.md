# Modelo de dados: Eventos e dados da NASA

## Regra de evento sazonal

Configurada em `GameConfig.events` e `src/config/events.json`.

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | Identificador único da regra |
| `kind` | tipo de evento | `dust_devil`, `dust_storm`, `global_dust_storm`, `cold` ou `darkness` |
| `cycles` | array de inteiros positivos | A regra se aplica somente aos ciclos listados |
| `season` | ID da estação | Uma de spring, summer, autumn, winter |
| `intervalSeconds` | `[min, max]` opcional | Intervalo positivo para eventos repetidos |
| `durationSeconds` | número positivo opcional | Duração ativa; ausente significa instantâneo ou válido pela estação |
| `effects` | efeitos do evento | Dano, fator solar, entupimento, curto-circuito e bloqueio de trabalhos |
| `name`, `explain` | texto localizado | Inglês obrigatório; português opcional |
| `source` | fonte de dados | Rótulo, URL válida e classificação científica obrigatórios |

## Evento ativo

Armazenado em `GameState.activeEvents`.

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | ID único da ocorrência |
| `ruleId` | string | Referência à regra configurada |
| `kind` | tipo de evento não radiativo | Deve corresponder à regra |
| `endsAt` | número ou null | Tempo de jogo final; null significa válido pela estação |
| `solarFactor` | número | Consumidores combinam usando o menor fator ativo |
| `blocksExternalJobs` | boolean | Verdadeiro quando o evento ativo impede trabalhos externos |

Transições de estado:

```text
scheduled -> active -> expired
scheduled -> active -> season boundary cleanup
```

Eventos válidos pela estação expiram na mudança de estação. Status persistentes de estruturas
criados por um evento não expiram junto com a ocorrência ativa.

## Status da estrutura

Armazenado em `StructureInstance.status`.

```text
building -> active
active -> damaged       (dust devil)
active -> clogged       (dust/clog effect)
active -> short_circuit (global dust storm)
damaged/clogged/short_circuit -> active
```

Reparos limpam `damaged` e `short_circuit`; limpeza remove `clogged`. O código de eventos não deve
substituir silenciosamente um status existente por um status inválido nem atingir uma estrutura
ausente.

## Tempestade de radiação

Armazenada em `GameState.radiationStorm` e agendada pelo mapa `nextEventAt` existente.

| Campo | Tipo | Regras |
|---|---|---|
| `phase` | `warning` ou `active` | O aviso precede a fase ativa |
| `phaseEndsAt` | número | Tempo de jogo em que a fase muda |
| `basedOn` | `{ date, url }` ou null | Citação do evento DONKI arquivado |

Transições de estado:

```text
none -> warning -> active -> none
```

O aviso dura `mission.radiationStorm.warningSeconds`; a fase ativa dura
`mission.radiationStorm.durationSeconds`. A tempestade só é agendada nos ciclos e estações
configurados e no máximo até a quantidade `perCycle` configurada.

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

Um conjunto elegível vazio ou inválido retorna `null` da seleção e deve ser informado
explicitamente pelo chamador; nenhuma citação pode ser fabricada.

## Entrada do log da missão

Armazenada em `GameState.log`.

| Campo | Tipo | Finalidade |
|---|---|---|
| `at` | número | Tempo decorrido do jogo |
| `cycle`, `season` | posição da missão | Agrupamento no debrief |
| `kind` | tipo do log | Evento, status, morte, reparo, limpeza ou energia |
| `ref` | string | Identificador de estrutura, astronauta ou evento |
| `cause` | string opcional | Chave estável usada para explicação em linguagem simples |

O debrief trata o log como histórico somente de acréscimos e não infere perdas históricas a partir
do estado atual.

## Fonte científica

Configurada por `DataSource`:

```text
{
  label: string,
  url: valid URL,
  kind: real | scaled | simplification | game_value
}
```

A tela de fontes deve mostrar a classificação em inglês adequado para crianças e distinguir dados
DONKI arquivados de dados ao vivo.
