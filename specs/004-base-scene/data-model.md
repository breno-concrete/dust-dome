# Data Model: Isometric Base Scene & Repair QTE

**Feature**: `004-base-scene` | **Date**: 2026-11-14

All entities below are **read-only view models or local UI state** derived from `GameState`, `GameConfig`, and `useGameStore`. The scene never mutates `GameState` directly.

## 1. Grid & Camera (`src/features/scene/iso.ts`)

- **`Grid`**: `{ width: number; height: number }` (12×12 from `config.mission.grid`).
- **`RotationStep`**: `0 | 1 | 2 | 3` (representing `0°`, `90°`, `180°`, `270°` clockwise steps around Y).
- **Coordinate mapping**:
  - `tileCenter(tile: Tile, size: number, grid: Grid) -> [x, y, z]`
    - `1×1` at `[0, 0]` -> `[-5.5, 0, -5.5]`
    - `2×2` at `[5, 5]` -> `[0, 0, 0]`
  - `worldToTile(x: number, z: number, grid: Grid) -> Tile | null`
    - Returns `[tx, ty]` for `0 <= tx < width` and `0 <= ty < height`, else `null`.

## 2. Scene Visual State (`src/features/scene/visualState.ts`)

- **`VisualState`**:
  - `light: number` — `0..1` (0 = black, 1 = full daylight; modulated by season and `solarFactor`; `dark` overrides to dim night level).
  - `dustHaze: number` — `0..1` (`1 - min(solarFactor)` across `game.activeEvents`).
  - `dark: boolean` — `true` when `season === 'winter'` and `cycle >= config.seasons.winterDarknessFromCycle`.
  - `frost: boolean` — `true` when base is unheated (no power for habitat heating / `game.power.unheated` or equivalent engine state).
  - `radiationTint: boolean` — `true` during the radiation storm warning phase (10-second alarm).
- **`StructureVisual`**:
  - `status`: `'building' | 'active' | 'damaged' | 'clogged' | 'short_circuit'`
  - `color`: hex color from `STATUS_COLOR`
  - `nonColorCue`: `'none' | 'construction' | 'damage' | 'dust' | 'sparks' | 'frost'` (ensures color is never the only signal per Constitution III).

## 3. Decorative Astronaut Marker

- **`AstronautVisual`** (local render state, derived from `game.crew`):
  - `id: string`
  - `alive: boolean`
  - `state`: `'inside' | 'outside'`
  - `startPos: [number, number, number]`
  - `endPos: [number, number, number]`
  - Moves linearly (`lerp`) between two structure/tile waypoints when outside; no physics or pathfinding.

## 4. Repair QTE State (`src/features/repair/RepairQte.tsx`)

- **Consumed from store**: `qteFor: string | null`
- **Config from `config.mission.repair`**:
  - `qteBolts: number` (5)
  - `qteSeconds: number` (6)
- **Local component state**:
  - `boltsLeft: number` (`qteBolts` down to `1`)
  - `timeLeft: number` (seconds remaining, `qteSeconds` down to `0`)
  - `boltPosition: { xPercent: number; yPercent: number }` (randomized per bolt within `15%..85%` of the target area)
- **State transitions**:
  - Bolt clicked when `boltsLeft > 1` -> `boltsLeft - 1`, new random `boltPosition`.
  - Bolt clicked when `boltsLeft === 1` -> `finishQte(true)`.
  - `timeLeft <= 0` -> `finishQte(false)`.
  - "Give up" clicked -> `finishQte(false)`.
