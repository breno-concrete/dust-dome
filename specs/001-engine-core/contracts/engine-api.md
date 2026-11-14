# Contract: Engine API (what the other areas can rely on)

The engine exposes pure functions; the store (`src/app/store.ts`) is the only caller from the
screens. Components never import `src/engine/`. Names marked **v2** arrive with
[contract-v2.md](contract-v2.md). Rule details: [research.md](../research.md).

## Entry points (`src/engine/game.ts`)

| Function | Contract |
|---|---|
| `createGame(config, seed): GameState` | Cycle 1 spring, 0 s, spring briefing open, starting base `active`, crew inside the first habitat, stock from `resources.json`, every switch `min`, power report already computed, first `season_start` logged. Same seed → deep-equal state. |
| `tick(state, config, dt): GameState` | Returns `state` unchanged (same reference) while a briefing is open or the mission is over. Otherwise runs time → events (Dev A) → power → production → jobs → crew → outcome. `dt` is game seconds (speed already applied by the store), expected ≤ a few seconds. |
| `winTargets(config): WinTargets` | People, reserves and habitat capacity needed to win. Constant for a config. |

## Player actions (`src/engine/actions.ts`)

Every action is `(state, config, …) → ActionResult` and never throws. On refusal the state is
returned unchanged with one `ActionError`. Every action is refused with `not_allowed` after the
mission ended. Actions work while paused or while a briefing is open.

| Action | Success | Refusals |
|---|---|---|
| `build(type, tile)` | Cost paid; structure added as `building`; build job queued. | `not_allowed` (unknown type), `external_jobs_blocked`, `out_of_bounds`, `tile_blocked`, **v2** `not_connected`, `not_enough_resources` |
| `installUpgrade(structureId, upgradeId)` | Cost paid; upgrade job queued; effect when the job ends. | `not_allowed` (missing, building, not listed, installed, queued), `external_jobs_blocked`, `not_enough_resources` |
| `setPowerMode(type, mode)` | Every structure of the type uses `mode` from the next step. | `not_allowed` (not switchable) |
| `startRepair(structureId, qteSuccess)` | Parts spent in both cases; success also queues a repair job. | `not_allowed` (not damaged / short-circuited, or already queued), `external_jobs_blocked`, `not_enough_resources` |
| `clean(structureId)` | Clean job queued; no parts. | `not_allowed` (not clogged, queued, dust storm active), `external_jobs_blocked` |
| **v2** `demolish(structureId)` | Demolish job queued; nothing refunded yet. Cancelling a construction stops its build job. When the job ends: structure removed, `demolishRefundShare` of everything paid back. A structure queued for demolition no longer counts as a habitat neighbour. | `not_allowed` (missing or already queued), `external_jobs_blocked`, `last_habitat`, `no_room_for_crew`, `not_connected` |
| **v2** `bringInside(astronautId)` | Astronaut inside now; job back to the queue. No radiation storm: `resting` until exposure is 0. Radiation storm: into a sheltered habitat with room. | `not_allowed` (dead, already inside, or storm with no sheltered habitat with room) |
| **v2** `bringAllInside()` | Same, for every astronaut outside. During the radiation alarm this is the "Take shelter" button. | `not_allowed` (nobody outside, or storm with no sheltered habitat) |
| `dismissBriefing()` | Closes the briefing; the clock runs again. | — |

`shelterAll` is removed in v2 (unused by every screen; replaced by `bringAllInside`).

## Placement (`src/engine/placement.ts`)

| Function | Contract |
|---|---|
| `footprint(config, type, tile)` | Tiles covered by a structure of `type` at `tile`. |
| `placementError(state, config, type, tile)` | `null` or `out_of_bounds` / `tile_blocked` / **v2** `not_connected`. Does not check cost or blocks. The scene's preview (`selectors.placementPreview`) uses it, so the preview and the build refusal always agree. |

## What the screens can read from `GameState`

| Need | Field |
|---|---|
| Clock, season, cycle | `time` (seconds left: `selectors.secondsLeftInSeason`) |
| Vital bars and wallet | `stock`; targets from `selectors.targets` |
| Power meter | `power.productionKw`, `power.demandKw`, `power.balanceKw`, `power.shed`, `power.unheated`, `batteryEu` |
| Switches | `powerModes` |
| Structures and their state | `structures[].status`, `structures[].upgrades` |
| Crew panel | `crew[].alive`, `location`, `habitatId`, `exposure` (warn at `config.mission.exposure.warnAt`), `jobId`, **v2** `resting` |
| Job queue | `jobs[]` (`status`, `remainingSeconds`) |
| Briefing | `briefing` |
| Debrief | `log`, `status`, `lostReason` |

## Invariants the other areas can count on

1. No stock below 0; `0 ≤ batteryEu ≤` battery capacity; `0 ≤ exposure ≤ 1`.
2. At most one active job per living astronaut; dead astronauts have no job.
3. The engine core never changes `rng`, `activeEvents`, `nextEventAt` or `radiationStorm`.
4. Same seed + same actions at the same game times → same states (SC-002).
5. Every death and every brownout change is in `log` with a cause (SC-004).
