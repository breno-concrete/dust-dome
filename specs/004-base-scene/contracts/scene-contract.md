# Scene & Repair Interface Contract

**Feature**: `004-base-scene` | **Owner**: Dev C | **Date**: 2026-11-14

## Store Contract (`src/app/store.ts` — Read-Only + Permitted Actions)

### Permitted Selectors (Primitives / Existing References Only)
- `useGameStore((s) => s.game)` -> `GameState | null`
- `useGameStore((s) => s.placing)` -> `StructureTypeId | null`
- `useGameStore((s) => s.hoverTile)` -> `Tile | null`
- `useGameStore((s) => s.selectedStructureId)` -> `string | null`
- `useGameStore((s) => s.qteFor)` -> `string | null`

### Permitted Actions (Constitution IV)
- `hoverAt(tile: Tile | null): void` — called on ground pointer move/leave.
- `placeAt(tile: Tile): void` — called on ground click when `placing !== null`.
- `selectStructure(id: string | null): void` — called on structure click (`id`) or empty ground click (`null`) when `placing === null`.
- `finishQte(success: boolean): void` — called by `RepairQte` when all bolts are clicked (`true`) or timer expires / user gives up (`false`).

### Forbidden
- Calling any other store action (`setPowerMode`, `installUpgrade`, `clean`, `shelterAll`, `advance`, etc.).
- Importing from `src/engine/` (except `type` imports from `src/engine/types.ts`) or `src/data/`.
- Modifying `src/app/store.ts`, `src/app/selectors.ts`, `src/engine/types.ts`, or `src/config/*.json`.

## Derived Helpers (`src/app/selectors.ts`)
- `placementPreview({ game, placing, hoverTile })` -> `{ tiles: Tile[]; valid: boolean } | null` (called in render, never inside a Zustand selector).
- `structureDef(type: string)` -> `StructureDef | undefined`.

## Component Exports
- `src/features/scene/Scene.tsx`: `export default function Scene()` (lazy-loaded by `src/app/App.tsx`).
- `src/features/repair/RepairQte.tsx`: `export function RepairQte()`.

## Dev-Only Visual Inspector (Dev/Prod Barrier)
- **Module**: `src/features/scene/DevVisualInspector.tsx` and `src/features/scene/DevVisualInspector.module.css`.
- **Strict Build Barrier**: `Scene.tsx` imports only `type` definitions statically and lazy-loads `DevVisualInspector` strictly behind `import.meta.env.DEV && !import.meta.env.VITEST`. Production builds (`npm run build`) eliminate the branch and exclude the dev panel and its CSS from the production bundle.
- **State Boundary**: Overrides live purely in local React state inside `Scene.tsx` (`devOverrides`) and never mutate `GameState` or call forbidden store actions.
- **Rule for Future Changes**: All upcoming scene/QTE/audio/marker additions (e.g., US3, US4, or new visual states) **MUST** register their manual test controls inside `DevVisualInspector.tsx` so developers can test them immediately without waiting for the game loop, while keeping production UI completely clean.
