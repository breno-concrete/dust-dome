# Quickstart: validating the engine core

How to prove each user story works. Rules: [spec.md](spec.md); API: [contracts/engine-api.md](contracts/engine-api.md);
model: [data-model.md](data-model.md).

## Prerequisites

```bash
node -v                      # >= 22.18
npm ci
git switch -c engine/us<N>-<short-name>   # from an up-to-date main
```

## Loop for every story (constitution VIII)

```bash
npx vitest run src/engine/<module>.test.ts   # red: the new tests fail for the right reason
# implement the minimum
npx vitest run src/engine/<module>.test.ts   # green
npm run check                                # format, lint, typecheck, all tests, build
```

Commit `test(usN): … (red)`, then `feat(usN): …`, open the PR, merge on green CI.

## Validation per story

| Story | Run | Passes when |
|---|---|---|
| US1 — seasons | `npx vitest run src/engine/time.test.ts src/engine/game.test.ts` | Every `it.todo` in `time.test.ts` is a passing test: rollover with remainder, winter → next cycle, briefing at every season, stop after the last winter. |
| US2 — economy | `npx vitest run src/engine/economy.test.ts` | One full season adds each structure's per-season amount (within 1 %) at Base and Max; Off and shed types do nothing; converters never push a stock below 0; the crew consumes its needs. |
| US3 — power | `npx vitest run src/engine/power.test.ts` | Solar by season and events, darkness, reactor constant, heating tables, batteries charge and drain within capacity, brownout in order without flicker, habitats never shed, unheated flag. |
| US4 — actions and jobs | `npx vitest run src/engine/actions.test.ts src/engine/jobs.test.ts src/engine/placement.test.ts` | Every refusal reason, including `not_connected`; jobs take free astronauts, pause during blocks, finish and apply their effect. |
| US5 — crew and outcome | `npx vitest run src/engine/crew.test.ts src/engine/outcome.test.ts src/engine/game.test.ts` | Exposure, the three death countdowns, extreme cold, radiation storm, recall and shelter, protecting habitats, win, `crew_lost`, `targets_missed`, fixed tick order. |

## End-to-end checks (after US5)

1. **Full mission (SC-001)**: `game.test.ts` has a scripted test that plays 4 cycles at
   `dt = 0.25` and reaches a win with a prepared base, and a loss with the starting base. Both
   must pass.
2. **Determinism (SC-002)**: the same script run twice with the same seed gives deep-equal states.
3. **Speed (SC-006)**: the full-mission test finishes in under 2 s locally
   (`npx vitest run src/engine/game.test.ts` prints the duration).
4. **In the browser**: `npm run dev`, open http://localhost:5173, start a mission, close the
   briefing, set 4×. Seasons change with a briefing each, the HUD power value moves, reserves rise
   and fall, and the game reaches the end screen after the last winter or when the crew dies.

## Contract v2 check (before US4)

```bash
git switch -c shared/contract-v2
# apply contracts/contract-v2.md
npx vitest run src/config/config.test.ts src/engine/actions.test.ts
npm run check
```

Passes when the new design rule is green, the new todos are listed, the stubs return
`not_implemented`, and the other areas' tests still pass.
