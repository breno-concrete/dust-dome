# Implementation Plan: Events and NASA Data

**Branch**: `data/002-events-data` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-events-data/spec.md`

## Summary

Implement the seeded Mars climate event loop, archived NASA DONKI event selection, and the
mission debrief and sources experience. The event engine will remain a pure state transition
called by `tick()` after time advancement, use only `state.rng` for scheduling and targets, and
apply configured effects to the existing `GameState` fields. The data layer will read committed
DONKI snapshots offline, while debrief and source presentation will consume the existing store
contract and configuration metadata.

## Technical Context

**Language/Version**: TypeScript, repository TypeScript 7.0.2

**Primary Dependencies**: Vitest for engine/data tests, React and Testing Library for screens,
Zod for the existing configuration schema, and Zustand for the game store. No new dependencies.

**Storage**: Static JSON configuration in `src/config/*.json` and committed DONKI snapshots in
`src/data/snapshots/`; no runtime database or network access.

**Testing**: Focused Vitest unit tests for `src/engine/events/events.test.ts` and
`src/data/donki.test.ts`; jsdom Testing Library tests for the end and sources screens; final
validation with `npm run check`.

**Target Platform**: Desktop and mobile browsers, with offline-capable committed data.

**Project Type**: Vite React web application with a pure simulation engine.

**Performance Goals**: Event updates remain bounded by configured rules, active events, and base
structures for each one-second game tick; no event processing may require network or file I/O.

**Constraints**: Preserve the existing `GameState` contract, seeded determinism, pure engine
functions, ownership boundaries, English player-facing text, and the existing JSON configuration
model. All balance values remain in `src/config/*.json`.

**Scale/Scope**: Four cycles, four seasons per cycle, a 12x12 base, the configured structures
and crew, one radiation storm per eligible cycle, and the four user stories in the feature spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Ownership**: PASS. Implementation paths are limited to `src/engine/events/`, `src/data/`,
  `scripts/`, `src/features/sources/`, and `src/features/end/`. Documentation remains inside
  `specs/002-events-data/`.
- **Pure engine**: PASS. `updateEvents` receives state, config, and elapsed time; it will not
  fetch, read files, use timers, or call `Math.random`.
- **Seeded mission**: PASS. Scheduling and target selection consume the existing RNG helpers and
  write the returned RNG state.
- **Real science**: PASS. DONKI data is an offline snapshot, and each event/source retains its
  source kind and URL.
- **Test-first**: PASS. Existing `it.todo` cases are the agreed test plan and will be implemented
  story by story before production code.
- **Contracts**: PASS with no contract edit planned. Existing `GameState`, `ActiveEvent`, and
  `RadiationStorm` fields cover the feature; any missing field must become a separate `shared/`
  contract change.
- **No dependencies/config changes**: PASS. The plan adds no packages and does not alter project
  configuration.
- **PR scope**: PASS. Each user story is intended to be a separate small PR.

## Project Structure

### Documentation (this feature)

```text
specs/002-events-data/
├── brief.md
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── debrief-sources.md
│   ├── donki.md
│   └── events-engine.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Created by /speckit-tasks
```

### Source Code

```text
src/
├── engine/
│   └── events/
│       ├── events.ts
│       └── events.test.ts
├── data/
│   ├── donki.ts
│   ├── donki.test.ts
│   └── snapshots/
│       ├── README.md
│       └── <YYYY-MM>.json
├── features/
│   ├── end/
│   │   ├── EndScreen.tsx
│   │   └── EndScreen.test.tsx
│   └── sources/
│       ├── SourcesScreen.tsx
│       └── SourcesScreen.test.tsx
└── config/
    └── *.json              # Existing PO-owned balance and source metadata

scripts/
└── fetch-donki.ts
```

**Structure Decision**: Keep the existing single Vite React project. The pure event engine and
DONKI parser remain separate from React screens; screens use store-provided game state and
feature-local presentation helpers. No new top-level source areas are introduced.

## Complexity Tracking

No constitution violations require justification.
