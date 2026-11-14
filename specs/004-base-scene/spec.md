# Feature Specification: Isometric Base Scene & Repair QTE

**Feature Branch**: `scene/004-base-scene`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "SPECIFY_FEATURE_DIRECTORY=specs/004-base-scene Leia specs/004-base-scene/brief.md e a constituição e especifique isso."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Isometric Base Grid, Structure Models, Camera & Selection (Priority: P1)

A player views their Martian outpost on a 12×12 isometric 2.5D terrain grid in Hellas Planitia. Each placed structure type (1×1 or 2×2 tiles) is represented by a distinct low-poly 3D model positioned accurately on its assigned tiles. The player can rotate the camera in 90-degree steps around the base and zoom within comfortable limits, hover over tiles to see placement previews (valid or invalid), click to place a selected structure on free tiles, and click existing structures to select them.

**Why this priority**: Without the playable isometric grid, camera controls, distinct structure models, and tile picking/placement, there is no visual base to observe or interact with.

**Independent Test**: Can be fully tested by rendering the outpost with starting structures, rotating the camera through all four 90-degree orientations, hovering over free and occupied tiles during placement mode, placing a 1×1 and a 2×2 structure, and selecting an existing structure.

**Acceptance Scenarios**:

1. **Given** a 12×12 outpost grid with placed 1×1 and 2×2 structures, **When** the scene renders, **Then** each structure type displays a recognizable low-poly model centered on its occupied tile(s) (1×1 on a single tile center, 2×2 centered across its four tiles).
2. **Given** the player is viewing the base, **When** the player triggers a 90-degree camera rotation (clockwise or counter-clockwise) or zooms within allowed bounds, **Then** the camera smoothly orbits to the new 90-degree angle and tile picking/hovering continues to resolve to the exact grid tile under the pointer.
3. **Given** the player has chosen a structure to build, **When** the pointer moves over the 12×12 grid, **Then** a placement preview highlights the target 1×1 or 2×2 footprint as valid on free tiles and invalid on occupied or out-of-bounds tiles, and clicking a valid tile places the structure.
4. **Given** the player is not in placement mode, **When** the player clicks an existing structure on the grid, **Then** that structure becomes selected and visually highlighted.

---

### User Story 2 - Visual Structure States, Weather & Lighting (Priority: P2)

A player can tell at a glance from the 3D scene alone what is happening to their base and its environment. Structures visually communicate their operational and damage states—damaged (solar panels hit by dust devils), clogged (dust buildup), short-circuited (disabled by global dust storms), or unheated (frost on habitats when power cannot meet heating demand). The sky, ambient light, and atmosphere reflect the Martian season (brighter in summer, dimmer in autumn/winter), winter darkness in cycles 2–4, dust haze during local and global dust storms, and a warning tint during the 10-second radiation storm alarm.

**Why this priority**: Core constitution requirement (V & "Done when"): the player must be able to read the base's condition and environmental hazards directly from the scene without relying solely on text alerts.

**Independent Test**: Can be fully tested by evaluating the scene's visual state across each season, cycle-2+ winter darkness, active dust storms, unheated habitat states, damaged/clogged/short-circuited structures, and an active radiation alarm.

**Acceptance Scenarios**:

1. **Given** the base is in different Martian seasons, **When** comparing summer to winter, **Then** summer lighting is noticeably brighter than winter lighting, and from cycle 2 onward winter enters total darkness.
2. **Given** a local or global dust storm is active, **When** the scene updates, **Then** the atmosphere fills with dust haze proportional to the storm and ambient light dims accordingly.
3. **Given** a structure is damaged, clogged, or short-circuited (Constitution II.10), **When** rendered in the scene, **Then** it displays a clear, distinct visual indicator (paired with non-color cues such as sparks, dust/debris overlays, or warning icons/geometry) corresponding to its exact state.
4. **Given** the base is unheated (power cannot meet habitat heating demand), **When** rendered in the scene, **Then** habitat modules show visible frost.
5. **Given** a radiation storm is in its 10-second warning phase (Constitution II.11), **When** the alarm is active, **Then** the scene applies a visible warning tint so the player immediately notices the incoming storm.

---

### User Story 3 - Repair Quick-Time Event (QTE) Minigame (Priority: P3)

When a player initiates a repair on a damaged or short-circuited structure (and has the required repair parts), a bolt-tightening minigame appears over/for that structure. Five bolts appear one at a time at random positions on the repair target, and the player has 6 seconds to click all 5 bolts before the timer runs out. Clicking all bolts in time succeeds (allowing the astronaut to finish the repair); running out of time fails (consuming the parts and closing the minigame so the player can retry).

**Why this priority**: Repairs are a core gameplay loop for recovering from dust devils and global dust storms (Constitution II.10) and directly complete the "Done when" goal of the brief.

**Independent Test**: Can be fully tested by opening the repair minigame for a broken structure, verifying bolts appear one at a time, clicking all bolts within the time limit to confirm success, and letting the timer expire in another run to confirm failure.

**Acceptance Scenarios**:

1. **Given** a repair minigame is started for a structure, **When** the minigame opens, **Then** a countdown timer (6 seconds per Constitution II.10 / mission config) starts and the first bolt (1 of 5) appears at a randomized position.
2. **Given** a bolt is displayed during the minigame, **When** the player clicks it before time expires, **Then** that bolt disappears and the next bolt appears at a new randomized position until all 5 bolts are clicked.
3. **Given** the player clicks all 5 bolts before the timer reaches zero, **When** the final bolt is clicked, **Then** the minigame completes with a success result and closes.
4. **Given** the timer reaches zero before all 5 bolts are clicked, **When** time expires, **Then** the minigame completes with a failure result and closes.

---

### User Story 4 - Audio Feedback, Decorative Astronaut Markers & Performance Polish (Priority: P4)

To bring the Martian outpost to life while keeping the experience accessible on low-spec school laptops, the scene plays appropriate sound effects (placement, repair bolts, storm/alarm cues) with mute/respect for browser audio policies, displays decorative astronaut markers moving along straight lines between base points when astronauts are active, and meets the performance budget so gameplay stays smooth on integrated graphics.

**Why this priority**: Sound and decorative astronaut markers are "Should" / "Could" priorities in Constitution II.14, and performance optimization ensures the scene remains playable for the target audience (kids 7–12 on school laptops).

**Independent Test**: Can be tested by triggering placement and repair interactions to verify audio triggers without errors, observing decorative astronaut markers moving along straight paths without blocking clicks, and verifying total model/texture asset size stays under 5 MB.

**Acceptance Scenarios**:

1. **Given** astronauts are alive in the base, **When** the scene renders, **Then** decorative astronaut markers move smoothly along straight-line paths between base points without physics, pathfinding, or interfering with tile selection.
2. **Given** the player places a structure, clicks a bolt in the repair minigame, or a storm/radiation alarm occurs, **When** audio is enabled, **Then** corresponding sound feedback plays cleanly without blocking interaction if audio playback is restricted by the browser.
3. **Given** all 3D models, textures, and audio assets used by the scene, **When** packaged for delivery, **Then** total models + textures remain under 5 MB and the scene renders smoothly on an integrated-GPU laptop without blocking the rest of the application if WebGL is unavailable.

---

### Edge Cases

- What happens when the player's pointer moves outside the 12×12 grid during placement? Tile picking returns no tile, and the placement preview hides or indicates out-of-bounds without throwing errors.
- What happens when a 2×2 structure is hovered on the far edge (row 11 or column 11) of the 12×12 grid? The placement preview marks it invalid because part of the 2×2 footprint falls outside the grid.
- What happens when the camera is rotated 90°, 180°, or 270° and the player hovers or clicks a tile? Screen-to-grid picking accounts for the current camera rotation so the visual tile under the cursor matches the logical grid coordinate.
- What happens if WebGL fails to initialize on a user's device? The scene falls back gracefully without crashing the application, allowing the player to continue playing via the 2D build menu (Constitution V).
- What happens if a structure has multiple states simultaneously (e.g., clogged and in winter darkness)? Both the structure's state indicator and the environmental lighting/haze remain legible.
- What happens if the user double-clicks or clicks outside a bolt during the repair QTE? Only clicking the active bolt advances the bolt count; clicking elsewhere does not advance or accidentally complete the QTE.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render the Martian outpost on a 12×12 isometric 2.5D grid using an orthographic-style isometric view with 90-degree stepped camera rotation and bounded zoom.
- **FR-002**: System MUST map every structure type (Level 1–3: habitat module, solar panel, battery bank, mine, oxygen generator, ice melter, iron refinery, pressurized greenhouse, repair workshop, steel & alloy factory, compact nuclear reactor) to a distinct low-poly 3D model sized to its 1×1 or 2×2 tile footprint.
- **FR-003**: System MUST accurately convert between grid tile coordinates and world positions for both 1×1 and 2×2 structures across all four 90-degree camera orientations.
- **FR-004**: System MUST display a placement preview on the grid when placing a structure, clearly distinguishing valid (free, in-bounds) from invalid (occupied or out-of-bounds) placements, and trigger placement only on valid clicks.
- **FR-005**: System MUST allow players to hover over tiles and click placed structures to select them when not in placement mode.
- **FR-006**: System MUST compute and render environmental visuals purely from game state and configuration: seasonal light levels (brighter in summer, dimmer in winter), winter darkness from the configured cycle onward, dust haze and dimmed light during local/global dust storms, and a warning tint during the radiation storm alarm phase.
- **FR-007**: System MUST compute and render per-structure visual states purely from game state: damaged (dust devil), clogged (dust buildup), short-circuited (global dust storm), and frosted/unheated (habitat modules when heating demand is unmet), using non-color cues in addition to color (Constitution III).
- **FR-008**: System MUST provide the repair quick-time event (QTE) minigame that displays one bolt at a time at a randomized position for the configured bolt count (5 bolts) within the configured time limit (6 seconds), reporting success when all bolts are clicked in time or failure when time expires.
- **FR-009**: System MUST read only the permitted store state and dispatch only the permitted scene/repair actions (`hoverAt`, `placeAt`, `selectStructure`, `finishQte`), never modifying resources or game rules directly (Constitution IV).
- **FR-010**: System MUST display decorative astronaut markers moving along straight lines without physics, collision, or pathfinding (Constitution V).
- **FR-011**: System MUST provide sound feedback for key scene and repair interactions and degrade gracefully if browser audio is blocked.
- **FR-012**: System MUST degrade gracefully if WebGL is unavailable so the rest of the game remains playable via 2D menus (Constitution V).
- **FR-013**: All third-party 3D models, textures, and audio assets MUST have verified permissive licenses (e.g., CC0 or public domain without NASA logos/insignia) and be documented in `CREDITS.md` under the Scene section (Constitution IV & Part IV).

### Key Entities

- **Grid Tile**: A discrete coordinate `(x, y)` within the 12×12 outpost grid (`0..11` on each axis), which may be free or occupied by a structure.
- **Structure Visual**: The 3D representation of a placed structure, defined by its type, footprint (`1×1` or `2×2`), grid origin, upgrade presence, and visual status (normal, damaged, clogged, short-circuited, unheated/frosted).
- **Scene Visual State**: A derived snapshot of environmental appearance including ambient light level, darkness flag, dust haze intensity, frost state on habitats, and radiation alarm tint.
- **Repair QTE Session**: An active bolt-tightening minigame tied to a target structure ID, tracking remaining bolts (default 5), current bolt position, and remaining countdown seconds (default 6 s).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pure grid-math, visual-state, and repair QTE behavioral tests pass automatically without relying on live timers or manual clicks.
- **SC-002**: Players can distinguish all four adverse visual conditions (damaged, clogged, short-circuited, unheated frost) as well as dust storms, winter darkness, and radiation alarms directly from the scene without reading HUD alerts.
- **SC-003**: A player can rotate the camera through all four 90-degree angles and accurately place or select both 1×1 and 2×2 structures on the first click.
- **SC-004**: Total 3D model and texture asset footprint stays under 5 MB, and the scene is lazy-loaded so initial application startup is not blocked.
- **SC-005**: Every third-party asset used in `public/models/` and `public/audio/` is licensed for reuse and listed in `CREDITS.md`.

## Assumptions

- Game rules, resource costs, repair part deductions, and event scheduling are already handled by the engine and data layers; the scene and repair QTE only visualize state and report user intents (`hoverAt`, `placeAt`, `selectStructure`, `finishQte`).
- QTE parameters (`qteBolts`, `qteSeconds`) and seasonal/storm lighting thresholds (`winterDarknessFromCycle`, storm solar factors) are read from the shared configuration rather than hard-coded.
- HUD, build menus, and commander briefings are handled separately and sit outside the 3D scene's owned files.
- NASA logos, insignia, or mission identifiers will not appear on any 3D model or texture.
