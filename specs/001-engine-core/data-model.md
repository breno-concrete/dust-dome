# Data Model: Engine Core

Phase 1 of [plan.md](plan.md). The model already lives in `src/engine/types.ts` (contract);
this page lists what each field means for this feature, the rules that keep it valid, and the
state transitions. Fields marked **v2** arrive with the `shared/contract-v2` PR
([contracts/contract-v2.md](contracts/contract-v2.md)). Decisions referenced as R# are in
[research.md](research.md).

## GameState (the mission)

| Field | Meaning | Written by |
|---|---|---|
| `seed`, `rng` | Seed and generator state. The engine core never touches `rng` (R17). | createGame / Dev A |
| `time` | Clock (see GameTime). | time |
| `stock` | Amount of every resource id from `resources.json`. Never below 0. | economy, actions |
| `batteryEu` | Stored energy, `0 ≤ batteryEu ≤ capacity` of finished battery banks. | power |
| `structures` | Placed structures, in creation order. | actions, jobs, Dev A (status) |
| `powerModes` | `off` / `min` / `max` per switchable type (Base = `min`). | actions |
| `power` | Power report of the last step. | power |
| `crew` | Astronauts, in crew order. | jobs, crew, actions |
| `jobs` | External jobs, in creation order. | actions, jobs, crew |
| `activeEvents`, `nextEventAt`, `radiationStorm` | Event state. Read-only for the engine core. | Dev A |
| `briefing` | Open season briefing, or `null`. `tick` does nothing while set. | time, actions |
| `dangerTimers` | Seconds each death condition has lasted (R14). | crew |
| `log` | Append-only history for the debrief. | every step |
| `status`, `lostReason` | `running` → `won` / `lost`; reason `crew_lost` or `targets_missed`. | outcome |
| `nextId` | Source of new ids (`s…`, `a…`, `j…`). | createGame, actions |

## GameTime (clock)

- `cycle` 1…`seasons.cycles`; `season` in `seasons.json` order; `secondsIntoSeason` in
  `[0, duration(season)]`; `elapsed` = total game seconds.
- **Rules**: `secondsIntoSeason` only equals the duration at the very end of the mission (R2).
- **Transitions**: season → next season (remainder kept, briefing opened, `season_start` logged);
  winter → spring of `cycle + 1`; winter of the last cycle → clock stops.

## Stock

- Materials: `hematite`, `regolith`, `iron`, `steel`, `repair_parts`. Vital: `oxygen`, `water`,
  `food` (exactly these three, enforced by `config.test.ts`).
- **Rules**: never below 0 (clamp after each subtraction); a vital reserve is **empty** when ≤ EPS.

## StructureInstance

| Field | Meaning |
|---|---|
| `id` | `s<n>`, unique, from `nextId`. |
| `type` | Id from `structures.json`. |
| `tile` | Top-left tile; covers `size × size` tiles; inside the 12 × 12 grid. |
| `status` | `building` / `active` / `damaged` / `clogged` / `short_circuit`. |
| `upgrades` | Installed upgrade ids, each listed in the type's `upgrades`, no duplicates. |

- **Placement rules**: inside the grid; no overlap; **v2** if the type has `connectsTo`, at least
  one side shared with a structure of a listed type, unless none exists yet (R10).
- **Condition factors**: `damaged` × `damagedFactor`, `clogged` × `cloggedFactor`,
  `short_circuit` × 0 (production and inputs, R4); power draw 0 for `building` and
  `short_circuit` (R5).

```text
            build job done
 building ─────────────────▶ active ◀──────────────────────────┐
                              │  │  │                           │
           dust devil (Dev A) │  │  │ global storm (Dev A)      │ repair job done
                              ▼  │  ▼                           │
                          damaged│ short_circuit ───────────────┤
                              │  │                              │
                              └──┼──────────────────────────────┘
                     dust (Dev A)│                  clean job done
                                 ▼                       │
                              clogged ───────────────────┘
```

## Structure type switch (`powerModes`)

- One entry per type with `switchable: true`; starts at `min`.
- Habitat, solar panel, battery bank and reactor have no entry and no switch.

## PowerReport (`power`)

| Field | Meaning |
|---|---|
| `productionKw` | Solar + reactor output this step (R5). |
| `demandKw` | Draw after the brownout. |
| `balanceKw` | `productionKw − demandKw`; negative = drawing from the batteries. |
| `shed` | Types switched off by the brownout, kept between steps (R6). |
| `unheated` | Even the habitats' heating cannot be met. |

- **Shed-set transitions** (R6): empty → (batteries empty and deficit) add types in brownout
  order → (production alone covers a type, reverse order) remove it, or (batteries full) clear.
  Each change appends one `power_shed` log entry.

## Astronaut

| Field | Meaning |
|---|---|
| `id`, `name` | `a<n>`; names from the crew list. |
| `alive` | `false` is final. |
| `location` | `inside` / `outside`. |
| `habitatId` | Habitat the astronaut is in; changes when protection strikes (R15). |
| `exposure` | `[0, 1]`; 1 = lethal. |
| `jobId` | Current job, or `null`. |
| `resting` **v2** | Recalled; takes no job until exposure is back to 0 (R12). |

```text
            takes a job (eligible: inside, no job, not resting, exposure < warnAt,
            no block, no radiation storm)
 inside ───────────────────────────────────────────────────────────────▶ outside
   ▲                                                                       │
   │  job done · job paused by a block · bringInside / bringAllInside      │
   └───────────────────────────────────────────────────────────────────────┘
 any state ──▶ dead: exposure full · countdown (empty reserve, cold) · extreme cold at
               winter start without room in an insulated habitat · radiation storm active
               while outside or without room in a sheltered habitat
```

## Job

| Field | Meaning |
|---|---|
| `id` | `j<n>`, creation order = queue order. |
| `kind` | `build` / `upgrade` / `repair` / `clean`. |
| `structureId` | Target structure. |
| `upgradeId` | For `upgrade` jobs. |
| `astronautId` | Who is doing it; `null` unless `active`. |
| `remainingSeconds` | Starts at the configured duration; kept across pauses and recalls. |
| `status` | `queued` / `active` / `paused`. |

- **Rules**: at most one `active` job per living astronaut; at most one queued or active job of
  the same kind for the same structure (and the same upgrade).

```text
 created ──▶ queued ──(eligible astronaut)──▶ active ──(remaining ≤ 0)──▶ done (removed, logged)
               ▲                                │
               │   recall · astronaut dies      │
               ├────────────────────────────────┤
               │                                │ external jobs blocked
               └──(block ends)── paused ◀────────┘
```

## LogEntry

- `at`, `cycle`, `season`, `kind`, `ref`, `cause?`.
- Kinds written by the engine core: `season_start`, `built`, `upgrade_installed`, `repaired`,
  `cleaned`, `death`, `power_shed`. Dev A writes `damaged`, `clogged`, `short_circuit`,
  `radiation_storm`.
- Death causes: `exposure`, `empty_oxygen`, `empty_water`, `empty_food`, `cold`,
  `radiation_storm`.

## WinTargets

- `people = colonists + crew`; `reserves[x] = needs[x] × people`; `habitatCapacity = people`.
- Checked when winter of the last cycle ends, together with the power target (R16).

## Config fields the engine reads

| File | Fields |
|---|---|
| `resources.json` | `id`, `kind`, `start` |
| `structures.json` | `id`, `cost`, `size`, `power`, `switchable`, `inputs`, `outputs`, `heatingKw`, `insulatedHeatingKw`, `capacity`, `upgrades`, **v2** `connectsTo` |
| `upgrades.json` | `id`, `effect`, `cost` |
| `seasons.json` | `cycles`, `seasons[].id`, `seasons[].durationSeconds`, `winterDarknessFromCycle` |
| `mission.json` | `crew`, `colonists`, `needs`, `grid`, `startingStructures`, `jobs`, `exposure`, `emptyReserve`, `damage`, `repair`, `brownoutOrder`, `insulationRequiredFromCycle` |
