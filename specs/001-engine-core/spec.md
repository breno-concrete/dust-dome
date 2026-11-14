# Feature Specification: Engine Core — the Living Base Simulation

**Feature Branch**: `engine/spec`

**Created**: 2026-11-14

**Status**: Draft

**Updated**: 2026-11-14, for constitution 3.0.0 (product owners' decisions): power is not a win
target, exposure never kills (automatic return at the warning level, work again at the resume
level), build time per structure type, demolition with refund, thermal insulation on any
structure that takes it. Contract: [contracts/contract-v2.md](contracts/contract-v2.md).

**Input**: User description: "SPECIFY_FEATURE_DIRECTORY=specs/001-engine-core Read specs/001-engine-core/brief.md and the constitution Part II, and specify it."

**Rules of the game**: constitution Part II (II.2–II.10). This spec references those sections
instead of repeating their tables. Every number mentioned below is a v1 balance value owned by
the product owners and lives in the game content files; behavior must follow the content files,
not the numbers quoted here.

**Terms used in this spec**

- **Game second**: one second of game time. Speed controls (1× / 2× / 4× / pause) only change how
  many game seconds pass per real second; the simulation itself only knows game seconds.
- **Step**: one advance of the simulation by a number of game seconds (normally about one).
- **Mission**: one play-through from cycle 1 spring to the end of winter of the last cycle, or to
  the death of the whole crew.
- **The screens**: the 2D UI, the isometric scene, the debrief and the sources screen, built by
  the other areas. They read the mission state and call the player actions described here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Seasons and cycles pass, and the commander briefs every season (Priority: P1)

The player sees Martian time pass in the southern-hemisphere order: spring, summer, autumn,
winter, for four cycles (four Martian years). At the start of every season the game stops and
Commander Vega's briefing opens; the clock only runs again after the player closes it. When
winter of the last cycle ends, time stops and the mission is decided.

**Why this priority**: every other rule (per-season production, heating tables, events, win
check) depends on knowing the current cycle and season. A clock with briefings is the smallest
slice that the UI can already show.

**Independent Test**: start a mission, close the briefing, advance game time across season and
cycle boundaries, and check the season, the cycle, the briefing and the final stop. No other
system is needed.

**Acceptance Scenarios**:

1. **Given** a mission that just started, **Then** it is cycle 1, spring, 0 game seconds, and the
   spring briefing of cycle 1 is open.
2. **Given** a briefing is open, **When** game time is advanced, **Then** the mission state does
   not change at all.
3. **Given** the clock is running, **When** the time spent in the current season reaches that
   season's configured duration, **Then** the next season starts and the leftover seconds of the
   step count toward the new season (no time is lost or counted twice).
4. **Given** winter of a cycle that is not the last, **When** winter ends, **Then** spring of the
   next cycle starts.
5. **Given** any season starts, **Then** the briefing for that cycle and season opens and the
   clock waits until the player closes it.
6. **Given** winter of the last cycle, **When** it ends, **Then** time stops advancing, no new
   season starts and the mission result is decided (User Story 5).
7. **Given** the clock is running, **When** a total amount of game time is advanced, **Then** the
   total elapsed time grows by exactly that amount, whatever the step sizes were.

---

### User Story 2 — The base produces and the crew consumes (Priority: P2)

Mines dig hematite and regolith, the oxygen generator makes oxygen, the ice melter makes water,
and the level 2 factories turn materials into iron, food, repair parts and steel. The four
astronauts breathe, drink and eat. Reserves change smoothly every second, and each structure's
total over a season matches its per-season amount (II.4–II.6, II.8).

**Why this priority**: production and consumption are the heart of every trade-off (principle I).
With US1 they make the first playable loop: watch reserves rise and fall through the seasons.

**Independent Test**: set up a base with chosen structures, power settings and stock, advance a
known amount of game time, and compare the stock with the per-season amounts from the content
files.

**Acceptance Scenarios**:

1. **Given** a finished producing structure whose type is set to Base (or Max), **When** game time
   passes, **Then** every game second it adds its per-season Base (or Max) amount divided by the
   current season's duration, so one full season adds exactly the per-season amount.
2. **Given** a structure type that is switched Off, or switched off by the brownout (US3),
   **Then** its structures produce nothing and consume nothing.
3. **Given** a converter (iron refinery, greenhouse, repair workshop, steel factory) with its input
   in stock, **Then** it consumes the input at its per-season rate and produces its output in
   proportion.
4. **Given** a converter whose input runs out, **Then** it produces only what the remaining input
   allows, and no stock ever goes below zero.
5. **Given** a structure that is damaged, clogged or short-circuited (II.10), **Then** its output
   is multiplied by the configured damaged factor, the configured clogged factor, or zero.
6. **Given** a structure still under construction, **Then** it produces and consumes nothing.
7. **Given** living astronauts, **Then** each consumes oxygen, water and food at the configured
   per-person, per-season amounts, spread over the season; dead astronauts consume nothing.

---

### User Story 3 — Power keeps the base alive (Priority: P3)

Solar panels and the reactor produce power; every consumer draws power according to its type's
switch; the habitat, the greenhouse and the ice melter need more power to stay warm in cold
seasons. Surplus charges the batteries, deficit drains them, and when the batteries are empty the
base switches structure types off in a fixed order, keeping the habitat for last (II.7).

**Why this priority**: power is the first of the three core systems and the main source of
difficulty; it decides which structures can run. It builds on the season clock (US1) and feeds
production (US2).

**Independent Test**: set up a base, a season, active events and a battery charge, compute one
step, and check production, demand, balance, battery charge, the switched-off types and the
"unheated" flag.

**Acceptance Scenarios**:

1. **Given** finished solar panels, **Then** each produces its configured output for the current
   season, multiplied by the solar factor of every active event.
2. **Given** winter from the configured darkness cycle onward (cycles 2–4), **Then** solar panels
   produce nothing.
3. **Given** a damaged solar panel, **Then** it produces its output multiplied by the configured
   damaged factor.
4. **Given** a finished reactor, **Then** it produces its constant output in every season and
   during every event.
5. **Given** a consumer type switched Off, Base or Max, **Then** each of its finished structures
   draws nothing, its Base draw, or its Max draw.
6. **Given** a habitat, a greenhouse or an ice melter, **Then** it draws the heating value of its
   table for the current cycle and season instead of its plain Base draw; at Max, the greenhouse
   and the ice melter add the configured Max add-on.
7. **Given** a habitat or a greenhouse with thermal insulation, **Then** it draws the value of its
   insulated heating table.
8. **Given** production is higher than demand, **Then** the surplus charges the batteries
   (1 kW for 1 game second = 1 energy unit, no losses) up to the total capacity of the finished
   battery banks; **Given** demand is higher, **Then** the batteries cover the difference until
   they are empty.
9. **Given** the batteries cannot cover the deficit, **Then** structure types are switched off in
   the configured brownout order until demand fits, and they come back on by themselves as soon
   as power allows.
10. **Given** a brownout, **Then** habitats are never switched off; **Given** even the habitats'
    heating cannot be met, **Then** the base is marked "unheated" (deaths in US5).
11. **Given** any step, **Then** the current production, demand, balance, battery charge,
    switched-off types and "unheated" flag are available for the HUD.

---

### User Story 4 — Build, upgrade, switch, repair and clean, with astronauts working outside (Priority: P4)

The player builds structures on free tiles (a new habitat module must touch the side of an existing
habitat module, so the habitats form one connected base), installs upgrades, sets the Off / Base /
Max switch of
each structure type, repairs broken structures after the bolt minigame, cleans clogged ones and
demolishes structures (or cancels a construction) to get back what they paid. Building,
upgrading, repairing, cleaning and demolishing are external jobs: each one takes an astronaut
outside for a while, and there are never more jobs running than astronauts alive (II.6, II.9,
II.10).

**Why this priority**: these are all the player's decisions. Without them the base cannot grow,
but US1–US3 can already be tested with hand-made bases, so this story comes after them.

**Independent Test**: call each action on hand-made mission states (enough or too few materials,
free or blocked tiles, winter darkness, a dust storm), then advance game time and check the jobs,
the astronauts and the structures.

**Acceptance Scenarios — actions**:

1. **Given** the stock does not cover a structure's cost, **When** the player builds it,
   **Then** the action is refused with "not enough resources" and nothing changes.
2. **Given** a tile outside the grid or already occupied, **When** the player builds there,
   **Then** the action is refused with "out of bounds" or "tile blocked" and nothing changes.
   **Given** a new habitat module none of whose tiles shares a side with a tile of an existing
   habitat module on the 12 × 12 grid (touching only at a corner does not count), **When** the
   player builds it, **Then** the action is refused with "not connected"; **Given** at least one
   shared side, **Then** the placement is valid.
3. **Given** an event is blocking external jobs (winter darkness), **When** the player builds,
   **Then** the action is refused with "external jobs blocked".
4. **Given** a valid build, **Then** the cost is taken from the stock, the structure appears on
   its tiles as "under construction", and a build job joins the queue.
5. **Given** an upgrade that is not allowed for that structure (not listed for its type, already
   installed or queued, or the structure is still under construction), **When** the player
   installs it, **Then** the action is refused with "not allowed".
6. **Given** a valid upgrade, **Then** the cost is taken from the stock and an upgrade job joins
   the queue; the upgrade's effect starts only when the job finishes.
7. **Given** a switchable structure type, **When** the player sets its switch, **Then** every
   structure of that type uses the new setting.
8. **Given** a habitat, solar panel, battery bank or reactor, **When** the player tries to set a
   switch for it, **Then** the action is refused with "not allowed".
9. **Given** a structure that is neither damaged nor short-circuited, **When** the player starts a
   repair, **Then** it is refused with "not allowed"; **Given** fewer repair parts than a repair
   costs, **Then** it is refused with "not enough resources".
10. **Given** the player failed the bolt minigame, **Then** the repair parts are spent and nothing
    else changes; the player may try again.
11. **Given** the player won the bolt minigame, **Then** the repair parts are spent and a repair
    job joins the queue.
12. **Given** a clogged structure, **When** the player cleans it, **Then** a clean job joins the
    queue and no parts are spent; **Given** a dust storm is active, **Then** cleaning is refused
    with "not allowed".
13. **Given** any refused action, **Then** the mission state is unchanged and the refusal reason
    is returned so the screens can explain it; no action ever crashes the game.

**Acceptance Scenarios — jobs**:

14. **Given** a queued job and a free living astronaut inside who is not resting and whose
    exposure is at or below the configured resume level (25%), **Then** the astronaut takes the
    job and goes outside.
15. **Given** more queued jobs than free living astronauts, **Then** at most one job runs per
    living astronaut and the others wait in the order they were requested.
16. **Given** a running build job, **When** the build time of the structure's type has passed
    (30 / 40 / 60 s by level), **Then** the structure becomes active and starts counting for
    production, power and capacity.
17. **Given** a running upgrade job, **When** it finishes, **Then** the upgrade is installed on
    the structure.
18. **Given** a running repair job, **When** it finishes, **Then** the damaged or short-circuited
    structure becomes active again.
19. **Given** a running clean job, **When** it finishes, **Then** the clogged structure becomes
    active again; while a dust storm is active, clean jobs wait.
20. **Given** an event starts blocking external jobs, **Then** running jobs pause, their
    astronauts go back inside, and each job keeps its remaining time; **When** the block ends,
    **Then** the jobs resume.
21. **Given** a job finishes, **Then** its astronaut goes back inside.

**Acceptance Scenarios — demolition** (II.6):

22. **Given** a finished structure or one under construction, **When** the player demolishes it,
    **Then** a demolish job joins the queue and nothing is refunded yet.
23. **Given** a running demolish job, **When** the configured demolish time has passed, **Then**
    the structure is removed, the configured share (100%) of its cost and of its upgrades returns
    to the stock whatever its condition, and the log records the demolition; a structure under
    construction also loses its build job.
24. **Given** the last habitat module, **When** the player demolishes it, **Then** the action is
    refused with "last habitat"; **Given** a habitat whose occupants do not fit in the other
    finished habitats, **Then** it is refused with "no room for crew"; **Given** a habitat whose
    removal would leave another habitat without a shared side with the rest, **Then** it is
    refused with "not connected".
25. **Given** an event is blocking external jobs (winter darkness), **When** the player
    demolishes, **Then** the action is refused with "external jobs blocked".

---

### User Story 5 — Astronauts can die, and the mission is won or lost (Priority: P5)

Astronauts outside build up radiation exposure and recover inside; exposure never kills,
because at the warning level the astronaut stops and comes back inside by themselves. Astronauts
die from an empty reserve or a cold base, from the extreme cold of the late winters without
thermal insulation, and from radiation storms without a shelter. When the last astronaut dies
the mission is lost; when winter of the last cycle ends, the mission is won if the base is ready
for the colonists (reserves and room for everyone; power is not a target) and lost otherwise
(II.2, II.9).

**Why this priority**: it turns the simulation into a game with stakes and an ending, and it
gives the debrief every cause of death. It depends on all the previous stories.

**Independent Test**: set up hand-made states (an astronaut outside for a long time, an empty
reserve, an unheated base, winter of cycle 3 with an uninsulated habitat, a radiation storm
starting, the end of the last winter with and without the targets) and check deaths, log entries
and the mission result.

**Acceptance Scenarios**:

1. **Given** an astronaut outside, **Then** their exposure grows at a rate that would take it
   from empty to full in the configured share (25%) of the current season's duration.
2. **Given** an astronaut inside a habitat, **Then** their exposure falls at the configured
   recovery rate (half the speed it grows outside), never below empty.
3. **Given** an astronaut working outside whose exposure reaches the configured warning level
   (75%), **Then** they stop and go back inside at once, and their job goes back to the queue with
   its remaining time (another free astronaut may continue it); exposure never reaches full and
   nobody dies of it.
4. **Given** a vital reserve (oxygen, water or food) is at zero, **When** the configured grace
   period has passed, **Then** one astronaut dies, then one more every configured interval while
   the reserve stays at zero; the log records which reserve ran out; the countdown restarts from
   zero once the reserve is above zero again.
5. **Given** the base is unheated, **Then** astronauts die by the same rule, with the cause "cold".
6. **Given** winter starts in a cycle from the configured insulation cycle onward (cycles 3–4),
   **Then** the astronauts inside move into finished habitats with thermal insulation, up to their
   capacity, and every astronaut who does not fit dies, with the cause "cold". For example, with
   the crew living in an uninsulated habitat and an insulated habitat with room next to it,
   nobody dies.
7. **Given** a radiation storm hits, **Then** the astronauts inside move into finished habitats
   with a radiation shelter, up to their capacity, and every astronaut outside or who does not
   fit dies, with the cause "radiation storm".
8. **Given** an astronaut outside, **When** the player brings that one astronaut inside,
   **Then** they go inside at once, their job goes back to the queue with its remaining time
   (another free astronaut may take it), and they take no new job until their exposure is back
   to empty.
9. **Given** astronauts outside, **When** the player brings everyone inside, **Then** every
   astronaut goes inside at once, by the same rule as scenario 8.
10. **Given** the radiation alarm is on, **When** the player taps "Take shelter" (everyone) or
    sends one astronaut to shelter, **Then** those astronauts move into habitats with a radiation
    shelter, up to their capacity, their running jobs pause, and they take no job until the storm
    ends; **When** the storm ends, **Then** the jobs resume.
11. **Given** the last living astronaut dies, **Then** the mission is lost because the whole crew
    died, and time stops.
12. **Given** winter of the last cycle ends, **When** at least one astronaut is alive, the
    oxygen, food and water reserves reach the win targets and the finished habitats house the
    target number of people, **Then** the mission is won. Power is not a target: for example, a
    base in deficit at that moment still wins.
13. **Given** winter of the last cycle ends without all of those targets, **Then** the mission is
    lost with the reason "targets missed".
14. **Given** any step, **Then** the simulation runs in this fixed order: time, events, power,
    production, jobs, crew, outcome.
15. **Given** the same seed and the same player actions at the same game times, **Then** the
    mission plays out identically.

---

### Edge Cases

- A step that crosses a season boundary carries its leftover seconds into the new season and opens
  that season's briefing; one step never skips a season or a briefing.
- Battery charge never goes above the total capacity of the finished battery banks or below zero.
  A battery bank under construction stores nothing.
- No stock ever goes below zero, from production, consumption, costs or repairs.
- When several converters need the same input (for example the repair workshop and the steel
  factory both use iron) and there is not enough for all, they are served in a fixed order (the
  reverse of the brownout order, most vital first), so the result is always the same.
- Two death conditions at the same time (for example oxygen and food both empty) each have their
  own countdown, so deaths can come faster.
- Who dies from an empty reserve or the cold is decided by a fixed rule (crew order), never by the
  random generator, so the event schedule of the same seed does not change.
- An astronaut who dies during a job leaves the job in the queue with its remaining time; another
  astronaut can finish it.
- A habitat counts toward capacity, heating and protection only once it is finished.
- An astronaut takes a new job only when their exposure is at or below the resume level, so
  someone who came back at the warning level rests first.
- Demolishing a structure drops its other queued jobs; upgrades paid but not installed yet are
  refunded too, while repair parts already spent are not.
- A habitat under construction counts for the connection check of a demolition, as it does for a
  new build.
- If every switchable type is already off and the habitats still cannot be heated, the base is
  unheated.
- "Take shelter", for everyone or for one astronaut, with no finished habitat with a radiation
  shelter is refused with "not allowed"; with too little room, the astronauts who do not fit stay
  where they are.
- Bringing inside an astronaut who is already inside or dead is refused with "not allowed".
- A new habitat module that touches existing habitats only at a corner is refused with
  "not connected"; touching a habitat still under construction counts. If the base has no habitat
  at all, the first one may go on any free tile. Every other structure type may go on any free
  tile.
- After the mission has ended, time no longer advances and every action is refused with
  "not allowed".
- Actions are allowed while the game is paused or a briefing is open; only the clock stops.

## Requirements *(mandatory)*

### Functional Requirements

**Time (US1)**

- **FR-001**: The simulation MUST advance the mission by any number of game seconds per step and
  keep track of the cycle, the season, the time spent in the current season and the total time.
- **FR-002**: Seasons MUST follow the configured order and durations (II.3); the leftover time of a
  step that crosses a season boundary MUST count toward the next season.
- **FR-003**: Winter of a cycle that is not the last MUST be followed by spring of the next cycle.
- **FR-004**: A briefing for the current cycle and season MUST open at the start of every season,
  including the first one, and the mission MUST NOT change while a briefing is open.
- **FR-005**: Time MUST stop advancing when winter of the last cycle ends; from then on nothing is
  produced, consumed or charged, and the stock at that moment is what the win check uses.

**Production and consumption (US2)**

- **FR-006**: Every per-season amount (production, input, crew needs) MUST be applied evenly every
  game second as that amount divided by the current season's duration.
- **FR-007**: A structure's output MUST depend on its type's switch (Off = nothing, Base, Max), on
  whether its type was switched off by the brownout, and on its condition (damaged, clogged,
  short-circuited) with the configured factors.
- **FR-008**: Converters MUST consume their inputs and produce only what the available input
  allows; stock MUST never go below zero.
- **FR-009**: Structures under construction MUST neither produce nor consume.
- **FR-010**: Each living astronaut MUST consume the configured oxygen, water and food per season.

**Power (US3)**

- **FR-011**: Solar output MUST follow the season, the solar factors of active events (multiplied
  together), winter darkness from the configured cycle and the damaged factor; reactor output
  MUST be constant in every season and event.
- **FR-012**: Each consumer MUST draw according to its type's switch; the habitat, the greenhouse
  and the ice melter MUST use their heating tables by cycle and season, with the insulated table
  for any structure that has thermal insulation (habitat, greenhouse) and the Max add-on for the
  greenhouse and the ice melter.
- **FR-013**: Surplus MUST charge the batteries up to their total capacity and deficit MUST drain
  them, with no losses.
- **FR-014**: When the batteries cannot cover the deficit, structure types MUST be switched off in
  the configured brownout order until demand fits; habitats MUST never be switched off; types
  MUST come back on by themselves when power allows.
- **FR-015**: When even the habitats cannot be heated, the base MUST be marked unheated.
- **FR-016**: Every step MUST publish production, demand, balance, battery charge, the switched-off
  types and the unheated flag; the log MUST record a brownout each time the set of switched-off
  types changes.

**Player actions and jobs (US4)**

- **FR-017**: The player MUST be able to build any structure on a valid free tile when the stock
  covers its cost and external jobs are not blocked; the cost is paid at once and the structure
  stays under construction until its build job ends. A new habitat module MUST share at least one
  side of a grid tile with an existing habitat module (a corner does not count); which structure
  types follow this rule (v1: habitat modules only) MUST come from the game content files.
- **FR-018**: The player MUST be able to install an allowed upgrade on a finished structure that
  does not have it yet; the cost is paid at once and the effect starts when the job ends.
- **FR-019**: The player MUST be able to set Off / Base / Max for each switchable structure type;
  the habitat, solar panel, battery bank and reactor MUST have no switch.
- **FR-020**: The player MUST be able to repair a damaged or short-circuited structure: the repair
  parts are spent after the bolt minigame whatever its result, and only a success queues a repair
  job.
- **FR-021**: The player MUST be able to clean a clogged structure without spending parts, except
  while a dust storm is active.
- **FR-022**: Every refused action MUST leave the mission unchanged and return one reason from:
  not enough resources, tile blocked, out of bounds, not connected, last habitat, no room for
  crew, external jobs blocked, not allowed.
- **FR-023**: Each queued job MUST be taken by a free living astronaut inside who is not resting
  and whose exposure is at or below the configured resume level (the least exposed first, then
  in crew order), and that astronaut goes outside; at most one job per living astronaut may run;
  the others MUST wait in request order.
- **FR-024**: Jobs MUST last their configured times (the build time of the structure's type,
  upgrade, repair, clean, demolish) and then apply their effect: structure finished, upgrade
  installed, structure repaired or cleaned, structure removed and refunded; the astronaut then
  goes back inside.
- **FR-025**: While an event blocks external jobs, new external jobs MUST be refused, running jobs
  MUST pause with their remaining time and their astronauts MUST go inside; the jobs MUST resume
  when the block ends.
- **FR-026**: The player MUST be able, at any time, to bring one chosen astronaut inside or to
  bring everyone inside at once. A recalled astronaut's job MUST go back to the queue with its
  remaining time, and the recalled astronaut MUST rest inside and take no new job until their
  exposure is back to empty. While the radiation alarm is on, both actions take the astronauts
  into habitats with a radiation shelter (FR-030).
- **FR-039**: The player MUST be able to demolish any finished structure or cancel one under
  construction through a demolish job (blocked like every external job); when the job ends the
  structure MUST be removed and the configured share of everything paid for it (cost and
  upgrades) MUST return to the stock, whatever its condition. Demolishing the last habitat, a
  habitat whose occupants do not fit elsewhere, or a habitat that would leave another one
  unconnected MUST be refused.

**Crew, deaths and outcome (US5)**

- **FR-027**: Exposure MUST grow outside and fall inside at the configured rates and never go
  below empty. When it reaches the configured warning level, the astronaut's job MUST go back to
  the queue with its remaining time and the astronaut MUST go inside at once. Exposure MUST never
  kill.
- **FR-028**: An empty vital reserve or an unheated base MUST kill one astronaut after the grace
  period and then one more every configured interval while the condition lasts; each condition
  has its own countdown, which restarts when the condition ends.
- **FR-029**: From the configured insulation cycle, at the start of winter, astronauts who do not
  fit in a finished habitat with thermal insulation (FR-031) MUST die.
- **FR-030**: When a radiation storm hits, astronauts outside, and astronauts inside who do not fit
  in a finished habitat with a radiation shelter (FR-031), MUST die; "Take shelter" MUST bring the
  astronauts outside into sheltered habitats (up to their capacity) and pause their jobs until the
  storm ends.
- **FR-031**: The habitat modules are connected, so astronauts inside MUST be able to use any
  finished habitat, up to its capacity (6 per module in v1). When extreme cold or a radiation storm
  strikes, the astronauts inside MUST move by themselves into finished habitats that protect
  against that danger (thermal insulation for the cold, radiation shelter for the storm) as long
  as there is room; only those who do not fit stay unprotected. The habitat each astronaut is in
  MUST be visible to the screens.
- **FR-032**: Every death MUST be recorded in the log with its cause (empty oxygen, empty water,
  empty food, cold, radiation storm), the game time, the cycle and the season; every finished
  build, upgrade, repair, cleaning and demolition MUST be recorded too, so the debrief can explain
  the mission.
- **FR-033**: The mission MUST be lost when every astronaut is dead.
- **FR-034**: When winter of the last cycle ends, the mission MUST be won if at least one astronaut
  is alive, oxygen, food and water reach the win targets (one season for colonists + crew),
  and finished habitat capacity reaches colonists + crew; otherwise it MUST be lost with the
  reason "targets missed". Power MUST NOT be part of the win check.
- **FR-035**: The win targets MUST be available from the start of the mission so the HUD can show
  them on the vital bars.

**Whole simulation**

- **FR-036**: Each step MUST run in the fixed order time, events, power, production, jobs, crew,
  outcome, and the events step (owned by the events area) MUST run right after time.
- **FR-037**: The same seed and the same player actions at the same game times MUST always produce
  the same mission; the engine core MUST NOT draw from the random generator.
- **FR-038**: Every rule value (durations, amounts, costs, factors, tables, orders, cycles) MUST
  come from the game content files, so the product owners can tune the game without code changes.

### Key Entities *(include if feature involves data)*

- **Mission**: the whole game state for one seed: clock, stock, batteries, structures, switches,
  crew, jobs, active events, radiation storm, open briefing, death countdowns, log and result.
- **Clock**: cycle (1–4), season, time spent in the season, total game time.
- **Stock**: amounts of every material (hematite, regolith, iron, steel, repair parts) and vital
  reserve (oxygen, water, food).
- **Structure**: one placed building: type, top-left tile, condition (under construction, active,
  damaged, clogged, short-circuited) and installed upgrades.
- **Switch**: one Off / Base / Max setting per switchable structure type.
- **Power report**: production, demand, balance, battery charge, types switched off by the
  brownout, unheated flag.
- **Astronaut**: name, alive, inside or outside, current habitat, exposure (empty up to the
  warning level), current job, resting after a recall.
- **Job**: kind (build, upgrade, repair, clean, demolish), target structure, upgrade, astronaut,
  remaining time, state (queued, running, paused).
- **Log entry**: game time, cycle, season, kind (season start, built, upgrade installed, damaged,
  clogged, short circuit, repaired, cleaned, demolished, death, radiation storm, brownout), what
  it is about
  and the cause.
- **Win targets**: people to house (colonists + crew), reserves needed, habitat capacity needed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A full mission of 4 cycles and 16 seasons can be played from start to end, and both a
  win and a loss can be reached by a scripted sequence of player actions.
- **SC-002**: Replaying the same seed with the same actions gives an identical mission in 100% of
  runs.
- **SC-003**: Over one full season without events, every structure's total production and the
  crew's total consumption match the configured per-season amounts within 1%, whatever the step
  size.
- **SC-004**: 100% of deaths and of brownouts in a mission appear in the log with a cause, so the
  debrief can explain every one of them.
- **SC-005**: 100% of refused player actions return a reason the screens can show, and no player
  action can crash the game.
- **SC-006**: A whole mission (80 minutes of game time) can be simulated in under 2 seconds on a
  school laptop, so 4× speed never stutters because of the simulation.
- **SC-007**: A product owner can change any balance number in the content files and see the change
  in the game with no code change.
- **SC-008**: Every acceptance scenario of this spec is covered by an automated check that passes.

## Assumptions

- Speed controls and pausing live outside the engine core; the simulation receives game seconds
  in small steps (a few game seconds at most), so one step never crosses more than one season
  boundary.
- Actions are instantaneous and allowed while the game is paused or a briefing is open.
- A converter short of input produces in proportion to the input it could take, rather than
  nothing at all.
- Damaged and clogged structures still draw their normal power; short-circuited structures and
  structures under construction draw nothing.
- A structure still draws power when it has no input to convert; the player has to switch its
  type off.
- When several events are active, their solar factors multiply.
- The brownout starts when the batteries are empty; a switched-off type comes back on by itself
  when production alone can run it, or when the batteries are full again, so switches never
  blink on and off (plan research R6).
- An astronaut who comes back at the warning level is not resting: they work again once their
  exposure is at or below the resume level. Only a player recall makes an astronaut rest until
  their exposure is back to empty, so a recalled astronaut does not walk straight back out. The
  UI shows the warning (icon flash, commander line).
- Power is not a win target (constitution 3.0.0, II.2); it only matters through production and
  heating on the way there. Decided by the product owners on 2026-11-14.
- Story reason for the reserve targets: the colonists' ship lands when the four cycles end, so the
  stored oxygen, water and food must carry colonists + crew through one season (II.2).
- The commander's texts, including the warning before cycle 3, come from the content files and are
  shown by the UI; the engine core only opens a briefing for a cycle and season.
- There is no saving, loading or undo in v1. Demolition, which also cancels a construction, is
  the only way to take back a decision.

## Dependencies

- **Constitution 3.0.0**: the habitat connection rule (FR-017, principle V), demolition, the
  automatic return at the warning level and the win check without power come from the amendment
  of 2026-11-14 (`shared/` pull request approved by a second team member and a product owner); it
  must be merged before User Story 4 is implemented.
- **Events area (Dev A)**: schedules and applies every event (II.11) inside each step, right after
  time: active events with their solar factor and whether they block external jobs, damaged /
  clogged / short-circuited structures, winter darkness, the radiation storm phases, and the effect
  of the dust filters upgrade.
- **Product owners**: every number and text, in the content files (II.15).
- **2D UI (Dev B), scene and repair minigame (Dev C), debrief and sources (Dev A)**: read the
  mission state and call the player actions; the scene only places, hovers, selects and reports
  the minigame result. The scene's placement preview uses the same placement check, so a
  "not connected" habitat shows as invalid there too. The crew panel needs two new buttons, one
  per astronaut ("bring inside") and one for everyone, and the structure panel a "demolish"
  button; these player actions are in contract v2 ([contracts/contract-v2.md](contracts/contract-v2.md)).

## Out of Scope

- Event scheduling and event effects (Dev A).
- Any screen, 3D scene, sound or text layout (Dev B, Dev C).
- Any network access or real data loading.
