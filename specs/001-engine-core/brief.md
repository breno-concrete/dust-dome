# Brief — 001 Engine core

**Owner:** Breno (tech lead) · **Branch prefix:** `engine/` · **Spec folder:** `specs/001-engine-core/`
**Rules of the game:** constitution Part II (II.2–II.10)

## Goal

Make the base simulation real: seasons pass, structures produce and consume, power balances,
astronauts work outside and can die, and the mission is won or lost.

## Owned paths

`src/engine/` (except `src/engine/events/`), `src/app/`, `src/config/schema.ts`,
`src/config/loadConfig.ts`, `src/config/config.test.ts`. Plus repo, CI and contract (`shared/`).

## Consumes

- Config from the POs (`src/config/*.json`), validated by `schema.ts`.
- `updateEvents()` from Dev A, called inside `tick()` right after `advanceTime()`.

## Provides (contract)

- `createGame`, `tick`, `winTargets` (`game.ts`); player actions (`actions.ts`); `placementError`
  (`placement.ts`); `GameState` and friends (`types.ts`); `useGameStore` (`app/store.ts`).

## User stories (one PR each, tests first)

| # | Story | Target | Tests to turn green |
|---|---|---|---|
| US1 | Seasons and cycles roll over; a briefing opens at each season | 11:30 | `time.test.ts` |
| US2 | Structures produce and consume per season; crew eats, drinks, breathes | 13:00 | `economy.test.ts` |
| US3 | Power balance, heating tables, batteries, brownout | 15:00 | `power.test.ts` |
| US4 | Build, upgrade, power switches, repair, clean; external jobs | 17:00 | `actions.test.ts`, `jobs.test.ts` |
| US5 | Exposure, deaths, shelter, win and lose | 19:00 | `crew.test.ts`, `outcome.test.ts`, `game.test.ts` |

Ongoing: review contract change requests, keep `main` green, run the 13:00 and 19:00 checkpoints.

## Out of scope

Event scheduling and effects (Dev A), any UI, any 3D, any network access.

## Done when

Every `it.todo` in the files above is a passing test and a full mission can be won or lost.

## Start

```
/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/001-engine-core Read specs/001-engine-core/brief.md and the constitution Part II, and specify it.
```
