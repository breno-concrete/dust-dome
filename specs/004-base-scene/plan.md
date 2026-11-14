# Implementation Plan: Isometric Base Scene & Repair QTE

**Branch**: `scene/004-base-scene` | **Date**: 2026-11-14 | **Spec**: [spec.md](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/004-base-scene/spec.md)

**Input**: Feature specification from `/specs/004-base-scene/spec.md`

## Summary

Deliver the isometric 2.5D Martian outpost scene (`src/features/scene/`) and the bolt-tightening repair QTE minigame (`src/features/repair/`). Pure grid math (`iso.ts`) and pure state-to-visuals mapping (`visualState.ts`) drive thin React Three Fiber components (`Scene.tsx` and subcomponents) with low-poly models, 90° stepped camera rotation, environmental/structure state cues (damage, clogging, short-circuit, frost, dust haze, winter darkness, radiation alarm tint), decorative straight-line astronaut markers, audio feedback, and a WebGL-safe fallback.

## Technical Context

**Language/Version**: TypeScript ~7.0.2, React 19.3.1, Node >=22.18
**Primary Dependencies**: `three` ^0.187.0, `@react-three/fiber` ^9.8.2, `@react-three/drei` ^10.7.9, `zustand` ^5.1.0 (no new dependencies)
**Storage**: N/A (read-only static assets in `public/models/` and `public/audio/`; state read from `useGameStore`)
**Testing**: Vitest 5.1.0 + `@testing-library/react` 16.3.3 + `@testing-library/user-event` 14.6.10 (`jsdom` 31.0.1)
**Target Platform**: Modern desktop and mobile web browsers (WebGL with 2D fallback)
**Project Type**: Frontend single-page web application (Vite 8.3.6)
**Performance Goals**: Smooth rendering on integrated-GPU school laptops; lazy-loaded `Scene`; total `public/models/` + textures + `public/audio/` < 5 MB
**Constraints**: Strict ownership (`src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/`, `CREDITS.md` Scene section); only permitted store actions (`hoverAt`, `placeAt`, `selectStructure`, `finishQte`); zero engine/data imports; zero hardcoded balance values; no physics/pathfinding; EN+PT i18n
**Scale/Scope**: 12×12 grid, 11 structure types (1×1 and 2×2), 3 upgrades, 4 seasons, 4 cycles, 4 astronauts, 1 repair QTE modal

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle III (Built for Kids 7–12 in a Browser)**: PASS — Plain-language EN+PT strings via `useT`; non-color visual cues (sparks, dust overlays, frost, warning geometry) accompany all status colors.
- **Principle IV (Clear Ownership Through Contracts)**: PASS — Edits restricted to `src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/`, and `CREDITS.md` (Scene section). Only calls `hoverAt`, `placeAt`, `selectStructure`, `finishQte`. Store selectors return primitives/existing refs; derived state computed in render via `selectors.ts`.
- **Principle V (Isometric 2.5D Base Builder: Visualization, Not Simulation)**: PASS — Orthographic camera at fixed isometric angle, 90° stepped rotation, bounded zoom, 12×12 grid, pure `visualState.ts` & `iso.ts`, no physics/pathfinding, straight-line decorative astronauts, <5 MB budget, WebGL fallback.
- **Principle VIII (Test-First, Small, Green)**: PASS — Starts from existing `it.todo` in `iso.test.ts`, `visualState.test.ts`, `RepairQte.test.tsx`; tests first (red -> green -> refactor), `npm run check` gate, no new dependencies, 1 PR per user story (~300 lines max).
- **Part IV (Space Apps Constraints)**: PASS — CC0 / public domain assets only, no NASA logos/insignia, documented in `CREDITS.md` › Scene.

## Project Structure

### Documentation (this feature)

```text
specs/004-base-scene/
├── brief.md             # Area brief
├── spec.md              # Feature specification (/speckit-specify)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 view models & state
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   └── scene-contract.md # Store & component contracts
└── tasks.md             # Phase 2 output (/speckit-tasks - not created here)
```

### Source Code (repository root)

```text
src/features/scene/
├── Scene.tsx            # Default-exported lazy-loaded R3F scene + WebGL fallback + camera controls
├── iso.ts               # Pure 12×12 grid <-> world math & 90° rotation helpers
├── iso.test.ts          # Vitest unit tests for iso.ts
├── visualState.ts       # Pure game state -> scene/structure visual state mapping
├── visualState.test.ts  # Vitest unit tests for visualState.ts
├── StructureModel.tsx   # Low-poly structure models + status/frost/upgrade cues
├── AstronautMarkers.tsx # Decorative straight-line astronaut markers (US4)
└── sound.ts             # Lightweight Web Audio / audio cue helper (US4)

src/features/repair/
├── RepairQte.tsx        # Bolt-tightening QTE modal (one bolt at a time, timer, sound)
├── RepairQte.module.css # QTE overlay and bolt positioning styles
└── RepairQte.test.tsx   # Vitest + Testing Library tests for RepairQte

public/
├── models/              # Optional CC0/public-domain .glb low-poly models (< 5 MB total)
└── audio/               # Optional CC0 sound effects
```

**Structure Decision**: Follows the existing repository feature-folder layout and Constitution Part III ownership boundaries without introducing new directories outside owned paths.

## Complexity Tracking

No constitution violations. All design choices fit within existing dependencies and ownership boundaries.
