# Research: Isometric Base Scene & Repair QTE

**Feature**: `004-base-scene` | **Date**: 2026-11-14

## Decisions & Rationale

### 1. 90-Degree Stepped Isometric Camera Rotation & Tile Picking
- **Decision**: Maintain a discrete camera step index `rotationStep` (`0 | 1 | 2 | 3`, corresponding to `0°`, `90°`, `180°`, `270°` around the Y-axis) in `Scene.tsx` local state, animating the orthographic camera position smoothly around `(0, 0, 0)` at radius `R` and elevation `Y` (e.g., `[14, 14, 14]` rotated by `step * Math.PI / 2`), while keeping `MapControls` `enableRotate={false}` and `minZoom={25}` / `maxZoom={90}`.
- **Rationale**: Raycasting against the ground plane (`y = 0`) in Three.js returns world `(x, z)` coordinates regardless of camera orientation. However, pure `iso.ts` helpers (`rotateCameraStep`, `screenDeltaToGrid`, or camera-oriented offset helpers if needed) should remain pure and tested in `iso.test.ts` so that camera rotation steps and tile picking/orientation remain verifiably invariant across all 4 angles.
- **Alternatives considered**: Free orbital rotation via `MapControls` — rejected because Constitution V explicitly mandates "orthographic camera at a fixed isometric angle, rotation in 90° steps, zoom with limits".

### 2. Low-Poly 3D Structure Models & < 5 MB Budget
- **Decision**: Support `.glb` low-poly models in `public/models/` (sourced from CC0 Kenney Space Kit / public-domain NASA 3D Resources without logos) with lightweight procedural Three.js geometry fallbacks per structure type (`habitat`, `solar_panel`, `battery_bank`, `mine`, `oxygen_generator`, `ice_melter`, `iron_refinery`, `greenhouse`, `repair_workshop`, `steel_factory`, `nuclear_reactor`) so every structure renders cleanly even before or without external `.glb` files, keeping total `public/models/` + textures + `public/audio/` well under 5 MB.
- **Rationale**: Procedural/low-poly primitives + compressed CC0 `.glb` modules guarantee fast loading on school laptops with integrated GPUs, zero licensing risk, and immediate visual differentiation for 1×1 vs 2×2 structures.
- **Alternatives considered**: High-poly textured models — rejected due to the 5 MB asset budget and integrated-GPU performance target.

### 3. Pure `visualState.ts` & Non-Color Visual Cues
- **Decision**: Extend `visualState(game, config)` and add a pure per-structure helper (e.g., `structureVisualState(structure, game, visualState)`) in `src/features/scene/visualState.ts` to compute:
  - Scene-level: `light`, `dustHaze`, `dark`, `unheated` (whether any habitat lacks heating / base is unheated), and `radiationWarning` (whether a `radiation_alarm` / warning-phase event is active).
  - Structure-level: status (`building`, `active`, `damaged`, `clogged`, `short_circuit`), `frosted` (habitat when `unheated`), and non-color cue flags (`showSparks` for `short_circuit`, `showDustOverlay` for `clogged`, `showDamageTiltOrSmoke` for `damaged`, `showFrost` for unheated habitats).
- **Rationale**: Constitution V & VIII require all "how the state looks" logic to live in `visualState.ts` with Vitest unit tests, and Constitution III requires that color is never the only signal.
- **Alternatives considered**: Computing visual cues inline inside R3F components — rejected because R3F components must stay thin and untested.

### 4. Repair QTE Timer, Bolt Positioning & Animation
- **Decision**: Implement `RepairQte.tsx` using `config.mission.repair.qteBolts` (5) and `config.mission.repair.qteSeconds` (6), displaying one bolt button at a time at a randomized `(x%, y%)` coordinate within the repair target area, with a `requestAnimationFrame` / `setInterval` countdown timer that triggers `finishQte(false)` on expiry and `finishQte(true)` when the final bolt is clicked.
- **Rationale**: Matches Constitution II.10 ("5 bolts appear one by one on the structure, and the player has 6 seconds to click all of them") and `RepairQte.test.tsx` `it.todo` items, testable deterministically with `vi.useFakeTimers()` in jsdom.
- **Alternatives considered**: Showing all 5 bolts simultaneously — rejected by Constitution II.10 and `RepairQte.test.tsx`.

### 5. WebGL Fallback & Audio Policy Compliance
- **Decision**: Wrap the R3F `<Canvas>` in a React ErrorBoundary + WebGL capability check in `Scene.tsx` so if WebGL context creation fails, it renders a clean non-blocking fallback message without crashing `App.tsx`, allowing 2D build-menu play (Constitution V). Use Web Audio API / `<audio>` with lazy unlock on first user gesture and silent catch on autoplay blocks in `src/features/scene/sound.ts` (or `public/audio/`).
- **Rationale**: Ensures 100% playability on restricted school laptops/browsers and avoids uncaught promise rejections from browser autoplay policies.
- **Alternatives considered**: Hard-crashing or requiring WebGL2 — rejected by Constitution V.
