# Brief — 002 Events and NASA data

**Owner:** Dev A · **Branch prefix:** `data/` · **Spec folder:** `specs/002-events-data/`
**Rules of the game:** constitution II.11, II.12 (debrief), II.13

## Goal

Make Mars fight back with real science: dust devils, dust storms, clogging, short-circuits,
winter darkness and solar radiation storms based on real NASA DONKI events. Then explain the
mission in the debrief and show every source honestly.

## Owned paths

`src/engine/events/`, `src/data/`, `scripts/`, `src/features/sources/`, `src/features/end/`.

## Consumes

- `events.json` and `mission.json` (radiationStorm) from the POs.
- `GameState` (`types.ts`): writes `activeEvents`, `nextEventAt`, `radiationStorm`, structure
  `status`, `log`. Needs a new field? Send a contract change request to Breno.
- `state.rng` with the helpers in `src/engine/rng.ts` (never `Math.random`).

## Provides (contract)

- `updateEvents(state, config, dt)` in `src/engine/events/events.ts`, called by `tick()`.
- `sepEvents()` / `pickSepEvent()` in `src/data/donki.ts`.

## User stories (one PR each, tests first)

| # | Story | Target | Tests to turn green |
|---|---|---|---|
| US1 | Seeded scheduling of each season's events; events end with the season | 12:00 | `events.test.ts` › scheduling |
| US2 | Dust effects: damage, clogging, storms, global storm short-circuits, darkness | 14:00 | `events.test.ts` › dust events |
| US3 | Radiation storm with warning, active phase and the real DONKI event | 16:00 | `events.test.ts` › radiation storm, `donki.test.ts` |
| US4 | Debrief from the log causes, and the sources screen | 19:00 | new tests in `src/features/end/`, `src/features/sources/` |

## Out of scope

Time, production, power, crew deaths (Breno); HUD and alerts UI (Dev B); scene effects (Dev C).

## Done when

Every season of every cycle fires its events deterministically from the seed, the radiation
storm cites a real DONKI event, and the debrief explains every loss in plain words.

## Start

```
/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/002-events-data Read specs/002-events-data/brief.md and the constitution Part II, and specify it.
```
