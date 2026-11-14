# Brief — 003 2D game UI and UI kit

**Owner:** Dev B · **Branch prefix:** `ui/` · **Spec folder:** `specs/003-game-ui/`
**Rules of the game:** constitution III, VI, VII, II.2, II.6, II.7, II.12

## Goal

Everything the player reads and clicks on top of the base, clear for a 7-year-old: the three
vital bars with their targets, power, wallet, clock and speed, crew, the build and upgrade menus
with fact sheets, power switches, the commander's briefings and the alerts.

## Owned paths

`src/ui-kit/`, `src/features/title/`, `src/features/hud/`, `src/features/decisions/`.

## Consumes

- `useGameStore` state and actions; helpers in `src/app/selectors.ts`.
- Texts and numbers from `src/config/*.json`.

## Provides

- The UI kit everyone uses: `Button`, `ResourceBar`, `Card`, `Modal`, `Icon`, tokens, `useT()`.

## How to test without waiting for the engine

Render with the real store and put the state you need in it:
`useGameStore.setState({ game: { ...createGame(config, 1), stock: { ...lowStock } } })`.
See `Hud.test.tsx` and `BuildMenu.test.tsx`.

## User stories (one PR each, tests first)

| # | Story | Target | Tests to turn green |
|---|---|---|---|
| US1 | UI kit + HUD: real bars with targets, low-reserve flash, power meter, wallet, crew exposure | 12:00 | `Hud.test.tsx` |
| US2 | Build menu: levels, affordability, fact sheets; upgrades menu for the selected structure | 14:00 | `BuildMenu.test.tsx` |
| US3 | Power switches, commander briefings with per-cycle texts, alerts and the radiation alarm | 16:00 | new tests in `src/features/decisions/` |
| US4 | Title screen, PT/EN, mobile layout, accessibility pass | 19:00 | new tests in `src/features/title/`, `src/ui-kit/` |

## Out of scope

3D scene and repair QTE (Dev C), engine rules (Breno), debrief and sources (Dev A).

## Done when

A kid can see what each choice costs before clicking, and can play a full mission with the 2D
UI alone, even if the 3D scene fails to load.

## Start

```
/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/003-game-ui Read specs/003-game-ui/brief.md and the constitution, and specify it.
```
