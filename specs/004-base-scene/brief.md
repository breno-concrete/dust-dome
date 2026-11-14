# Brief — 004 Isometric base scene and repair QTE

**Owner:** Dev C · **Branch prefix:** `scene/` · **Spec folder:** `specs/004-base-scene/`
**Rules of the game:** constitution V, II.10, II.11 (what the events look like)

## Goal

The Martian outpost in isometric 2.5D: a grid where the player places structures, low-poly
models that show their state, a sky that fills with dust and goes dark in winter, and the bolt
minigame that repairs broken structures.

## Owned paths

`src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/`.

## Consumes

- `useGameStore`: `game`, `placing`, `hoverTile`, `selectedStructureId`, `qteFor`; actions
  `hoverAt`, `placeAt`, `selectStructure`, `finishQte` only.
- `placementPreview()` and `structureDef()` from `src/app/selectors.ts`.

## Provides

- Default-exported `Scene` (lazy-loaded by `App.tsx`) and `RepairQte`.

## How to test

Everything that decides what the scene shows lives in pure functions with Vitest tests
(`iso.ts`, `visualState.ts`). The R3F components only draw what those functions return.

For manual visual verification in `npm run dev`, `src/features/scene/DevVisualInspector.tsx`
provides a **dev-only** floating panel (strictly gated by `import.meta.env.DEV && !import.meta.env.VITEST`
so it is stripped from production builds and Vitest). **Any upcoming scene features (US3, US4,
and future visual/audio/marker states) should add their manual test toggles to `DevVisualInspector.tsx`**
rather than waiting for live game events or mixing debug UI into production code.

## User stories (one PR each, tests first)

| # | Story | Target | Tests to turn green |
|---|---|---|---|
| US1 | Low-poly models per structure, 90° camera rotation, hover and selection | 12:00 | `iso.test.ts` |
| US2 | Visual states: damaged, clogged, short-circuit, dust haze, darkness, season light, frost | 14:00 | `visualState.test.ts` |
| US3 | Repair QTE: one bolt at a time, timer, success and failure | 16:00 | `RepairQte.test.tsx` |
| US4 | Sound, astronaut markers (decorative), performance pass on the weakest laptop | 19:00 | new tests for any new pure logic |

## Asset candidates (check each license, add to CREDITS.md › Scene)

- Kenney "Space Kit" (CC0 low-poly modules).
- NASA 3D Resources (public domain; never use logos or insignia).

## Out of scope

HUD, menus and alerts (Dev B), any game rule (Breno, Dev A). The scene never changes resources.

## Done when

A player can tell from the base alone what is broken, clogged or in danger, and can repair a
structure by playing the bolt minigame.

## Start

```
/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/004-base-scene Read specs/004-base-scene/brief.md and the constitution, and specify it.
```
