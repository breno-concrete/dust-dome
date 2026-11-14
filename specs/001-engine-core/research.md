# Research: Engine Core — the Living Base Simulation

Phase 0 of [plan.md](plan.md). The stack is fixed (TypeScript, Vitest, existing contract), so
there were no open technical unknowns; the research below turns the spec's rules into concrete,
testable decisions. Each item: **Decision / Rationale / Alternatives considered**.

Tolerance used everywhere below: `EPS = 1e-9` (floating-point only, not a balance value).

---

## R1. Season rollover and the season-start signal

- **Decision**: `advanceTime` adds `dt` to `elapsed` and `secondsIntoSeason`; when
  `secondsIntoSeason ≥ duration(season)` it moves to the next season (winter → spring of
  `cycle + 1`), keeps the remainder, opens `briefing = { cycle, season }` and appends a
  `season_start` log entry. `createGame` also logs the first `season_start`. A helper
  `seasonStartedThisStep(state, dt)` is true when `secondsIntoSeason < dt`, which is exactly the
  step in which a rollover happened.
- **Rationale**: the loop sends steps of 0.25 s × speed (≤ 1 s), far shorter than any season
  (≥ 255 s), so a step crosses at most one boundary. The remainder test needs no extra state field
  and works for any step size.
- **Alternatives**: a `seasonJustStarted` flag in `GameState` (contract change for no gain);
  reading `briefing !== null` inside the tick (implicit, breaks if the briefing rule changes).

## R2. End of the mission

- **Decision**: in winter of the last cycle (`config.seasons.cycles`), `advanceTime` clamps
  `secondsIntoSeason` at the season duration and adds only the time actually used to `elapsed`.
  `isMissionTimeOver(state, config)` is true once that point is reached. `checkOutcome` decides
  the result on that step; then `status !== 'running'` and `tick` returns the state unchanged.
- **Rationale**: FR-005 (nothing produced, consumed or charged after the end) follows for free:
  no more steps run.
- **Alternatives**: letting time run past the end and ignoring it (risks a 17th briefing and
  extra production).

## R3. Per-second rates

- **Decision**: every per-season amount is applied as `amount × dt / duration(currentSeason)`,
  using the season the clock is in after `advanceTime`.
- **Rationale**: FR-006. A step that straddles a boundary uses the new season's rate for the whole
  step; the error is at most `dt / duration` ≈ 0.4 % for a 1 s step, inside SC-003's 1 %.
- **Alternatives**: splitting a step at the boundary (more code, no visible difference).

## R4. Converters: partial input and competition

- **Decision**: for each structure, `need = inputs[mode] × condition × dt / duration`. The process
  runs at fraction `f = min(1, min over inputs of available / need)`; it consumes `f × need` and
  produces `f × outputs[mode] × condition × dt / duration`. The condition factor (damaged,
  clogged, short-circuited = 0) scales the whole process, inputs included. Order of processing:
  producers without inputs first; then converters by type in the **reverse brownout order** (most
  vital first), then by structure creation order; crew consumption last.
- **Rationale**: FR-008 (stock never below zero), deterministic competition (edge case "several
  converters need the same input"). Scaling inputs with the condition keeps a clogged refinery
  from burning hematite it does not turn into iron.
- **Alternatives**: all-or-nothing per step (output flickers when the input is almost gone);
  sharing the input proportionally among competitors (harder to explain and to test).

## R5. Power production and demand

- **Decision**:
  - Solar panel: `kwBySeason[season] × Π(activeEvents.solarFactor) × (damaged ? damagedFactor : 1)`;
    `0` in winter when `cycle ≥ winterDarknessFromCycle`. Reactor: constant `kw`.
  - Consumer draw by its type's mode (`off` = 0, `min`, `max`); habitats have no switch and always
    use `min`. When the structure has `heatingKw` (habitat, greenhouse, ice melter), the table
    value for `cycle` and `season` replaces `minKw`; in `max`, add `maxKw − minKw`. An insulated
    habitat uses `insulatedHeatingKw`.
  - Structures under construction and short-circuited structures draw nothing; damaged and clogged
    ones draw normally (spec Assumptions).
  - The helper `demandAtSwitches(state, config)` returns the demand before any brownout; it is also
    used by the win check (R16).
- **Rationale**: matches II.7 and the config shape already in `schema.ts` (`heatingKw` "replaces
  power.minKw"). Multiplying solar factors is the natural combination of simultaneous events.
- **Alternatives**: `min` of the solar factors (a dust devil plus a storm would not stack).

## R6. Brownout without flicker

- **Decision**: `computePower` starts from the previous step's `power.shed` set.
  1. If the batteries are **full** (capacity > 0 and charge ≥ capacity − EPS), clear the set.
     Otherwise restore shed types in reverse brownout order while production alone covers the
     demand with that type back on.
  2. If the batteries are **empty** (charge ≤ EPS) and production < demand, add types in brownout
     order until production ≥ demand.
  3. If every switchable type is shed and production is still below the habitats' heating, set
     `unheated = true`.
  The log gets a `power_shed` entry only when the set changes.
- **Rationale**: re-deciding from scratch every step makes the shed types blink on and off every
  0.25 s once the batteries are almost empty (charge a little → run everything → empty → shed…),
  which would flash the UI and spam the debrief. With this rule the base runs on the batteries
  until they are empty, sheds, recharges with the surplus until full, and then tries again: a slow
  cycle a child can follow. With no batteries at all the set depends only on production, which is
  stable inside a season.
- **Alternatives**: recompute every step (flicker); a restore threshold such as "10 % charge"
  (a new balance value for the POs to own, for little benefit); a minimum off time (same).

## R7. Battery charge

- **Decision**: `computePower(state, config, dt)` also integrates the batteries:
  `batteryEu += (production − demandAfterBrownout) × dt`, clamped to `[0, capacity]`, where
  capacity is the sum of finished battery banks' `capacityEu`. `tick` passes `dt` (signature
  change inside the engine only, `game.ts` is engine-owned). `createGame` fills the initial
  power report so the HUD is not empty before the first step.
- **Rationale**: `power.test.ts` already owns "surplus charges batteries … deficit drains them";
  keeping the integration next to the balance avoids passing the balance through `GameState`.
- **Alternatives**: integrate in `applyProduction` (splits one rule across two files).

## R8. External-job blocks and dust storms

- **Decision**: external jobs are blocked while any active event has `blocksExternalJobs`
  (today: winter darkness, cycles 2–4, from `events.json`). A dust storm is active while any active
  event has kind `dust_storm` or `global_dust_storm`. While a radiation storm exists (warning or
  active phase), no job starts.
- **Rationale**: `events.json` (POs) is the single source of truth and Dev A writes
  `activeEvents`; the engine never re-derives the calendar. Starting a job during the alarm would
  send a child's astronaut out to die.
- **Alternatives**: deriving "winter, cycles 2–4" in the engine (duplicates the event rule).

## R9. Player actions: validation order and refusals

- **Decision**: every action first refuses with `not_allowed` when the mission is over. Then:
  - `build`: unknown type → `not_allowed`; external jobs blocked → `external_jobs_blocked`;
    `placementError` → `out_of_bounds` / `tile_blocked` / `not_connected`; cost not covered →
    `not_enough_resources`. On success: pay, add the structure as `building`, queue a build job.
  - `installUpgrade`: structure missing, still building, upgrade not listed, already installed or
    already queued → `not_allowed`; blocked → `external_jobs_blocked`; cost → `not_enough_resources`.
  - `setPowerMode`: type not `switchable` → `not_allowed`.
  - `startRepair`: not damaged or short-circuited, or a repair already queued → `not_allowed`;
    blocked → `external_jobs_blocked`; parts < `repair.parts` → `not_enough_resources`. Failure:
    parts spent, `ok: true`. Success: parts spent, repair job queued.
  - `clean`: not clogged, already queued, or dust storm active → `not_allowed`; blocked →
    `external_jobs_blocked`.
  - `bringInside` / `bringAllInside`: see R12.
- **Rationale**: FR-017–FR-022; the order matches what the player sees first (where, then how
  much). A failed minigame is a valid action with a cost, not an error.
- **Alternatives**: checking cost before placement (the scene's preview would disagree with the
  refusal reason).

## R10. Habitat connection rule

- **Decision**: new optional config field `connectsTo: string[]` on a structure type (default
  `[]`). For a type with a non-empty list, `placementError` returns `not_connected` unless at
  least one tile of the new footprint shares a side (not a corner) with a tile of an existing
  structure whose type is in the list — finished or under construction. If no structure of those
  types exists yet, the rule is skipped. v1 content: habitat → `["habitat"]`.
- **Rationale**: FR-017 says the rule comes from the content files. `placementError` already feeds
  the scene's preview through `selectors.ts`, so Dev C gets the red preview for free.
- **Alternatives**: a boolean `mustConnect` (cannot later say "the greenhouse must touch a
  habitat"); hard-coding `type === 'habitat'` (violates principle I).

## R11. Jobs

- **Decision**: `updateJobs` runs three passes, in order:
  1. **Blocks**: if external jobs are blocked, every `active` job becomes `paused`, its astronaut
     goes inside (`jobId = null`, `location = inside`). When the block ends, `paused` → `queued`.
  2. **Progress**: each `active` job loses `dt` of `remainingSeconds`; at ≤ EPS it applies its
     effect (build → `active`; upgrade → added; repair → `active`; clean → `active`), logs
     (`built`, `upgrade_installed`, `repaired`, `cleaned`), and its astronaut goes inside.
  3. **Assignment**: jobs in creation order; each `queued` job that can run now (clean jobs wait
     during a dust storm, nothing starts during a block or a radiation storm) takes the eligible
     astronaut with the lowest exposure (ties: crew order). Eligible = alive, inside, no job, not
     resting, exposure < `exposure.warnAt`. The astronaut goes outside.
  Durations: `mission.jobs.buildSeconds`, `upgradeSeconds`, `repairSeconds`, `cleanSeconds`.
- **Rationale**: FR-023–FR-025; jobs that cannot run do not block the ones behind them; "lowest
  exposure first" spreads the radiation across the crew.
- **Alternatives**: strict FIFO (one clean job during a storm would freeze the queue); letting the
  player pick the astronaut (new UI, not in the canon).

## R12. Recall and resting

- **Decision**: new actions `bringInside(state, config, astronautId)` and
  `bringAllInside(state, config)` (they replace the unused `shelterAll`). The astronaut must be
  alive and outside, otherwise `not_allowed` (for "all": nobody outside). The job goes back to
  `queued` with its remaining time.
  - No radiation storm: the astronaut goes into their current habitat and gets `resting = true`;
    a resting astronaut takes no job until exposure ≤ EPS, then `resting = false`.
  - Radiation storm (warning or active): the astronaut goes into a finished habitat with a
    radiation shelter that has room; no such habitat → `not_allowed`. No `resting` flag: R8
    already keeps everyone inside until the storm ends, then the jobs resume.
- **Rationale**: FR-026 and US5 scenarios 8–10. Without the resting flag, the recalled astronaut
  would take the same job again on the next step.
- **Alternatives**: keeping `shelterAll` next to the two new actions (three actions for two
  ideas); resting until the exposure falls below the warning level (an astronaut recalled at 30 %
  would go straight back out).

## R13. Exposure

- **Decision**: fill speed per game second = `1 / (exposure.maxShareOfSeason × duration(season))`.
  Outside: `+ fill × dt`. Inside: `− recoveryRate × fill × dt`. Clamped to `[0, 1]`. At ≥ 1 − EPS
  the astronaut dies with cause `exposure`.
- **Rationale**: II.9, FR-027. Using the current season's duration matches "25 % of the current
  season".
- **Alternatives**: none worth keeping.

## R14. Death countdowns

- **Decision**: `dangerTimers` keys: `empty_oxygen`, `empty_water`, `empty_food`, `cold`. A
  reserve is empty when its stock ≤ EPS; `cold` while `power.unheated`. Each true condition adds
  `dt`; when a timer reaches `emptyReserve.graceSeconds`, one astronaut dies (cause = the key) and
  the timer drops by `deathEverySeconds`, so the next death comes one interval later. A false
  condition resets its timer to 0. The victim is the first living astronaut in crew order.
- **Rationale**: FR-028; separate keys give "two empty reserves are twice as deadly"; crew order
  keeps the engine away from `state.rng` (FR-037).
- **Alternatives**: one shared timer; a random victim (would shift Dev A's event schedule).

## R15. Protecting habitats (crew auto-move)

- **Decision**: when extreme cold strikes (`seasonStartedThisStep` in winter with
  `cycle ≥ insulationRequiredFromCycle`) or while a radiation storm is in its active phase, the
  crew step computes the finished habitats with the matching upgrade effect (`insulation` /
  `radiation_shelter`) and moves the living astronauts inside into them, in crew order, up to each
  habitat's `capacity`, updating `habitatId`. Everyone left (outside, or inside without room)
  dies with cause `cold` or `radiation_storm`. Upgrade effects are looked up through
  `upgrades.json` `effect`, never by upgrade id.
- **Rationale**: FR-029–FR-031, option A. Checking every step of the active storm phase (not
  only its first step) also catches an astronaut who walks out during the storm.
- **Alternatives**: assigning habitats when astronauts come inside (an astronaut who never left
  would stay unprotected).

## R16. Win and lose

- **Decision**: `checkOutcome`: all astronauts dead → `lost`, `lostReason = 'crew_lost'`.
  Otherwise, when `isMissionTimeOver`: `won` if at least one astronaut is alive, every vital stock
  ≥ `winTargets(config).reserves`, the finished habitats' capacity ≥ `habitatCapacity`, the base
  is not unheated, and `production ≥ demandAtSwitches` **or** the batteries hold charge > EPS;
  else `lost`, `lostReason = 'targets_missed'`.
- **Rationale**: FR-033–FR-034 with the battery decision. The power check reads the player's
  switch settings directly, so it does not depend on the brownout hysteresis (R6).
- **Alternatives**: reading `power.shed.length === 0` (a type kept off while the batteries recharge
  would fail the check even with charge left).

## R17. Determinism and numbers

- **Decision**: the engine core never reads or writes `state.rng`; ids come from `state.nextId`;
  iteration orders are fixed (creation order, crew order, brownout order). Comparisons with
  thresholds use `EPS`. Stocks are clamped at 0 after every subtraction.
- **Rationale**: FR-037, SC-002: same seed + same actions → same mission, and the engine's choices
  never shift Dev A's event draws.
- **Alternatives**: none.

## R18. Contract v2 packaging

- **Decision**: one `shared/contract-v2` PR before US4, touching only: `types.ts`
  (`not_connected`, `Astronaut.resting`), `store.ts` (`bringInside`, `bringAllInside`; remove
  `shelterAll`), `actions.ts` (stubs returning `not_implemented`; `shelterAll` todos moved under
  `bringAllInside`), `game.ts` (`resting: false`), `schema.ts` + `config.test.ts` (`connectsTo` and
  its design rule), `structures.json` (one line, PO approval), and the constitution amendment
  (Principle V; II.2 battery reading and protecting habitats; II.9 recall and resting; version
  2.2.0). New `it.todo`s for the new behaviors go in the same PR. Exact delta:
  [contracts/contract-v2.md](contracts/contract-v2.md).
- **Rationale**: CONTRIBUTING §2: announce, one `shared/` PR with only contract files, merge fast,
  everyone rebases. Landing it early lets Dev B build the two crew buttons against stubs, as with
  the rest of the contract. CODEOWNERS will ask for caio-nascime (types, schema, `.specify`),
  jvsauma or pedrolmelo (`src/app/`) and athyelbrito (`structures.json`).
- **Alternatives**: changing the contract inside the US4/US5 PRs (the `ownership` check would pass
  for `engine/` paths, but the JSON and the constitution are outside `engine/`, and the other
  areas would see the API late).

## R19. Testing approach

- **Decision**: one file per module, as today. A small `src/engine/testState.ts` (imported only by
  tests) builds hand-made states: `gameAt(cycle, season)`, `withStructures(...)`, `withStock(...)`,
  `withEvents(...)`. Tests read every number from `config` (durations, amounts, factors) and assert
  behavior ("one full season adds the per-season amount", "stock never below zero"), so the POs can
  retune the JSON without breaking tests. `game.test.ts` gets one scripted full-mission test for
  SC-001 and a loose timing check for SC-006.
- **Rationale**: constitution VIII and CLAUDE.md ("describe behavior, not balance numbers").
- **Alternatives**: snapshot tests of whole states (break on every balance change).

## R20. Performance

- **Decision**: plain immutable updates with array `map`/`filter`; no per-step indexes or caches.
  Footprint sets are built only inside placement checks (actions), never per step.
- **Rationale**: ≤ 144 structures and 4 astronauts per step; 19,200 steps per mission is tiny.
- **Alternatives**: memoization or mutable state (complexity with no measurable gain).
