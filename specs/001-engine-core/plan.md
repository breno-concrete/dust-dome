# Implementation Plan: Engine Core — the Living Base Simulation

**Branch**: `engine/spec` (spec PR), then `engine/us1-…` to `engine/us5-…` (one PR per user story) and
one `shared/contract-v2` PR | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-engine-core/spec.md`

## Summary

Make the base simulation real: the season clock, production and consumption, power with heating,
batteries and brownout, the player actions with external jobs, crew exposure and deaths, and the
win/lose check (constitution II.2–II.10). Everything is pure TypeScript in `src/engine/`, driven
by the existing `tick(state, config, dt)` pipeline (time → events → power → production → jobs →
crew → outcome). The existing `it.todo` lists are the test plan; each user story turns its todos
into passing tests (red → green → refactor) and ships as one PR.

Three decisions from the spec add to the contract and are bundled into one `shared/contract-v2`
PR that lands before US4: the habitat connection rule (`connectsTo` in the config, new
`not_connected` refusal), the two recall actions (`bringInside`, `bringAllInside`, replacing the
unused `shelterAll`) and the astronaut `resting` flag. The same PR amends the constitution
(Principle V, II.2, II.9). Details in [research.md](research.md) and
[contracts/contract-v2.md](contracts/contract-v2.md).

## Technical Context

**Language/Version**: TypeScript ~7.0 (target ES2023, `verbatimModuleSyntax`, `erasableSyntaxOnly`)

**Primary Dependencies**: none inside `src/engine/` (pure TS). Around it, already installed: zod 4
(config validation in `schema.ts`), zustand 5 (store in `src/app/store.ts`). No new dependencies.

**Storage**: N/A — in-memory `GameState`; no saving or loading in v1.

**Testing**: Vitest 5, node environment, pure functions with hand-made states built from
`createGame(config, seed)`; numbers always read from `config`, never hard-coded.

**Target Platform**: desktop and mobile browsers (Vite 8 build); school laptops with integrated GPU.

**Project Type**: single-page web game; this feature is the simulation library (`src/engine/`) plus
its store glue (`src/app/`).

**Performance Goals**: a whole mission (4,800 game seconds ≈ 19,200 steps of 0.25 s) simulated in
under 2 s (SC-006); one step well under 1 ms.

**Constraints**: engine is pure (no React, fetch, timers, `Math.random`, I/O); immutable updates;
deterministic; the engine core never draws from `state.rng` (only Dev A's events do); every
balance value from `src/config/*.json`; components never import the engine; only contract files
are shared.

**Scale/Scope**: 12 × 12 grid (≤ 144 structures), 4 astronauts, a short job queue, 4 cycles ×
4 seasons, 11 structure types, 3 upgrades.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Real trade-offs, numbers in config | Every amount, duration, factor, table and order comes from `config` (FR-038). The only constant in code is a floating-point tolerance, not a balance value. | PASS |
| II. Real science, honestly labeled | The engine does no I/O and shows no text; sources stay with Dev A and the POs. | PASS |
| III. Kids 7–12 | Safety defaults: no new job at or above the exposure warning; recall actions; every refusal has a reason the UI can explain. | PASS |
| IV. Ownership through contracts | Work stays in `src/engine/` (not `events/`) and `src/app/`. Contract additions go in one `shared/contract-v2` PR touching only contract files plus the amendment and one PO-approved JSON line. Selectors keep returning primitives. | PASS |
| V. Isometric base builder | **Violation**: "adjacency has no effect". The tech lead decided on 2026-11-14 that a new habitat module must share a side with an existing one. Amended in `shared/contract-v2` before US4. See Complexity Tracking. | JUSTIFIED |
| VI. Real time, player controls time | The engine has no clock; it receives game seconds; the briefing pauses `tick`; same seed + same actions = same mission. | PASS |
| VII. Failure teaches | Every death has a logged cause; the exposure warning level, the grace period and the commander's hint come before lethal outcomes. | PASS |
| VIII. Test-first | Each story starts by turning its `it.todo` into failing tests; new behaviors (connection, recall, protecting habitats) get new todos in the contract PR. | PASS |
| Part II canon | Three readings need PO approval: batteries count in the win power target (II.2), the crew moves to protecting habitats (II.2), recall actions and resting (II.9). | PENDING PO, in the amendment PR |

**Post-design re-check (after Phase 1)**: unchanged. The design adds no dependency, no I/O and no
hard-coded balance value; the only new contract surface is listed in
[contracts/contract-v2.md](contracts/contract-v2.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-engine-core/
├── brief.md             # Given (tech lead)
├── spec.md              # /speckit-specify
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R20
├── data-model.md        # Phase 1: entities, rules, state transitions
├── quickstart.md        # Phase 1: how to validate each story
├── contracts/
│   ├── engine-api.md    # What the engine and the store expose, with semantics
│   └── contract-v2.md   # Exact delta of the shared/contract-v2 PR
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

Existing files only; one new test helper.

```text
src/engine/
├── time.ts          time.test.ts        # US1: rollover, briefing, season_start log, end clamp
├── game.ts          game.test.ts        # US1/US3/US5: tick order, end guard, initial power report
├── economy.ts       economy.test.ts     # US2: production, converters, crew consumption
├── power.ts         power.test.ts       # US3: production, demand, heating, batteries, brownout
├── placement.ts     placement.test.ts   # US4: + connection rule (not_connected)
├── actions.ts       actions.test.ts     # US4/US5: build, upgrade, switch, repair, clean, recall
├── jobs.ts          jobs.test.ts        # US4: queue, assignment, pause/resume, effects
├── crew.ts          crew.test.ts        # US5: exposure, death countdowns, protection checks
├── outcome.ts       outcome.test.ts     # US5: win / lose
├── testState.ts                         # NEW: tiny builders for hand-made test states (tests only)
├── types.ts                             # contract (changed only in shared/contract-v2)
└── events/                              # Dev A — not touched
src/app/
├── store.ts                             # contract (new actions only in shared/contract-v2)
└── selectors.ts                         # unchanged (placement preview picks up not_connected)
src/config/
├── schema.ts        config.test.ts      # contract-v2: connectsTo + design rule
└── structures.json                      # contract-v2: habitat "connectsTo": ["habitat"] (PO approval)
```

**Structure Decision**: single project, existing layout. Each user story edits only the engine
files in its row, plus their tests. `src/app/` changes need a CODEOWNERS review from
jvsauma or pedrolmelo; `types.ts` and `schema.ts` need caio-nascime; `structures.json` needs
athyelbrito.

### Delivery order

1. `engine/spec` — spec, plan, tasks (this PR).
2. `shared/contract-v2` — contract delta + constitution amendment + todos for the new behaviors.
   Announce in the group before opening; merge fast; everyone rebases.
3. `engine/us1-seasons` → `engine/us2-economy` → `engine/us3-power` → `engine/us4-actions-jobs` →
   `engine/us5-crew-outcome`, each red → green → refactor → `npm run check`.

US1–US3 do not depend on contract-v2 and can start right after the spec PR.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle V: habitats must connect (adjacency now matters for habitat modules) | Tech lead decision (2026-11-14): the habitats form one pressurized base, which is also what lets the crew walk to the protecting habitat (FR-031). | "Adjacency has no effect" makes the crew moving between habitats hard to explain to kids. Connecting every structure (option c) costs more placement work for no gameplay gain. |
| Part II readings (II.2 battery counts at the end; II.2 crew uses protecting habitats; II.9 recall one/all + resting) | Decided by the tech lead in the spec; they close gaps the canon leaves open. | Leaving them open blocks testable acceptance scenarios. Changing the canon text without PO approval breaks governance (Part V), so they go in the same amendment PR for athyelbrito to approve. |
