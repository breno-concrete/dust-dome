<!--
Sync Impact Report
Version: 2.1.0 → 2.1.1 (PATCH: fixed checkpoints replaced by one sprint review per user story
  round, schedule in WORKFLOW.md; story PRs target develop, main changes only at sprint
  reviews; internal docs such as specs and WORKFLOW.md may be in Portuguese)
Previous: 2.0.0 → 2.1.0 (MINOR: test-first principle added; events moved to Dev A,
  repair QTE moved to Dev C; one spec per developer)
Earlier: 1.0.0 → 2.0.0 (MAJOR: game concept replaced, principles redefined)
Modified principles: I (three core systems), III (time controls, narrator), V (isometric 2.5D
  base builder replaces orbit-and-click scene)
Added principles: VI (real-time with player control of time), VII (failure teaches)
Added sections: Part II — Game Design Canon (all rules and v1 balance values)
Changed contract: config model in II.15 replaces the v1 example files
  (resources/modules/decisions/events/scenarios)
Contract implemented in the repo: src/config/schema.ts, src/engine/types.ts, src/app/store.ts
Source: game design meeting of 2026-11-14 (POs), meeting record in docs/
-->

# Mars Outpost — Project Constitution

**Working title:** Mars Outpost
**Challenge:** NASA Space Apps Challenge 2026 — *Build a Junior Astronaut Mission Trainer*
**Audience:** kids aged 7–12 (and their families and classrooms)
**Team:** 4 software engineers, 2 aerospace engineers (product owners), 48 hours

This document is the single source of truth for the project. Part I defines the principles every
decision must respect. Part II defines the game itself, with every rule and every v1 balance
value. Parts III–V define how the team works. Spec Kit plans are checked against this document.

**One-sentence pitch:** four astronauts land in Hellas Planitia, Mars, and the player has four
Martian years to build a base that keeps everyone alive through real Martian seasons, dust storms
and solar storms, so that the first colonists can arrive.

---

# Part I — Core Principles

### I. Every Choice Is a Real Trade-off (NON-NEGOTIABLE)

- The game has **three core systems**, matching the challenge's guidance of 2–3 core resources:
  1. **Power** — produced, stored and distributed in kW.
  2. **Life support** — three vital reserves: **Oxygen, Water, Food**.
  3. **Protection** — thermal insulation, radiation shelter, dust filters and shields.
- Materials (hematite, regolith, iron, steel, repair parts) are the **wallet** that pays for
  everything. They are shown compactly and never as failure bars.
- Every structure and upgrade costs materials. Every consumer structure draws power. Every power
  setting trades power for output. No choice is free.
- All numbers and texts live in `src/config/*.json`, owned by the product owners. Code never
  hard-codes balance values.

### II. Real Science, Honestly Labeled

- Every rule that comes from real Mars science says so in the game and in `CREDITS.md`
  (see II.13). Every game simplification is labeled as a simplification in the sources screen.
- Season lengths and order come from the real southern-hemisphere Martian year.
- Radiation storms are modeled on real solar particle events from NASA DONKI; the alert names the
  real event it is based on.
- Archived data is never presented as live. Real data is committed as snapshots so the game works
  offline.
- Only `src/data/` reads NASA sources. The engine never does I/O.

### III. Built for Kids 7–12 in a Browser

- Plays in a desktop or mobile browser from a link: no download, no account, no login.
- Plain language. Unavoidable terms (sol, regolith, radiation, dust devil) are explained where
  they appear.
- A narrator, **Commander Vega**, briefs the player at the start of every season. Every structure
  has an educational description shown before buying it.
- Large text, icons always paired with words, color never the only signal.
- All player-facing text has English (mandatory) and may have Portuguese.
- The project never contains images, video or voices of people under 18.

### IV. Clear Ownership Through Contracts

- Each developer owns an area (Part III) and only edits files in it. The CI `ownership` job
  enforces it.
- Areas talk only through the contract: `src/engine/types.ts`, `src/config/schema.ts` and
  `src/app/store.ts`.
- The engine (`src/engine/`) is pure functions: `(state, config, input) → state`. No React, no
  fetch, no `Math.random` (use the seeded generator), no timers. Fully unit-tested.
- Components never import the engine or the data layer; they use `useGameStore`.
- The 3D scene and the repair QTE read the store and may only call `hoverAt`, `placeAt`,
  `selectStructure` and `finishQte`. They never change resources.
- A `useGameStore` selector returns only primitives or existing references; derived objects are
  computed in render with the helpers in `src/app/selectors.ts`.
- Changing a contract file: announce it, open a `shared/` PR that only touches contract files,
  the tech lead merges it quickly, everyone rebases.

### V. Isometric 2.5D Base Builder: Visualization, Not Simulation

- The base is shown in **isometric 2.5D** (Clash of Clans–style): a three.js scene with an
  orthographic camera at a fixed isometric angle, rotation in 90° steps, zoom with limits.
- The player builds on a **12 × 12 tile grid**. Structures occupy 1×1 or 2×2 tiles. Placement is
  valid on free tiles only; adjacency has no effect.
- The scene shows the consequences of decisions: damaged, clogged or short-circuited structures,
  dust storms, winter darkness, season lighting, the radiation alarm.
- No physics engine, no collisions, no pathfinding, no first-person or free walking. Astronaut
  markers, if drawn, move along straight lines for decoration only.
- "How the state looks" logic lives in pure, tested functions
  (`src/features/scene/visualState.ts`); R3F components stay thin.
- Performance budget: low-poly models, models + textures under 5 MB, scene code lazy-loaded,
  smooth on an integrated-GPU school laptop.
- If WebGL fails, the game stays playable: the build menu places structures on the next free tile.

### VI. Real Time, Controlled by the Player

- The game runs in real time. The engine advances with `tick(state, config, dtSeconds)`, driven by
  a timer in the store; the engine itself has no clock.
- **Pause** and speed controls **1× / 2× / 4×** are mandatory and always visible.
- Commander briefings and the end-of-mission debrief pause the game.
- The same seed always produces the same mission (same event times and targets).

### VII. Failure Teaches

- Every lethal outcome is preceded by a visible warning: low-reserve alert, exposure alert,
  10-second radiation alarm, the commander's hint before cycle 3.
- The debrief explains every death and every lost resource in plain language and links the real
  science behind it.
- Restarting is one click.

### VIII. Test-First, Small, Green (NON-NEGOTIABLE)

- Every behavior starts as a failing test written from the spec's acceptance scenarios (red),
  then the minimum code that passes it (green), then cleanup (refactor). AI agents follow the
  same order and show the failing run before implementing.
- The `it.todo` lists already in the repo are the agreed test plan; turning a todo into a passing
  test is the unit of progress.
- How each area tests:
  - engine and events: Vitest unit tests on pure functions;
  - 2D UI: Testing Library in jsdom (`// @vitest-environment jsdom`) with the real store and
    hand-made game states, never waiting for the engine;
  - scene: pure functions (`iso.ts`, `visualState.ts`); R3F components stay thin and untested.
- Tests describe behavior, not exact balance numbers, so the POs can change the JSON freely.
- Never delete, skip or weaken a test to make a build pass; never edit another area's tests.
- `main` is always playable and deployed. CI (`check` + `ownership`) must be green to merge.
- Pull requests are small (about 300 changed lines or fewer), one user story each, merged within
  hours.
- No new dependencies without the tech lead's approval.

---

# Part II — Game Design Canon

All values below are **v1 balance values**: they define the first playable version and live in
`src/config/*.json`, where the product owners tune them during playtests.

## II.1 Setting

- **Planet:** Mars, **southern hemisphere**.
- **Site:** eastern rim of **Hellas Planitia** (~42°S), where orbital radar found water-ice
  glaciers buried under dust and rock, and a known source of global dust storms. This gives the
  base water ice to mine and frequent dust events.
- **Crew:** 4 astronauts.
- **Mission:** prepare the base for **12 colonists** within **4 cycles** (4 Martian years).

## II.2 Win and Lose

**Win** — when winter of cycle 4 ends, all of these are true:

1. At least one astronaut is alive.
2. Stored reserves cover one season for everyone (colonists + crew = 16 people):
   - **Oxygen ≥ 16 U**
   - **Food ≥ 16 U**
   - **Water ≥ 32 U**
3. Habitat capacity ≥ 16 (4 habitat modules).
4. Power production ≥ power demand at that moment (all habitats heated, no deficit).

The HUD shows these targets as marks on the three vital bars from the start of the game.

**Lose** — the mission ends when all 4 astronauts are dead. Astronauts die when:

| Cause | Rule |
|---|---|
| Empty reserve | A vital reserve (O₂, Water or Food) at 0, or no heat in the habitat: after a 15 s grace period one astronaut dies, then one more every 15 s while it lasts. |
| Radiation storm | An astronaut outside, or inside a habitat without a radiation shelter, when the storm hits. |
| Radiation exposure | An astronaut's exposure meter reaches 100% (II.9). |
| Extreme cold | At the start of winter in cycles 3 and 4, astronauts in a habitat without thermal insulation. |

## II.3 Time

- **1 cycle = 1 Martian year = 4 seasons**, in the southern-hemisphere order
  spring → summer → autumn → winter.
- **1 cycle = 20 minutes at 1×.** Season durations are proportional to the real seasons:

| Season (southern) | Real length | Share of year | Duration at 1× |
|---|---|---|---|
| Spring | 142 sols | 21.2% | 4 min 15 s |
| Summer | 154 sols | 23.0% | 4 min 37 s |
| Autumn (longest, calmest) | 194 sols | 29.0% | 5 min 48 s |
| Winter | 178 sols | 26.6% | 5 min 20 s |

- A full mission is 4 cycles = 80 minutes at 1× (40 min at 2×, 20 min at 4×).
- **Difficulty:** cycle 1 is normal; cycle 2 worsens the climate; cycle 3 is the planetary crisis
  (difficulty ceiling); cycle 4 repeats cycle 3 at maximum scale (II.11).
- **Production and consumption are continuous.** Per-season amounts are spread evenly over the
  season's duration and applied every tick (tick = 1 s of game time). UI shows rates per season.

## II.4 Resources

| Group | Resource | Unit | Source | Use |
|---|---|---|---|---|
| Raw (currency) | **Hematite** (iron oxide) | count | Mine | Base currency; feeds the iron refinery |
| Raw | **Regolith** (Martian soil) | count | Mine | Construction; radiation shielding |
| Raw | **Sunlight** | — (not stored) | Environment | Converted to power by solar panels |
| Processed | **Iron** | count | Iron refinery | Level 2 builds; steel; repair parts |
| Processed | **Steel** | count | Steel & alloy factory | Level 3 builds and upgrades |
| Processed | **Repair parts** | count | Repair workshop | Repairs |
| Vital | **Oxygen** | U | Oxygen generator | 1 U per person per season |
| Vital | **Water** | U | Ice melter | 2 U per person per season; greenhouse |
| Vital | **Food** | U | Pressurized greenhouse | 1 U per person per season |
| Power | **Power** | kW (flow); EU (stored) | Panels, reactor, batteries | Every consumer structure |

- **1 O₂ unit ≈ 62 kg**, about one astronaut's oxygen for one season (scaled from the MOXIE team's
  estimate of ~1 t of oxygen per year for 4 astronauts).
- **1 EU** (energy unit) = 1 kW for 1 second of game time.
- Reserves have no storage cap in v1.

## II.5 Conversion Rates

| Process | Input | Output |
|---|---|---|
| Iron refining | 10 hematite | 4 iron |
| Steel making | 5 iron + atmospheric CO₂ (free, shown for science) | 3 steel |
| Repair part making | 2 iron | 5 repair parts |

## II.6 Structures and Upgrades

**Levels:** level 1 costs hematite and/or regolith; level 2 costs iron; level 3 costs steel.
Construction takes **15 s** for every structure and occupies one astronaut outside (II.9).

### Level 1

| Structure | Cost | Tiles | Power base / max | Output per season (base / max) | Notes |
|---|---|---|---|---|---|
| Habitat module | 40 hematite + 30 regolith | 2×2 | heating table (II.7) | — | Houses 4 people. Protects from cold; with the shelter upgrade, from radiation. No power switch. |
| Solar panel | 15 hematite | 1×1 | produces (II.7) | — | Output varies by season and events. |
| Battery bank | 20 hematite | 1×1 | — | — | Stores 1,500 EU. |
| Mine | 25 hematite | 2×2 | 3 / 6 kW | 25 hematite + 20 regolith / 45 hematite + 35 regolith | Clogs with dust in spring and summer (II.11). |
| Oxygen generator | 30 hematite | 1×1 | 6 / 10 kW | 4 O₂ / 7 O₂ | Splits atmospheric CO₂ into oxygen (MOXIE). At base it supports the 4-person crew; max adds 3 U of surplus. |
| Ice melter | 20 hematite | 1×1 | 4 / 8 kW | 30 water / 55 water | Extracts and melts buried ice. Extra heating demand in cold seasons (II.7). |

### Level 2

| Structure | Cost | Tiles | Power base / max | Per season (base / max) | Notes |
|---|---|---|---|---|---|
| Iron refinery | 50 hematite + 20 regolith | 2×2 | 6 / 12 kW | uses 30 / 60 hematite → 12 / 24 iron | Costs no iron because it produces iron. |
| Pressurized greenhouse | 15 regolith + 20 iron | 2×2 | 5 / 9 kW | uses 15 / 30 water → 4 / 8 food | Extra heating demand in cold seasons (II.7). |
| Repair workshop | 25 iron | 1×1 | 2 / 5 kW | uses 4 / 8 iron → 10 / 20 repair parts | |
| Steel & alloy factory | 30 regolith + 45 iron | 2×2 | 10 / 18 kW | uses 15 / 30 iron → 9 / 18 steel | |

### Level 3

| Structure | Cost | Tiles | Power | Notes |
|---|---|---|---|---|
| Compact nuclear reactor | 40 regolith + 30 steel | 2×2 | **produces 40 kW constant** | Unaffected by seasons, darkness, storms or any event. Consumes nothing. |

### Upgrades

Each upgrade is installed on one structure, takes 15 s and one astronaut outside.

| Upgrade | Installs on | Cost | Effect |
|---|---|---|---|
| Thermal insulation | Habitat module | 25 regolith + 20 iron | Halves the cold add-on of the habitat's heating demand (II.7). Required to survive winter in cycles 3–4. |
| Radiation shelter | Habitat module | 30 regolith + 15 iron | Regolith-shielded room. Astronauts inside this habitat survive radiation storms (capacity 4). |
| Dust filters & shields | Solar panel, mine, oxygen generator, ice melter, iron refinery | 20 steel | Prevents clogging and short-circuits; on solar panels, prevents dust-devil damage. Does not restore sunlight blocked by storms. |

### Starting Base

| Item | Starting value |
|---|---|
| Structures | 1 habitat module, 1 mine, 2 solar panels, 1 oxygen generator, 1 ice melter (all placed, all at Base) |
| Materials | 60 hematite, 40 regolith, 0 iron, 0 steel, 0 repair parts |
| Reserves | 8 O₂, 20 water, 8 food (two seasons for the crew) |
| Batteries | none |

## II.7 Power System

**Production**

| Source | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| Solar panel (each, no events) | 12 kW | 15 kW | 9 kW | 4 kW (0 kW in winter darkness, cycles 2–4) |
| Compact nuclear reactor | 40 kW in every season and event | | | |

**Power switches.** Each structure **type** (not each unit) has one switch: **Off / Base / Max**,
applied to all structures of that type. Off draws 0 kW and produces nothing. Switches exist for:
mine, oxygen generator, ice melter, iron refinery, greenhouse, repair workshop, steel factory.
The habitat has no switch: it always draws its heating demand.

**Balance.** The HUD power meter shows production − demand.
- Surplus charges batteries (1 EU per kW per second, no losses).
- Deficit drains batteries.
- With batteries empty, structure types switch to Off in this order until demand fits:
  steel factory → repair workshop → iron refinery → mine → ice melter → greenhouse → oxygen
  generator. The habitat is never switched off; if even its heating cannot be met, the base is
  **unheated** and the empty-reserve rule applies (II.2).

**Heating demand (kW, Base setting).** Max adds +4 kW for the greenhouse and the ice melter.

Habitat module, without insulation:

| Cycle | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| 1 | 4 | 4 | 6 | 10 |
| 2 | 4 | 4 | 8 | 12 |
| 3–4 | 4 | 4 | 12 | 14 |

Habitat module, with thermal insulation:

| Cycle | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| 1 | 4 | 4 | 5 | 7 |
| 2 | 4 | 4 | 6 | 8 |
| 3–4 | 4 | 4 | 8 | 9 |

Pressurized greenhouse:

| Cycle | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| 1 | 5 | 5 | 6 | 8 |
| 2 | 5 | 5 | 7 | 9 |
| 3–4 | 5 | 5 | 9 | 10 |

Ice melter:

| Cycle | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| 1 | 4 | 4 | 4 | 6 |
| 2 | 4 | 4 | 5 | 7 |
| 3–4 | 4 | 4 | 7 | 8 |

## II.8 Life Support

- Each person consumes per season: **1 U oxygen, 2 U water, 1 U food**.
- The greenhouse consumes water (II.6), so water feeds both the crew and the food supply.
- **Low-reserve alert:** a vital bar flashes and the commander warns when it holds less than one
  season of crew needs.

## II.9 Crew and External Jobs

- **4 astronauts** live in habitat modules (4 per module).
- **External jobs:** build (15 s), install upgrade (15 s), repair (QTE + 5 s), clean (10 s).
  Each job takes one astronaut outside. Maximum simultaneous jobs = astronauts alive. Extra jobs
  wait in a queue.
- **Radiation exposure meter** (per astronaut, 0–100%):
  - outside: fills to 100% in 25% of the current season's duration;
  - inside a habitat: empties at half that rate;
  - at 75% the astronaut's icon flashes and the commander tells the player to bring them in;
  - at 100% the astronaut dies.
- **Winter, cycles 2–4:** external jobs are blocked; queued jobs resume in spring. Production
  inside the base continues.

## II.10 Damage, Repairs and Cleaning

| State | Cause | Effect | Fix |
|---|---|---|---|
| Damaged | Dust devil (solar panels) | −50% output | Repair |
| Clogged | Dust (II.11) | −25% output | Clean (no parts) |
| Short-circuited | Global dust storm (mine, refinery) | 0 output | Repair |

- **Repair** costs **4 repair parts** and a **quick-time event**: 5 bolts appear one by one on the
  structure, and the player has 6 seconds to click all of them. Success: an astronaut finishes the
  repair outside (5 s). Failure: the parts are lost and the player may try again.
- **Cleaning** takes one astronaut outside for 10 s and is not possible while a dust storm is
  active.

## II.11 Events by Cycle and Season

Event times are drawn from the seeded generator within the intervals below.

### Cycle 1 — Normal

| Season | Event | Effect |
|---|---|---|
| Spring | **Dust devils** every 30–45 s | 1 random solar panel becomes damaged |
| Summer | **Local dust storm** every 30 s, lasting 15 s | Solar panels −40% while active |
| Autumn | **Mild cold** | Heating table, cycle 1 autumn |
| Winter | **Intense cold** | Heating table, cycle 1 winter |

### Cycle 2 — Worsening Climate

| Season | Event | Effect |
|---|---|---|
| Spring | **Frequent dust devils** every 20–30 s | 1 panel damaged; 50% chance to clog the oxygen generators' filters |
| Summer | **Dense dust storm** every 30 s, lasting 20 s | Panels −60% while active; each storm clogs mines and iron refineries |
| Autumn | **Sharp cold** | Heating table, cycle 2 autumn (ice melter included) |
| Winter | **Severe cold + total darkness** | Heating table, cycle 2 winter; solar panels 0 kW; external jobs blocked |

### Cycle 3 — Planetary Crisis

| Season | Event | Effect |
|---|---|---|
| Spring | **Large dust devils** every 30–40 s | 2 panels damaged; clogs oxygen generators, mines and iron refineries |
| Summer | **Global dust storm**, the whole season | Panels −80%; every 45 s a random mine or iron refinery short-circuits. No other efficiency loss. |
| Autumn | **Extreme cold** | Heating table, cycle 3 autumn (as cold as cycle 2 winter) |
| Winter | **Severe cold + total darkness** | Heating table, cycle 3 winter; panels 0 kW; external jobs blocked; thermal insulation required (II.2) |

### Cycle 4 — Final Test of the Colony

Same as cycle 3 at maximum scale: event intervals × 0.75 and the global dust storm reduces panels
by 85%. Level 3 infrastructure (reactor, steel, dust filters) is what keeps the base alive.

### Radiation Storm (cycles 2–4)

- One per cycle, at a seeded random time in spring, summer or autumn.
- A **10-second alarm** sounds. The player taps **Take shelter** (all astronauts) or sends
  astronauts one by one into a habitat with a radiation shelter. Jobs pause and resume afterwards.
- When the storm hits (lasting 20 s), astronauts outside or in a habitat without a shelter die.
- The alert names the real solar particle event from NASA DONKI it is modeled on (date and link).

## II.12 Narrator and Educational Layer

- **Commander Vega** briefs the player at the start of every season (the game pauses): the season,
  why it happens on Mars, what may happen, how to prepare.
- **Before cycle 3**, the commander warns that winters will be much harsher and that current
  measures may not be enough, hinting at thermal insulation.
- **Every structure and upgrade** has an educational description in the build menu: how it works
  and its real-world basis (e.g. the ice melter extracts buried ice like the glaciers detected
  under Hellas).
- **Debrief** at the end: what happened cycle by cycle, why each loss happened, the real science
  behind it, with links.

## II.13 Real-Science Anchors

| Game element | Real basis | Kind |
|---|---|---|
| Season order and lengths (142 / 154 / 194 / 178 sols) | Real southern-hemisphere Martian seasons | Real value, scaled to 20 min |
| Summer gives the most solar power | Southern summer happens near perihelion | Real, simplified |
| Dust in spring and summer; global dust storm | Southern spring–summer dust season; global storms such as 2018's, which ended the Opportunity rover's mission | Real, simplified |
| Hellas Planitia, water ice | Buried glaciers detected by MRO's SHARAD radar | Real |
| Oxygen generator, 1 U ≈ 62 kg O₂ | MOXIE on Perseverance (up to 12 g O₂/h; ~1 t/year for 4 astronauts) | Real, scaled |
| Hematite | Detected on Mars from orbit and by the Opportunity rover at Meridiani Planum | Real; mining it from local regolith is a simplification |
| Compact nuclear reactor, 40 kW | NASA Fission Surface Power project (40 kW-class) | Real target value |
| Radiation storm | Solar particle events in NASA DONKI | Real events |
| Exposure limit outside | Surface radiation measured on Mars; the 25%-of-season limit is a game rule | Simplification |
| Thermal insulation, regolith shelter | Habitat concepts for Mars | Simplification |
| Production numbers (kW, units per season) | Chosen for gameplay balance | Game values |

## II.14 Hackathon Scope

| Priority | Items |
|---|---|
| **Must** | Real-time loop with seasons and cycles 1–4; time controls; 3 vital bars + power meter + wallet; grid building of all level 1–3 structures; upgrades; power switches and brownout; crew jobs and exposure; damage, repairs with QTE, cleaning; all events in II.11 including the radiation storm; win/lose; commander briefings; educational descriptions; debrief; sources screen; English text |
| **Should** | Portuguese toggle; sound; dust and darkness visuals; battery charge display |
| **Could** | Decorative astronaut markers; live DONKI "today's space weather" note |
| **Won't (post-hackathon)** | Prestige / roguelike meta-progression (extra astronaut, cheaper structures between runs); difficulty levels by number of colonists; food types; other sites; multiplayer; accounts |

## II.15 Configuration Model

The contract PR replaces the v1 example config with these files (all owned by the POs):

| File | Contents |
|---|---|
| `resources.json` | Materials and vital reserves: id, name, explain, icon, starting value |
| `structures.json` | id, level, cost, tiles, power base/max or production, inputs/outputs per season base/max, capacity, allowed upgrades, explain, source |
| `upgrades.json` | id, target structure types, cost, effect, explain |
| `seasons.json` | order, real sols, duration at 1×, solar output per season, heating tables per cycle |
| `events.json` | per cycle and season: kind, interval range, duration, effects, explain, source |
| `mission.json` | crew, colonists, needs per person, win targets, starting base, job times, exposure rules, brownout order, QTE parameters, radiation storm rules |

CI keeps enforcing the design rules on these files: every buildable structure and upgrade has a
cost; every consumer has a power draw; every event has an explanation and a source; every text
has English.

---

# Part III — Areas and Workflow

| Area | Owner | Branch prefix | Paths | Responsibilities |
|---|---|---|---|---|
| Engine core, store, app shell, repo | Breno (tech lead) | `engine/` | `src/engine/` (except `events/`), `src/app/`, `src/config/schema.ts`, `src/config/loadConfig.ts`, `src/config/config.test.ts` | Time and seasons, production and consumption, power and brownout, player actions and jobs, crew exposure and deaths, win/lose, store, loop, selectors, contract, CI |
| Events and NASA data | Dev A | `data/` | `src/engine/events/`, `src/data/`, `scripts/`, `src/features/sources/`, `src/features/end/` | Seeded event scheduling, dust devils, storms, clogging, short-circuits, darkness, radiation storm, DONKI snapshots, sources screen, debrief |
| 2D game UI and UI kit | Dev B | `ui/` | `src/ui-kit/`, `src/features/title/`, `src/features/hud/`, `src/features/decisions/` | HUD (vital bars with targets, power meter, wallet, clock, time controls, crew), build and upgrade menus with fact sheets, power switches, commander briefings, alerts and radiation alarm, title screen, i18n |
| Isometric scene and repair QTE | Dev C | `scene/` | `src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/` | Isometric camera, grid, placement preview, structure models and states, storms, darkness and season light, astronaut markers, repair QTE, sound |
| Game content and balance | Product owners | `content/` | `src/config/*.json` | Every number and text in Part II |
| Shared files | Breno | `shared/` | anything; needs CODEOWNERS approval | Contract changes, dependencies, CI, Spec Kit |

**Spec Kit rules:**

- **One spec per developer** for the hackathon, in the pre-created folder of their area, passed
  explicitly: `SPECIFY_FEATURE_DIRECTORY=specs/00X-<area>`. Read `brief.md` in that folder
  first. Each spec has 4–5 user stories; each user story becomes one pull request.
- Work found after that gets its own new spec (numbering is by timestamp, so specs never collide).
- Part II of this document is the functional source of truth for every spec. Specs reference its
  sections instead of redefining rules.
- Setup and foundational infrastructure already exist. Plans and tasks must not add dependencies,
  change configs, or touch files outside the owner's paths. A needed contract change becomes a
  "contract change request" for the tech lead.
- Tasks are grouped by user story and every story starts with its test tasks (principle VIII):
  tests first, then implementation, then `npm run check`.
- Time-box: specify + plan + tasks in about 45 minutes.

**Integration:** one sprint per user story round (sprint 1 = every area's US1). Story PRs go to
`develop`; each sprint ends with a team review (demo, PO acceptance, cross code review) and a
merge of `develop` into `main`. Schedule and steps: `WORKFLOW.md`. Code freeze Sunday 14:00;
submission by Sunday 20:00 (deadline 23:59 local time).

---

# Part IV — Space Apps Constraints

- Everything judges see is in English: the game, the README and the project page. Internal team
  documents (specs, `WORKFLOW.md`) may be in Portuguese. Video demos may be in Portuguese with
  English subtitles. Demo limits: 7 slides or 30 seconds.
- At least one NASA data source is used and named on the project page.
- Every third-party asset, library, dataset and AI use is listed in `CREDITS.md`, in the section of
  the area that added it.
- AI-generated images or video carry a visible watermark; AI-generated code is acknowledged. No
  NASA logos, insignia or mission identifiers in generated content.
- No copyrighted music, images or text without permission. No game assets, names or characters
  from the games that inspired the design.

---

# Part V — Governance

This constitution overrides other practices in this repository. The tech lead maintains Parts I,
III, IV and V; the product owners maintain Part II and the config files that implement it.
Amendments go through a `shared/` pull request approved by a second team member; changes to
Part II also need one product owner's approval. Every pull request must respect the ownership
table and the principles above.

**Version**: 2.1.1 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-14
