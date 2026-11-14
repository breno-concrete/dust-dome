# Brief — 002 Eventos e dados da NASA

**Responsável:** DEV A · **Prefixo da branch:** `data/` · **Pasta da spec:** `specs/002-events-data/`
**Regras do jogo:** constituição II.11, II.12 (debrief), II.13

## Objetivo

Fazer Marte reagir com ciência real: redemoinhos de poeira, tempestades de poeira, entupimentos,
curtos-circuitos, escuridão do inverno e tempestades de radiação solar baseadas em eventos reais
da NASA DONKI. Depois, explicar a missão no debrief e mostrar cada fonte de forma honesta.

## Caminhos sob responsabilidade

`src/engine/events/`, `src/data/`, `scripts/`, `src/features/sources/`, `src/features/end/`.

## Consome

- `events.json` e `mission.json` (`radiationStorm`) dos POs.
- `GameState` (`types.ts`): escreve em `activeEvents`, `nextEventAt`, `radiationStorm`, `status`
  das estruturas e `log`. Precisa de um campo novo? Envie uma solicitação de mudança de contrato
  ao Breno.
- `state.rng` com os helpers de `src/engine/rng.ts` (nunca `Math.random`).

## Fornece (contrato)

- `updateEvents(state, config, dt)` em `src/engine/events/events.ts`, chamado por `tick()`.
- `sepEvents()` / `pickSepEvent()` em `src/data/donki.ts`.

## User stories (uma PR por story, testes primeiro)

| # | Story | Alvo | Testes a fazer passar |
|---|---|---|---|
| US1 | Agendamento com seed dos eventos de cada estação; eventos terminam com a estação | 12:00 | `events.test.ts` › scheduling |
| US2 | Efeitos da poeira: dano, entupimento, tempestades, curtos-circuitos da tempestade global, escuridão | 14:00 | `events.test.ts` › dust events |
| US3 | Tempestade de radiação com aviso, fase ativa e evento DONKI real | 16:00 | `events.test.ts` › radiation storm, `donki.test.ts` |
| US4 | Debrief a partir das causas do log e tela de fontes | 19:00 | novos testes em `src/features/end/`, `src/features/sources/` |

## Fora do escopo

Tempo, produção, energia, mortes da tripulação (Breno); HUD e interface de alertas (DEV B);
efeitos da cena (DEV C).

## Considerado concluído quando

Cada estação de cada ciclo dispara seus eventos deterministicamente a partir da seed, a tempestade
de radiação cita um evento DONKI real e o debrief explica cada perda em palavras simples.

## Início

```
/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/002-events-data Read specs/002-events-data/brief.md and the constitution Part II, and specify it.
```
