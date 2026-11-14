---

description: "Task list for 004 Isometric Base Scene and Repair QTE"
---

# Tasks: Isometric Base Scene & Repair QTE

**Input**: Design documents from `specs/004-base-scene/`
**Prerequisites**: [plan.md](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/004-base-scene/plan.md), [spec.md](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/004-base-scene/spec.md), [research.md](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/004-base-scene/research.md), [data-model.md](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/004-base-scene/data-model.md), [scene-contract.md](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/004-base-scene/contracts/scene-contract.md)

**Tests**: Required by Constitution Principle VIII (test-first: convert existing `it.todo` items and add pure-function tests before implementation; show failing run, then implement, then green).

**Organization**: Tasks are grouped by user story (`[US1]`–`[US4]`) so each story maps to one small PR (~300 lines or fewer) and is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (`US1`, `US2`, `US3`, `US4`)
- Exact file paths are included in every task description.

## Ownership Constraints (Constitution Part III & IV)

- Only edit files in `src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/`, and the `Scene` section of `CREDITS.md`.
- Never import `src/engine/` (except `type` imports from `src/engine/types.ts`) or `src/data/`.
- Store actions permitted: `hoverAt`, `placeAt`, `selectStructure`, `finishQte` only.
- Do not add npm dependencies or modify `src/config/*.json`.

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Verify existing scaffolding, owned directories, and baseline test suite before starting US1.

- [ ] T001 Verify baseline tests and tooling run cleanly with `npx vitest run src/features/scene/ src/features/repair/`
- [ ] T002 [P] Ensure asset directories exist at `public/models/` and `public/audio/` with `.gitkeep` or initial CC0 assets

---

## Phase 2: Foundational (Contract & Pure Helpers Boundary)

**Purpose**: Confirm read-only store selectors and type boundaries are respected before story implementation.

**⚠️ CRITICAL**: No user story work should introduce forbidden imports or non-primitive selectors.

- [ ] T003 Audit existing selectors and imports in `src/features/scene/Scene.tsx` and `src/features/repair/RepairQte.tsx` against `specs/004-base-scene/contracts/scene-contract.md`

**Checkpoint**: Baseline verified and ownership/contract boundaries confirmed.

---

## Phase 3: User Story 1 - Isometric Base Grid, Structure Models, Camera & Selection (Priority: P1) 🎯 MVP

**Goal**: Render the 12×12 Martian outpost in isometric 2.5D with distinct low-poly 3D models for all 11 structure types (`1×1` and `2×2`), 90° stepped camera rotation with bounded zoom, accurate tile picking/hover preview, and click-to-place / click-to-select.

**Independent Test**: Run `npx vitest run src/features/scene/iso.test.ts` and verify in browser that rotating through all four 90° angles preserves tile picking, placement previews match 1×1 and 2×2 footprints, and clicking structures selects them.

### Tests for User Story 1 (Test-First — Constitution VIII) ⚠️

> **NOTE: Convert `it.todo` and write failing tests FIRST, verify they fail (red), then implement.**

- [ ] T004 [US1] Implement failing test for `rotating the camera in 90° steps keeps tile picking correct` and camera rotation step helpers (`0 | 1 | 2 | 3` wrapping, camera orbit position) in `src/features/scene/iso.test.ts`

### Implementation for User Story 1

- [ ] T005 [US1] Add pure 90° camera rotation step helpers (`RotationStep` `0 | 1 | 2 | 3`, `rotateStep`, `cameraPositionForStep`) in `src/features/scene/iso.ts`
- [ ] T006 [P] [US1] Create `src/features/scene/StructureModel.tsx` mapping all 11 structure IDs (`habitat`, `solar_panel`, `battery`, `mine`, `oxygen_generator`, `ice_melter`, `iron_refinery`, `greenhouse`, `repair_workshop`, `steel_factory`, `nuclear_reactor`) to distinct low-poly 3D models sized to `1×1` or `2×2` footprints (supporting optional `.glb` in `public/models/` with lightweight procedural geometry)
- [ ] T007 [US1] Update `src/features/scene/Scene.tsx` to integrate 90° camera rotation controls (buttons/keys), bounded orthographic zoom (`minZoom`/`maxZoom`), `StructureModel` rendering, accurate pointer-leave (`hoverAt(null)`), valid/invalid placement preview, and structure selection highlight
- [ ] T008 [P] [US1] Document any third-party low-poly `.glb` models added to `public/models/` (with license and no NASA logos/insignia) in `CREDITS.md` (Scene section)
- [ ] T009 [US1] Run `npx vitest run src/features/scene/iso.test.ts` and `npm run check` to verify US1 passes all checks

**Checkpoint**: User Story 1 is independently playable and ready for its PR (`scene/us1-models-camera`).

---

## Phase 4: User Story 2 - Visual Structure States, Weather & Lighting (Priority: P2)

**Goal**: Make every structure and environmental condition readable from the scene alone: seasonal lighting, cycle-2+ winter darkness, storm dust haze, damaged/clogged/short-circuited structure cues (with non-color indicators), frosted unheated habitats, and radiation alarm warning tint.

**Independent Test**: Run `npx vitest run src/features/scene/visualState.test.ts` with all `it.todo` items turned green and verify non-color visual cues render in `Scene.tsx` / `StructureModel.tsx`.

### Tests for User Story 2 (Test-First — Constitution VIII) ⚠️

> **NOTE: Write failing tests FIRST for the existing `it.todo` items and structure visual cues, verify red, then implement.**

- [ ] T010 [US2] Convert `it.todo` tests (`an unheated base shows frost on the habitats`, `the radiation alarm tints the scene during the warning phase`) and add tests for per-structure visual state & non-color cue mapping (`building`, `active`, `damaged`, `clogged`, `short_circuit`, `frost`) in `src/features/scene/visualState.test.ts`

### Implementation for User Story 2

- [ ] T011 [US2] Extend `VisualState` (`frost: boolean` from `game.power.unheated`, `radiationTint: boolean` from `game.radiationStorm?.phase === 'warning'`) and add pure `structureVisualState(structure, visual)` returning `status`, `color`, and `nonColorCue` (`'none' | 'construction' | 'damage' | 'dust' | 'sparks' | 'frost'`) in `src/features/scene/visualState.ts`
- [ ] T012 [US2] Render non-color visual cues (construction scaffolding/outline, damage smoke/tilt, dust overlay, short-circuit sparks, and habitat frost geometry/material) in `src/features/scene/StructureModel.tsx`
- [ ] T013 [US2] Render scene-level dust haze (fog/particles), winter darkness lighting, and radiation storm warning tint driven by `visualState(game, config)` in `src/features/scene/Scene.tsx`
- [ ] T014 [US2] Run `npx vitest run src/features/scene/visualState.test.ts` and `npm run check` to verify US2 passes all checks

**Checkpoint**: User Story 2 is independently testable and ready for its PR (`scene/us2-visual-states`).

---

## Phase 5: User Story 3 - Repair Quick-Time Event (QTE) Minigame (Priority: P3)

**Goal**: Deliver the bolt-tightening QTE minigame where 5 bolts (`config.mission.repair.qteBolts`) appear one by one at randomized positions on the repair target within 6 seconds (`config.mission.repair.qteSeconds`), completing with `finishQte(true)` when all bolts are clicked or `finishQte(false)` when time expires or the player gives up.

**Independent Test**: Run `npx vitest run src/features/repair/RepairQte.test.tsx` with fake timers and verify one-bolt-at-a-time display, random repositioning, timer countdown, success, and timeout failure.

### Tests for User Story 3 (Test-First — Constitution VIII) ⚠️

> **NOTE: Convert `it.todo` tests FIRST using `vi.useFakeTimers()`, verify they fail, then implement.**

- [ ] T015 [US3] Convert `it.todo` tests (`fails when qteSeconds run out before every bolt is clicked`, `shows one bolt at a time at a random spot on the structure`) and verify countdown/EN+PT accessible labels in `src/features/repair/RepairQte.test.tsx`

### Implementation for User Story 3

- [ ] T016 [P] [US3] Update `src/features/repair/RepairQte.module.css` to define the repair target canvas, countdown progress bar, and absolute-positioned animated bolt button styling
- [ ] T017 [US3] Implement one-bolt-at-a-time randomized positioning (`15%..85%` bounds), countdown timer driven by `config.mission.repair.qteSeconds`, automatic `finishQte(false)` on expiry, bolt counter (`1..qteBolts`), and EN/PT text via `useT` in `src/features/repair/RepairQte.tsx`
- [ ] T018 [US3] Run `npx vitest run src/features/repair/RepairQte.test.tsx` and `npm run check` to verify US3 passes all checks

**Checkpoint**: User Story 3 is independently testable and ready for its PR (`scene/us3-repair-qte`).

---

## Phase 6: User Story 4 - Audio Feedback, Decorative Astronaut Markers & Performance Polish (Priority: P4)

**Goal**: Add sound effects for placement, repair bolts, and alarms (gracefully handling browser autoplay restrictions), decorative astronaut markers moving along straight lines when outside, and a WebGL failure fallback + performance pass under the 5 MB asset budget.

**Independent Test**: Run new pure-function tests for astronaut waypoint/interpolation logic and sound trigger safety, confirm total `public/models/` + `public/audio/` size < 5 MB, and verify WebGL fallback renders cleanly without crashing the app.

### Tests for User Story 4 (Test-First — Constitution VIII) ⚠️

- [ ] T019 [P] [US4] Write unit tests for pure astronaut straight-line marker interpolation (`astronautWaypoints` / `astronautPositionAt` from `game.crew` and `game.structures`) in `src/features/scene/astronautMarkers.test.ts`
- [ ] T020 [P] [US4] Write unit tests for safe audio playback wrapper (no-throw when `AudioContext` / `HTMLAudioElement` is unavailable or blocked) in `src/features/scene/sound.test.ts`

### Implementation for User Story 4

- [ ] T021 [P] [US4] Implement pure waypoint & linear interpolation helper + thin `AstronautMarkers` R3F component (straight lines only, no physics or pathfinding, non-click-blocking) in `src/features/scene/AstronautMarkers.tsx`
- [ ] T022 [P] [US4] Implement lightweight audio feedback helper (synthesized Web Audio tones or CC0 clips in `public/audio/` with mute support and safe autoplay handling) in `src/features/scene/sound.ts`
- [ ] T023 [US4] Integrate `AstronautMarkers`, sound cues (structure placement, structure selection, radiation alarm), and a WebGL ErrorBoundary/capability fallback in `src/features/scene/Scene.tsx`
- [ ] T024 [US4] Connect repair bolt click, success, and failure sound cues in `src/features/repair/RepairQte.tsx`
- [ ] T025 [P] [US4] Document any third-party audio files added to `public/audio/` in `CREDITS.md` (Scene section)
- [ ] T026 [US4] Run `npx vitest run src/features/scene/ src/features/repair/` and `npm run check`

**Checkpoint**: All 4 user stories are complete, tested, and ready for integration.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all owned files, asset budget, and quickstart validation.

- [ ] T027 [P] Verify combined size of `public/models/` and `public/audio/` is under 5 MB (`du -sh public/models/ public/audio/`)
- [ ] T028 [P] Review `src/features/scene/` and `src/features/repair/` for draw-call efficiency (memoized geometries/materials, minimal per-frame allocations) for integrated-GPU laptops
- [ ] T029 Run full `specs/004-base-scene/quickstart.md` validation and `npm run check`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; confirms contract compliance before story work.
- **User Stories (Phases 3–6)**:
  - **US1 (P1)**: Starts after Phase 2 — establishes grid math, camera rotation, models, and `Scene.tsx` structure.
  - **US2 (P2)**: Builds on `visualState.ts`, `StructureModel.tsx`, and `Scene.tsx` from US1 (pure `visualState.ts` tests/code can start in parallel with US1 UI work).
  - **US3 (P3)**: Independent of US1/US2 — touches only `src/features/repair/` (`RepairQte.tsx`, `RepairQte.module.css`, `RepairQte.test.tsx`). Can run in parallel with US1 or US2.
  - **US4 (P4)**: Pure helpers (`astronautMarkers.test.ts`, `sound.test.ts`, `sound.ts`, `AstronautMarkers.tsx`) can start independently; final wiring touches `Scene.tsx` and `RepairQte.tsx` after US1–US3.
- **Polish (Phase 7)**: Runs after all desired stories are complete.

### Within Each User Story

1. Convert `it.todo` / write failing tests FIRST (verify red run).
2. Implement pure logic (`iso.ts`, `visualState.ts`, pure marker/sound helpers).
3. Wire thin R3F/React UI components (`Scene.tsx`, `StructureModel.tsx`, `RepairQte.tsx`).
4. Run story tests + `npm run check` before opening the story PR.

### Parallel Opportunities

- **US3 (`src/features/repair/`)** can be developed completely in parallel with **US1/US2 (`src/features/scene/`)** since there are zero overlapping files.
- Within **US1**: `StructureModel.tsx` (T006) and `CREDITS.md` (T008) can run in parallel with `iso.ts` (T005).
- Within **US4**: `astronautMarkers.test.ts` (T019), `sound.test.ts` (T020), `AstronautMarkers.tsx` (T021), `sound.ts` (T022), and `CREDITS.md` (T025) can all proceed in parallel before wiring into `Scene.tsx` and `RepairQte.tsx`.

---

## Parallel Example: User Story 1 + User Story 3

```bash
# US1 pure math test first while US3 test first runs in parallel:
Task T004: "Implement failing camera rotation test in src/features/scene/iso.test.ts"
Task T015: "Convert it.todo tests in src/features/repair/RepairQte.test.tsx"

# US1 model component + US3 CSS in parallel:
Task T006: "Create low-poly structure models in src/features/scene/StructureModel.tsx"
Task T016: "Update bolt layout and timer styles in src/features/repair/RepairQte.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T002) & Phase 2 (T003).
2. Complete Phase 3 / US1 (T004–T009): grid math, 90° camera rotation, 11 low-poly models, placement preview, selection.
3. **STOP and VALIDATE**: Verify `iso.test.ts` and `npm run check` are green; merge US1 PR.

### Incremental Delivery

1. **US1 (Target 12:00)**: Playable isometric base with models, 90° camera, hover, placement, selection -> PR 1.
2. **US2 (Target 14:00)**: All adverse states & weather lighting clearly readable from scene -> PR 2.
3. **US3 (Target 16:00)**: Full bolt QTE minigame with 6 s timer and random bolt placement -> PR 3.
4. **US4 (Target 19:00)**: Audio, decorative astronaut markers, WebGL fallback, and performance pass -> PR 4.
