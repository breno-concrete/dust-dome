---

description: "Task list for the engine core (spec 001)"
---

# Tasks: Engine Core — the Living Base Simulation

**Input**: Design documents from `specs/001-engine-core/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. Constitution VIII is test-first and non-negotiable: in every story the test
tasks come first and must fail for the right reason before any implementation task starts. The
`it.todo` lists already in the repo are the agreed test plan; turn each one into a real test
**keeping its title word for word**. Never delete, skip or weaken a test.

**Organization**: one phase per user story; each story ships as one PR from its own `engine/`
branch. The contract delta ships as one `shared/contract-v2` PR (Phase 2) that must be merged
before US4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from [spec.md](spec.md)
- Rule decisions are referenced as R1–R20 ([research.md](research.md))

## Conventions for every test task

- Engine tests are plain Vitest in the node environment (no jsdom).
- Read every number from `config` (`src/config/loadConfig.ts`): season durations, amounts,
  factors, tables, orders. Assert behavior, never a literal balance value.
- Build states with `createGame(config, seed)` and the builders in `src/engine/testState.ts`
  (T002). Steps use `dt = 1` unless the test is about step sizes.
- Comparisons of accumulated floats use `toBeCloseTo` or a relative tolerance of 1 %.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the project, tooling and CI already exist (CLAUDE.md: plans and tasks must not
create them again). Only verify the baseline.

- [x] T001 On an up-to-date `main`, run `npm ci` and `npm run check` (scripts in `package.json`) and confirm everything is green before branching — done on `develop` after the US1 merge (2026-11-14)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the test builders every story uses, and the contract delta that US4 and US5 need.

**⚠️ CRITICAL**: T002 blocks every story's tests. T003–T015 block US4 and US5 only; US1–US3 can
proceed while the contract PR waits for reviews. Merge T003–T015 before 14:00 so jvsauma can wire
the crew buttons.

### Test builders (ship inside the US1 PR, branch `engine/us1-seasons`)

- [x] T002 Create `src/engine/testState.ts`, imported only by `*.test.ts` files, exporting small pure builders over `createGame(config, 1)`: `gameAt(config, cycle, season, secondsIntoSeason = 0)` (briefing closed, clock set), `withStructures(state, config, specs)` where each spec is `{ type, tile, status?: StructureStatus, upgrades?: string[] }` and ids come from `state.nextId`, `onlyStructures(state, config, specs)` (replaces the starting base), `withStock(state, partialStock)`, `withEvents(state, partialActiveEvents)`, `withCrew(state, patches)` (patch astronauts by index); every builder returns a new state

### Contract v2 (branch `shared/contract-v2`, exact delta in [contracts/contract-v2.md](contracts/contract-v2.md))

Extended on 2026-11-14 with the product owners' decisions (demolish, `buildSeconds` per structure, `exposure.resumeAt`, no exposure death); PR #13.

- [ ] T003 Post the contract-v2 announcement in the team group with a link to `specs/001-engine-core/contracts/contract-v2.md` (what changes, who is affected, that everyone rebases after the merge)
- [x] T004 [P] In `src/engine/types.ts` add `'not_connected'` to `ActionError` (after `'out_of_bounds'`) and `resting: boolean` to `Astronaut` with the doc comment "Recalled by the player; takes no job until exposure is back to 0." — also `last_habitat`, `no_room_for_crew`, job `demolish` and log `demolished` (constitution 3.0.0)
- [x] T005 [P] In `src/config/schema.ts` add `connectsTo: z.array(z.string()).default([])` to `StructureDefSchema` with the doc comment "A new structure of this type must share a side with one of these types (if any exists)."
- [x] T006 In `src/config/config.test.ts` add the design rule test "connectsTo only lists structure types that exist" (every id in every structure's `connectsTo` is in `structureIds`); run `npx vitest run src/config/config.test.ts` (depends on T005)
- [x] T007 In `src/config/structures.json` add `"connectsTo": ["habitat"]` to the `habitat` entry only (PO-owned line: athyelbrito approves it in the PR); rerun `npx vitest run src/config/config.test.ts` (depends on T005, T006)
- [x] T008 In `src/engine/actions.ts` remove `shelterAll` and add the stubs `bringInside(state, _config, _astronautId: string): ActionResult` ("Brings one astronaut inside; during a radiation storm, into a sheltered habitat.") and `bringAllInside(state, _config): ActionResult` ("Brings every astronaut outside inside; during the radiation alarm this is Take shelter."), both returning `notYet(state)` (depends on T004)
- [x] T009 In `src/engine/game.ts` `createGame`, add `resting: false` to every astronaut (depends on T004)
- [x] T010 In `src/app/store.ts` replace `shelterAll` in the `GameStore` interface and in the store with `bringInside: (astronautId: string) => void` and `bringAllInside: () => void`, both through `withGame(...)` like the other actions (depends on T008) — `shelterAll` kept as a deprecated alias of `bringAllInside`, because spec 003 already uses it
- [x] T011 In `src/engine/actions.test.ts` rename `describe('shelterAll')` to `describe('bringAllInside')`, keeping its two todos word for word, and add todos: `bringAllInside` › "brings every astronaut outside inside at once" and "rejects with not_allowed when nobody is outside"; new `describe('bringInside')` › "brings one astronaut inside and puts their job back in the queue", "the recalled astronaut rests and takes no job until exposure is back to 0", "during a radiation storm, goes into a sheltered habitat with room", "rejects with not_allowed when the astronaut is dead or already inside"; `describe('build')` › "rejects with not_connected a habitat that shares no side with an existing habitat"; `describe('installUpgrade')` › "rejects with not_allowed an upgrade already installed or queued, or a structure still building"; new `describe('any action')` › "is refused with not_allowed after the mission ended" (depends on T008)
- [x] T012 [P] In `src/engine/placement.test.ts` add todos: "rejects with not_connected a habitat that shares no side with an existing habitat", "a corner contact does not count as connected", "accepts a habitat that shares a side, even with a habitat still under construction", "places the first habitat anywhere when none exists", "other structure types may go on any free tile"
- [x] T013 [P] In `src/engine/crew.test.ts` add todos: "at extreme cold, astronauts inside move into insulated habitats with room and only the rest die", "during an active radiation storm, astronauts outside or without room in a sheltered habitat die (cause \"radiation_storm\")", "two empty reserves have separate countdowns", "the victim of a countdown is the first living astronaut in crew order", "resting ends when exposure is back to 0"
- [x] T014 [P] In `src/engine/jobs.test.ts` add todos: "an astronaut who is resting or at or above exposure.warnAt does not take a job", "no job starts while a radiation storm is on (warning or active)", "a job whose astronaut dies or is recalled goes back to the queue with its remaining time" — with constitution 3.0.0 the rule is "only at or below `exposure.resumeAt`, and not resting"
- [ ] T015 In `.specify/memory/constitution.md` apply the amendment from [contracts/contract-v2.md](contracts/contract-v2.md): version 2.1.0 → 2.2.0, new Sync Impact Report at the top, Principle V connection rule, II.2 item 4 (production plus batteries), II.2/II.9 protecting habitats, II.9 recall one/all and resting, **Last Amended** 2026-11-14; then run `npm run check`, open the `shared/contract-v2` PR (reviewers: caio-nascime, jvsauma or pedrolmelo, athyelbrito), merge on green and post "merged contract-v2, please `git pull --rebase`" — **replaced** by constitution 3.0.0 (PR #12, stacked on #10), which already has the connection rule, the protecting habitats, recall and resting, and drops the power target

**Checkpoint**: builders ready (with US1); after the merge of T003–T015 the new actions exist as
stubs and the new behaviors are listed as todos.

---

## Phase 3: User Story 1 — Seasons and cycles pass, and the commander briefs every season (Priority: P1) 🎯 MVP

**Goal**: a real season clock: rollover with remainder, winter → next cycle, a briefing at every
season start, and a stop after the last winter (FR-001–FR-005; R1, R2).

**Independent Test**: `npx vitest run src/engine/time.test.ts src/engine/game.test.ts` — no other
system needed.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [x] T016 [US1] Create branch `engine/us1-seasons`, then in `src/engine/time.test.ts` turn "moves to the next season when secondsIntoSeason reaches its duration, keeping the remainder" into a test: from `gameAt(config, 1, 'spring', duration − 1)` advance 3 s → season is the next one in `config.seasons.seasons`, `secondsIntoSeason` is 2, `elapsed` grew by 3
- [x] T017 [US1] In `src/engine/time.test.ts` turn "moves from winter to spring of the next cycle" into a test (winter of cycle 1 near its end → spring of cycle 2)
- [x] T018 [US1] In `src/engine/time.test.ts` turn "opens the commander briefing at every season start" into a test: after a rollover, `briefing` equals `{ cycle, season }` of the new season and the last `log` entry has kind `season_start`, `cycle`, `season` and `ref` = the season id
- [x] T019 [US1] In `src/engine/time.test.ts` turn "stops advancing after winter of the last cycle" into a test: from the last winter (`config.seasons.cycles`) 1 s before its end, advance 5 s → cycle and season unchanged, `secondsIntoSeason` equals the winter duration, `elapsed` grew by 1, no briefing opened, and `isMissionTimeOver(state, config)` is true
- [x] T020 [US1] In `src/engine/time.test.ts` add tests "seasonStartedThisStep is true only in the step where the season changed" and "the clock reaches the same season and time whether advanced in 1 s or 0.25 s steps" (US1 scenario 7)
- [x] T021 [P] [US1] In `src/engine/game.test.ts` add tests "createGame logs the first season_start" and "tick does nothing once the mission time is over" (same reference returned)
- [x] T022 [US1] Run `npx vitest run src/engine/time.test.ts src/engine/game.test.ts`, confirm the new tests fail because the behavior is missing (not because of a typo), and commit `test(us1): seasons, cycles and briefings (red)`

### Implementation for User Story 1

- [x] T023 [US1] In `src/engine/time.ts` implement `advanceTime` per R1–R2 and export `seasonDuration(config, season)`, `seasonStartedThisStep(state, dt)` (true when `secondsIntoSeason < dt`) and `isMissionTimeOver(state, config)`; on each rollover set `briefing` and append `{ at, cycle, season, kind: 'season_start', ref: season }` to `log`; clamp at the end of the last winter
- [x] T024 [US1] In `src/engine/game.ts` make `createGame` log the first `season_start`, and make `tick` return `state` unchanged when `isMissionTimeOver(state, config)` (in addition to the existing status and briefing guards)
- [x] T025 [US1] Run `npx vitest run src/engine/time.test.ts src/engine/game.test.ts` (green), refactor, run `npm run check`, commit `feat(us1): seasons, cycles and briefings`, open the PR from `engine/us1-seasons` and merge on green CI — PR #14, squash-merged on 2026-11-14

**Checkpoint**: the clock runs, briefings open every season, the mission stops after cycle 4.

---

## Phase 4: User Story 2 — The base produces and the crew consumes (Priority: P2)

**Goal**: per-second production, converters with partial input, condition factors, crew
consumption (FR-006–FR-010; R3, R4).

**Independent Test**: `npx vitest run src/engine/economy.test.ts`.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [x] T026 [US2] Create branch `engine/us2-economy`, then in `src/engine/economy.test.ts` turn "produces each structure output per second = per-season amount / season duration" into a test: a state with only one mine (`onlyStructures`), crew alive, apply one full season of 1 s steps → hematite and regolith grew by `outputs.min` within 1 %
- [x] T027 [US2] In `src/engine/economy.test.ts` turn "uses the min or max amounts from the power mode of the structure type" into a test (same state, `powerModes.mine = 'max'` → `outputs.max`)
- [x] T028 [US2] In `src/engine/economy.test.ts` turn "produces nothing when the type is off or shed by the brownout" into a test (`powerModes` off, and separately `power.shed` containing the type)
- [x] T029 [US2] In `src/engine/economy.test.ts` turn "consumes inputs and stops producing when an input runs out" into a test: an iron refinery with less hematite than one step needs → hematite ends at exactly 0, iron grows in proportion to the hematite used, no stock below 0
- [x] T030 [US2] In `src/engine/economy.test.ts` turn "applies damaged x damagedFactor, clogged x cloggedFactor, short_circuit x 0" into a test, including that the factor also scales a converter's inputs (R4)
- [x] T031 [US2] In `src/engine/economy.test.ts` turn "ignores structures that are still being built" into a test
- [x] T032 [US2] In `src/engine/economy.test.ts` turn "living astronauts consume oxygen, water and food per season" into a test (one full season with no producers → each vital stock dropped by `needs × living crew`; a dead astronaut consumes nothing)
- [x] T033 [US2] In `src/engine/economy.test.ts` add the test "converters that share an input are served in reverse brownout order" (repair workshop and steel factory with iron for only one of them: the one later in `mission.brownoutOrder` gets it first)
- [x] T034 [US2] Run `npx vitest run src/engine/economy.test.ts`, confirm red for the right reason, commit `test(us2): production and consumption (red)`

### Implementation for User Story 2

- [x] T035 [US2] In `src/engine/economy.ts` implement `applyProduction(state, config, dt)` per R3–R4: per-step amount `= perSeason × dt / seasonDuration`; skip `building`, `off` and shed types; condition factor from `mission.damage` scales inputs and outputs (`short_circuit` = 0); process producers without inputs, then converters by type in reverse `mission.brownoutOrder` then creation order (fraction `f = min(1, available / need)`), then crew consumption from `mission.needs`; clamp every stock at 0
- [ ] T036 [US2] Run `npx vitest run src/engine/economy.test.ts` (green), refactor, `npm run check`, commit `feat(us2): production and consumption`, open the PR from `engine/us2-economy`, merge on green

**Checkpoint**: reserves rise and fall through the seasons.

---

## Phase 5: User Story 3 — Power keeps the base alive (Priority: P3)

**Goal**: production, demand with heating tables, batteries and the brownout without flicker
(FR-011–FR-016; R5–R7).

**Independent Test**: `npx vitest run src/engine/power.test.ts`.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T037 [US3] Create branch `engine/us3-power`, then in `src/engine/power.test.ts` turn "solar panels produce kwBySeason x the active events solarFactor" into a test, including two active events whose factors multiply
- [X] T038 [US3] In `src/engine/power.test.ts` turn "solar panels produce 0 in winter from seasons.winterDarknessFromCycle" into a test (winter of that cycle → 0; winter of cycle 1 → `kwBySeason.winter`)
- [X] T039 [US3] In `src/engine/power.test.ts` turn "a damaged panel produces x damagedFactor" into a test
- [X] T040 [US3] In `src/engine/power.test.ts` turn "the reactor produces its constant kW in every season and event" into a test (all four seasons, cycle 3, with darkness and a storm active)
- [X] T041 [US3] In `src/engine/power.test.ts` turn "consumers draw 0 (off), minKw (min) or maxKw (max)" into a test, plus "structures under construction and short-circuited structures draw nothing"
- [X] T042 [US3] In `src/engine/power.test.ts` turn "heatingKw by cycle and season replaces minKw; max adds maxKw - minKw" into a test (greenhouse or ice melter at min and max, habitat always at min)
- [X] T043 [US3] In `src/engine/power.test.ts` turn "an insulated habitat uses insulatedHeatingKw" into a test (upgrade found through `upgrades.json` `effect: "insulation"`)
- [X] T044 [US3] In `src/engine/power.test.ts` turn "surplus charges batteries up to their capacity; deficit drains them" into a test (capacity = sum of finished battery banks' `capacityEu`; a bank under construction stores nothing; charge stays within `[0, capacity]`)
- [X] T045 [US3] In `src/engine/power.test.ts` turn "with batteries empty, sheds types in mission.brownoutOrder until demand fits" into a test
- [X] T046 [US3] In `src/engine/power.test.ts` turn "never sheds habitats and flags unheated when even their heating cannot be met" into a test
- [X] T047 [US3] In `src/engine/power.test.ts` add tests "a shed type comes back when production alone covers it", "every shed type comes back when the batteries are full", "a step with batteries above empty does not shed" and "logs power_shed only when the shed set changes" (R6)
- [X] T048 [P] [US3] In `src/engine/game.test.ts` add the test "createGame already has a power report" (production and demand of the starting base are above 0, batteries unchanged)
- [X] T049 [US3] Run `npx vitest run src/engine/power.test.ts src/engine/game.test.ts`, confirm red, commit `test(us3): power, heating, batteries and brownout (red)`

### Implementation for User Story 3

- [ ] T050 [US3] In `src/engine/power.ts` implement `computePower(state, config, dt)` per R5–R7 and export `demandAtSwitches(state, config)` (demand before any brownout) and `batteryCapacity(state, config)`; keep `power.shed` between steps, clear it when the batteries are full, restore in reverse order while production alone covers, shed in `mission.brownoutOrder` when the batteries are empty, set `unheated`, integrate `batteryEu` with `dt`, append `power_shed` to `log` only on a change
- [ ] T051 [US3] In `src/engine/game.ts` pass `dt` to `computePower` in `tick`, and make `createGame` compute the initial report with `computePower(state, config, 0)`
- [ ] T052 [US3] Run `npx vitest run src/engine/power.test.ts src/engine/game.test.ts` (green), refactor, `npm run check`, commit `feat(us3): power, heating, batteries and brownout`, open the PR from `engine/us3-power`, merge on green

**Checkpoint**: the HUD power meter moves; winter without enough power sheds and then unheats.

---

## Phase 6: User Story 4 — Build, upgrade, switch, repair and clean, with astronauts working outside (Priority: P4)

**Goal**: every player decision and the external-job system, including the habitat connection
rule (FR-017–FR-025; R8–R11). **Requires `shared/contract-v2` (T003–T015) merged.**

**Independent Test**: `npx vitest run src/engine/actions.test.ts src/engine/jobs.test.ts src/engine/placement.test.ts`.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [ ] T053 [P] [US4] Create branch `engine/us4-actions-jobs` from a `main` that has contract-v2, then in `src/engine/placement.test.ts` turn the five connection todos from T012 into tests (sides vs corners, a habitat under construction counts, the first habitat anywhere, other types anywhere)
- [ ] T054 [US4] In `src/engine/actions.test.ts` turn the `build` todos into tests: "rejects with not_enough_resources when the stock does not cover the cost", "rejects with the placementError of the tile (out_of_bounds, tile_blocked)", "rejects with external_jobs_blocked during winter darkness" (an active event with `blocksExternalJobs`), "deducts the cost, adds the structure as \"building\" and queues a build job", and "rejects with not_connected a habitat that shares no side with an existing habitat"
- [ ] T055 [US4] In `src/engine/actions.test.ts` turn the `installUpgrade` todos into tests: "only allows upgrades listed in the structure definition", "deducts the cost and queues an upgrade job", "rejects with not_allowed an upgrade already installed or queued, or a structure still building"
- [ ] T056 [US4] In `src/engine/actions.test.ts` turn the `setPowerMode` todos into tests: "changes the mode of a switchable type", "rejects with not_allowed for habitats, panels, batteries and the reactor"
- [ ] T057 [US4] In `src/engine/actions.test.ts` turn the `startRepair` todos into tests: "rejects without enough repair parts" (`not_enough_resources`, parts from `mission.repair.parts`), "a failed QTE spends the parts and changes nothing else" (`ok: true`), "a successful QTE spends the parts and queues a repair job"
- [ ] T058 [US4] In `src/engine/actions.test.ts` turn the `clean` todos into tests: "queues a clean job for a clogged structure", "rejects with not_allowed during an active dust storm" (`dust_storm` and `global_dust_storm`)
- [ ] T059 [US4] In `src/engine/actions.test.ts` turn "is refused with not_allowed after the mission ended" into a test covering every action (state with `status: 'won'`)
- [ ] T060 [P] [US4] In `src/engine/jobs.test.ts` turn into tests: "a queued job takes a free living astronaut, who goes outside", "at most one active job per living astronaut; the rest wait in the queue", "an astronaut who is resting or at or above exposure.warnAt does not take a job", "no job starts while a radiation storm is on (warning or active)"; the astronaut with the lowest exposure is chosen first, ties in crew order
- [ ] T061 [US4] In `src/engine/jobs.test.ts` turn into tests: "a build job finishes after buildSeconds and the structure becomes active", "an upgrade job adds the upgrade to the structure", "a repair job restores damaged or short_circuit structures", "a clean job restores clogged structures and cannot run during an active dust storm" (durations from `mission.jobs`; log kinds `built`, `upgrade_installed`, `repaired`, `cleaned`)
- [ ] T062 [US4] In `src/engine/jobs.test.ts` turn into tests: "jobs pause while an event blocks external jobs, and resume after", "the astronaut goes back inside when the job ends", "a job whose astronaut dies or is recalled goes back to the queue with its remaining time"
- [ ] T063 [US4] Run `npx vitest run src/engine/actions.test.ts src/engine/jobs.test.ts src/engine/placement.test.ts`, confirm red, commit `test(us4): actions and external jobs (red)`

### Implementation for User Story 4

- [ ] T064 [P] [US4] In `src/engine/placement.ts` add the connection rule to `placementError` per R10: for a type with non-empty `connectsTo`, return `'not_connected'` unless a footprint tile shares a side (|dx| + |dy| = 1) with a tile of an existing structure (any status) whose type is listed; skip the rule when no such structure exists; keep `out_of_bounds` and `tile_blocked` first
- [ ] T065 [US4] In `src/engine/jobs.ts` export the helpers `externalJobsBlocked(state)` (any active event with `blocksExternalJobs`), `dustStormActive(state)` (active `dust_storm` or `global_dust_storm`) and `jobSeconds(config, kind)`, then implement `updateJobs(state, config, dt)` per R11 in three passes: blocks (active → paused, astronaut inside; block over → paused → queued), progress (apply effect, log, astronaut inside, remove the job), assignment (creation order; eligible astronaut alive, inside, no job, not `resting`, exposure < `mission.exposure.warnAt`; lowest exposure first, ties crew order; nothing starts during a block or while `radiationStorm` is set; clean jobs wait during a dust storm)
- [ ] T066 [US4] In `src/engine/actions.ts` implement `build`, `installUpgrade`, `setPowerMode`, `startRepair` and `clean` per R9 (refusal order: mission over → `not_allowed`; then the per-action checks; pay costs from `stock`; new ids from `nextId`; jobs with `remainingSeconds = jobSeconds(...)`, `status: 'queued'`, `astronautId: null`) (depends on T064, T065)
- [ ] T067 [US4] Run `npx vitest run src/engine/actions.test.ts src/engine/jobs.test.ts src/engine/placement.test.ts` (green), refactor, `npm run check`, commit `feat(us4): actions and external jobs`, open the PR from `engine/us4-actions-jobs`, merge on green

**Checkpoint**: the player can grow the base; astronauts go out and come back.

---

## Phase 7: User Story 5 — Astronauts can die, and the mission is won or lost (Priority: P5)

**Goal**: exposure, death countdowns, extreme cold, radiation storm, recall and shelter,
protecting habitats, win and lose, and the fixed tick order (FR-026–FR-037; R12–R16).
**Requires contract-v2.**

**Independent Test**: `npx vitest run src/engine/crew.test.ts src/engine/outcome.test.ts src/engine/actions.test.ts src/engine/game.test.ts`.

### Tests for User Story 5 ⚠️ (write first, must fail)

- [ ] T068 [US5] Create branch `engine/us5-crew-outcome`, then in `src/engine/crew.test.ts` turn into tests: "exposure fills to 1 after maxShareOfSeason of the current season spent outside", "exposure recovers inside a habitat at recoveryRate of the fill speed", "an astronaut at exposure 1 dies (log cause \"exposure\")", "resting ends when exposure is back to 0"
- [ ] T069 [US5] In `src/engine/crew.test.ts` turn into tests: "an empty vital reserve kills one astronaut after graceSeconds, then one every deathEverySeconds" (log cause `empty_oxygen` / `empty_water` / `empty_food`; countdown resets when the reserve is above 0), "an unheated base kills the same way (cause \"cold\")", "two empty reserves have separate countdowns", "the victim of a countdown is the first living astronaut in crew order"
- [ ] T070 [US5] In `src/engine/crew.test.ts` turn into tests: "from insulationRequiredFromCycle, at winter start astronauts in uninsulated habitats die" and "at extreme cold, astronauts inside move into insulated habitats with room and only the rest die" (crew in an uninsulated habitat next to an insulated one with room → nobody dies; `habitatId` updated)
- [ ] T071 [US5] In `src/engine/crew.test.ts` turn "during an active radiation storm, astronauts outside or without room in a sheltered habitat die (cause \"radiation_storm\")" into a test, including that astronauts inside move into a sheltered habitat with room and survive
- [ ] T072 [P] [US5] In `src/engine/actions.test.ts` turn the `bringInside` and `bringAllInside` todos into tests, including "moves every astronaut outside into a habitat with a radiation shelter" and "pauses active jobs, which resume after the storm" (kept from `shelterAll`)
- [ ] T073 [P] [US5] In `src/engine/outcome.test.ts` turn into tests: "lost when every astronaut is dead" (`lostReason: 'crew_lost'`), "won when the last winter ends with reserves, habitat capacity and power targets met", "lost with reason \"targets_missed\" when the last winter ends without the targets"; add "the batteries count for the power target" (production below demand at the end, batteries with charge → won)
- [ ] T074 [US5] In `src/engine/game.test.ts` turn "runs time -> events -> power -> production -> jobs -> crew -> outcome in order" into a test: `vi.mock` each of `./time`, `./events/events`, `./power`, `./economy`, `./jobs`, `./crew`, `./outcome` with pass-through functions that push their name into an array, call `tick` once with the briefing closed, and assert the order
- [ ] T075 [US5] Run `npx vitest run src/engine/crew.test.ts src/engine/outcome.test.ts src/engine/actions.test.ts src/engine/game.test.ts`, confirm red, commit `test(us5): crew, deaths, win and lose (red)`

### Implementation for User Story 5

- [ ] T076 [US5] In `src/engine/crew.ts` implement `updateCrew(state, config, dt)` per R13–R15: exposure fill and recovery with the current season's duration, clamp `[0, 1]`, clear `resting` at 0, death at full; `dangerTimers` keys `empty_oxygen`, `empty_water`, `empty_food`, `cold` (grace, then one death every interval, reset when false); extreme cold at `seasonStartedThisStep` in winter from `insulationRequiredFromCycle`; radiation storm active phase; protecting habitats found through upgrade `effect`, filled in crew order up to `capacity`; on death set `alive: false`, `jobId: null`, put the job back in the queue and log `death` with the cause
- [ ] T077 [US5] In `src/engine/actions.ts` implement `bringInside` and `bringAllInside` per R12 (no storm: current habitat and `resting: true`; storm in warning or active phase: sheltered habitat with room, else `not_allowed`; the job goes back to `queued` keeping `remainingSeconds`)
- [ ] T078 [US5] In `src/engine/outcome.ts` implement `checkOutcome(state, config)` per R16 using `winTargets`, finished habitats' `capacity`, `power.unheated`, `demandAtSwitches` and `batteryEu`; set `status` and `lostReason` (`crew_lost` / `targets_missed`)
- [ ] T079 [US5] Run `npx vitest run src/engine/crew.test.ts src/engine/outcome.test.ts src/engine/actions.test.ts src/engine/game.test.ts` (green), refactor, `npm run check`, commit `feat(us5): crew, deaths, win and lose`, open the PR from `engine/us5-crew-outcome`, merge on green

**Checkpoint**: a full mission can be won or lost; every death has a cause in the log.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: end-to-end proof of the success criteria and cleanup. Branch `engine/polish`.

- [ ] T080 In `src/engine/game.test.ts` add the scripted full-mission tests from [quickstart.md](quickstart.md): a prepared base (enough habitats, insulation, shelter, reactor or batteries, reserves) wins after 4 cycles at `dt = 0.25`; the untouched starting base loses; the same script twice with the same seed gives deep-equal states (SC-001, SC-002)
- [ ] T081 In `src/engine/game.test.ts` add a loose timing check that the full mission at `dt = 0.25` finishes in under 2 s (SC-006); if CI proves flaky, keep it as a printed measurement instead of an assertion
- [ ] T082 [P] Remove the stale `TODO(Breno, …)` header comments and confirm with a search that no `not_implemented` result is left in `src/engine/actions.ts`
- [ ] T083 Run the browser check from `specs/001-engine-core/quickstart.md` (`npm run dev`, play at 4× until the end screen) and `npm run check`; tell jvsauma and caio-nascime which log causes and fields are final for the HUD and the debrief

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: T002 blocks every story's tests and ships in the US1 PR.
  T003–T015 (`shared/contract-v2`) block **US4 and US5 only**.
- **US1 → US2 → US3**: sequential for one developer; each needs the previous one merged only
  because they edit `game.ts` (US1, US3) and share the tick pipeline; their tests are independent.
- **US4**: after contract-v2. Independent of US2/US3 behavior (its tests build states by hand).
- **US5**: after contract-v2 and US4 (`jobs.ts` helpers, job re-queue) and US3
  (`demandAtSwitches`).
- **Polish**: after US5.

### Within each story

1. Test tasks first; the red run task must show failures for the right reason.
2. Implementation tasks; the green run task; refactor; `npm run check`.
3. One PR per story, merged on green CI (`check` + `ownership`).

### Parallel opportunities

- T004, T005 (different contract files) and T012, T013, T014 (different test files) inside the
  contract-v2 PR.
- Contract-v2 (shared/) runs alongside US1–US3 (engine/): different branches and files.
- In US1: T021 (`game.test.ts`) alongside T016–T020 (`time.test.ts`).
- In US3: T048 (`game.test.ts`) alongside T037–T047 (`power.test.ts`).
- In US4: T053 (`placement.test.ts`) and T060 (`jobs.test.ts`) alongside the `actions.test.ts`
  tasks; T064 (`placement.ts`) alongside T065 (`jobs.ts`).
- In US5: T072 (`actions.test.ts`) and T073 (`outcome.test.ts`) alongside T068–T071
  (`crew.test.ts`).

---

## Parallel Example: User Story 4

```bash
# Tests in different files at the same time:
Task: "T053 placement connection tests in src/engine/placement.test.ts"
Task: "T060 job assignment tests in src/engine/jobs.test.ts"
Task: "T054 build action tests in src/engine/actions.test.ts"

# Then the two independent implementations:
Task: "T064 connection rule in src/engine/placement.ts"
Task: "T065 updateJobs and helpers in src/engine/jobs.ts"
# T066 (actions.ts) waits for both.
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. T001, then T002 + US1 (T016–T025) in `engine/us1-seasons`.
2. **Stop and validate**: seasons roll, briefings open, the game stops after cycle 4.
3. Open the contract-v2 PR (T003–T015) right after, so reviews run while you do US2.

### Incremental delivery (brief targets)

| PR | Target |
|---|---|
| `engine/spec` (spec, plan, tasks) | now |
| `engine/us1-seasons` | as soon as possible (brief target 11:30) |
| `shared/contract-v2` | before 14:00 |
| `engine/us2-economy` | 13:00 checkpoint |
| `engine/us3-power` | 15:00 |
| `engine/us4-actions-jobs` | 17:00 |
| `engine/us5-crew-outcome` | 19:00 checkpoint |
| `engine/polish` | before the Sunday 14:00 code freeze |

Each PR stays under ~300 changed lines; split a story's PR in two (tests + implementation of
one module each) if it grows beyond that.

---

## Notes

- `[P]` = different files and no dependency on an unfinished task.
- Run only the story's test files while iterating; `npm run check` before every PR.
- Read the tests before accepting them: they are the spec in code (CONTRIBUTING §4).
- Never edit another area's tests or files; anything needed from another area becomes a
  contract change request.
