# Feature Specification: Events and NASA Data

**Feature Branch**: `data/002-events-data`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Read specs/002-events-data/brief.md and Part II of the constitution, then specify the Events and NASA data feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experience Deterministic Seasonal Events (Priority: P1)

As a player, I want each Martian season to produce its expected environmental events at
repeatable times so that the same mission seed gives me the same challenge every time.

**Why this priority**: Seasonal events are the foundation for all event effects and let players
learn to prepare for the climate. Deterministic scheduling is also required for fair play and
reproducible tests.

**Independent Test**: Start two missions with the same seed, advance them through the same seasons,
and compare event kinds, targets, timing, and season cleanup. Both runs must match and no event from
the previous season may remain active.

**Acceptance Scenarios**:

1. **Given** a mission with a known seed and a season's event configuration, **When** the season
   advances, **Then** event times are selected deterministically within that season's configured
   interval.
2. **Given** two missions with the same seed and starting state, **When** they receive the same
   time updates, **Then** they schedule the same event kinds, times, and selected targets.
3. **Given** an active event at the end of a season, **When** the season changes, **Then** the
   event is ended and the new season starts with only its own event schedule.
4. **Given** a cycle-four season, **When** an event is scheduled, **Then** its interval and effect
   use the maximum-scale rules defined for cycle four.

---

### User Story 2 - Survive Dust, Cold, Darkness, and Storm Damage (Priority: P1)

As a player, I want dust and cold events to visibly and mechanically affect my base so that my
choices about repairs, cleaning, power, and protection matter.

**Why this priority**: These events are the main environmental hazards of the Mars mission and
connect the event system to production, structure status, power, and crew preparation.

**Independent Test**: Feed a controlled state and event configuration into the event update logic,
advance through each dust and seasonal hazard, and verify the resulting structure statuses,
production effects, power effects, and job restrictions.

**Acceptance Scenarios**:

1. **Given** a dust devil and available solar panels, **When** it occurs, **Then** the configured
   number of panels becomes damaged and the damage effect is applied.
2. **Given** a local or dense dust storm, **When** it is active, **Then** solar output is reduced
   by the configured amount for its duration.
3. **Given** a dense storm in cycle two or large dust devils in cycle three or four, **When** the
   event applies its clogging effect, **Then** the affected filters, mines, and refineries become
   clogged according to that season's rules.
4. **Given** a global dust storm in cycle three or four, **When** one of its short-circuit checks
   occurs, **Then** a random eligible mine or iron refinery becomes short-circuited and produces no
   output until repaired.
5. **Given** a winter with total darkness, **When** the event is active, **Then** solar panels
   produce no power and external jobs are blocked for the winter.
6. **Given** an event has ended, **When** the next update runs, **Then** temporary storm effects
   are removed while persistent damage, clogging, or short-circuit statuses remain until their
   defined fix is applied.

---

### User Story 3 - Respond to a Real Radiation Storm (Priority: P1)

As a player, I want an honest warning before a radiation storm and a clear connection to a real
NASA solar event so that I can shelter the crew and understand the science behind the danger.

**Why this priority**: Radiation is a lethal mission hazard and the feature must satisfy the
project's real-science requirement by using an archived NASA DONKI event without pretending it is
live data.

**Independent Test**: Run a controlled cycle-two, cycle-three, or cycle-four mission through the
warning, active, and ending phases, and verify shelter outcomes, paused jobs, deterministic
selection, and DONKI attribution.

**Acceptance Scenarios**:

1. **Given** a cycle two, three, or four mission in spring, summer, or autumn, **When** the seeded
   radiation event time is reached, **Then** a ten-second warning phase starts and identifies the
   archived DONKI event used as its model.
2. **Given** the radiation warning phase, **When** the player shelters all astronauts or sends
   them into habitats with radiation shelters, **Then** jobs pause and the astronauts are
   protected when the storm hits.
3. **Given** the radiation storm is active, **When** an astronaut is outside or in a habitat
   without a radiation shelter, **Then** that astronaut dies according to the mission rules.
4. **Given** a radiation storm is active for its configured duration, **When** the duration ends,
   **Then** the storm ends, paused jobs can resume, and the next season does not inherit the active
   storm.
5. **Given** a DONKI snapshot with valid event details, **When** the game presents the radiation
   source, **Then** it shows the event name or date and a source link, and labels the data as
   archived rather than live.
6. **Given** malformed or unavailable DONKI snapshot data, **When** the data layer attempts to
   select an event, **Then** it reports the data problem explicitly rather than fabricating a
   source or silently presenting an unverified event.

---

### User Story 4 - Understand the Mission in the Debrief and Sources (Priority: P2)

As a player, I want the end-of-mission debrief to explain losses in plain language and show the
science sources so that I can learn why the base succeeded or failed.

**Why this priority**: The debrief turns failures into learning and ensures the game presents
NASA and other science references honestly to its 7-12 year-old audience.

**Independent Test**: Provide a mission log containing multiple event causes and outcomes, then
generate the debrief and sources content and verify that each relevant loss is explained and each
source is identified.

**Acceptance Scenarios**:

1. **Given** a mission log with event-caused damage, losses, and resource impacts, **When** the
   mission ends, **Then** the debrief groups the outcomes by cycle or event and explains each
   cause in plain English.
2. **Given** a mission log with no losses, **When** the mission ends, **Then** the debrief still
   explains the environmental events encountered and why the base survived.
3. **Given** a science fact or game simplification used by an event, **When** the sources screen
   is shown, **Then** it identifies the real basis, links to the source, and labels simplified or
   gameplay-only rules as simplifications.
4. **Given** the archived DONKI radiation event, **When** the sources screen is shown, **Then**
   it names the event and provides its NASA source link without claiming current or live data.
5. **Given** player-facing event or debrief text, **When** it is displayed, **Then** English is
   available and the wording uses plain terms suitable for ages 7-12.

## Edge Cases

- The seeded interval may be shorter than the remaining time in a season; no event may be
  scheduled outside the current season.
- A season can end while a temporary storm is active; temporary effects must be cleared at the
  boundary while persistent structure statuses remain.
- A dust event may select a structure type that does not exist in the current base; the event
  must not create an invalid target or fail silently.
- A structure may already be damaged, clogged, or short-circuited when another event targets it;
  the resulting status must follow the configured status rules and remain valid.
- A radiation warning may begin while astronauts are already outside or jobs are queued; jobs
  must pause during the storm sequence and resume only when allowed.
- The mission may end during an event; the debrief must preserve the event and loss causes already
  recorded in the log.
- A DONKI snapshot can contain no eligible event; the data layer must report the missing data
  explicitly and must not invent a NASA citation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The event system MUST schedule events from the configured cycle and season rules
  using the mission seed and the state's seeded random generator.
- **FR-002**: The event system MUST produce identical event schedules and target selections for
  identical seeds, starting states, configurations, and time updates.
- **FR-003**: The event system MUST end active seasonal events at the season boundary and MUST
  prevent event effects from leaking into another season.
- **FR-004**: The event system MUST implement the configured effects for dust devils, local dust
  storms, dense dust storms, global dust storms, cold, total darkness, clogging, and
  short-circuiting across cycles one through four.
- **FR-005**: The event system MUST preserve persistent structure statuses until the corresponding
  repair or cleaning action removes them, while removing temporary effects when their events end.
- **FR-006**: The event system MUST apply cycle-four maximum-scale intervals and global-storm
  effects as defined by the game design canon.
- **FR-007**: The event system MUST schedule at most one radiation storm per cycle in spring,
  summer, or autumn for cycles two through four, using seeded timing.
- **FR-008**: The radiation storm MUST provide a ten-second warning phase, a configured active
  duration, and a distinct ending state.
- **FR-009**: During a radiation storm, astronauts outside or in habitats without radiation
  shelters MUST receive the configured lethal outcome, while sheltered astronauts remain safe.
- **FR-010**: Radiation warnings MUST pause affected jobs and allow them to resume only when the
  storm sequence permits.
- **FR-011**: The data layer MUST parse archived NASA DONKI snapshots and provide a selected
  real event with its identifying details and source link.
- **FR-012**: The data layer MUST expose deterministic event selection for a provided seeded
  generator and MUST report invalid or missing snapshot data explicitly.
- **FR-013**: Every event and science-based rule presented to the player MUST have an explanation
  and a source or a clear label identifying it as a gameplay simplification.
- **FR-014**: The debrief MUST derive its event causes and resource or crew losses from the mission
  log rather than inventing outcomes.
- **FR-015**: The debrief MUST explain every recorded loss in plain English and identify the
  relevant real-science explanation or gameplay simplification.
- **FR-016**: The sources screen MUST distinguish archived data from live data and MUST show the
  real DONKI citation for the radiation storm.
- **FR-017**: The implementation MUST keep NASA I/O in the data layer; the event engine MUST remain
  pure and MUST not perform network or file I/O, use timers, or use unseeded randomness.
- **FR-018**: The feature MUST remain within the DEV A ownership paths and MUST request a shared
  contract change when a required `GameState` field is not already available.

### Key Entities

- **Season event rule**: The configured event kind, cycle and season, interval, duration, effect,
  explanation, and science source used to schedule an event.
- **Active event**: A scheduled event with its start and end timing, current phase, effect state,
  and any selected structure target.
- **Structure status**: The persistent or temporary condition of a base structure, including
  damaged, clogged, or short-circuited.
- **Radiation storm**: The warning, active, and ended phases of a solar particle event, including
  its timing, shelter requirements, and DONKI citation.
- **DONKI snapshot**: An archived NASA event record containing the identifying information, event
  date, source link, and data needed to model a radiation storm offline.
- **Mission log entry**: A recorded event, effect, loss, or recovery used to explain the mission in
  the debrief.
- **Science source**: A named reference for a real Mars or space-weather fact, with a link and an
  indication of whether the rule is real, scaled, simplified, or gameplay-only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the configured cycle-and-season event rules produce only deterministic
  schedules and target selections for repeated runs with the same seed.
- **SC-002**: 100% of temporary event effects are removed at event or season end, while every
  persistent damage, clogging, or short-circuit outcome remains recorded until its defined fix.
- **SC-003**: Every acceptance scenario for dust, cold, darkness, global storms, and radiation
  storms passes in focused automated tests before the corresponding story PR is opened.
- **SC-004**: Every radiation storm shown in a mission identifies one archived NASA DONKI event with
  a source link; no radiation storm is presented as live data.
- **SC-005**: A debrief generated from a complete mission log accounts for 100% of recorded crew
  deaths, structure losses, and resource losses with a plain-language cause.
- **SC-006**: A reviewer can trace every event rule and science-based simplification to a named
  source or explicit gameplay label in the sources screen.
- **SC-007**: The complete project check passes with the feature integrated, including ownership
  validation and the repository's existing test suite.

## Assumptions

- The existing `GameState`, config schema, store, seeded random helpers, tick loop, and repair or
  cleaning actions provide the contract needed by this feature; missing fields require a shared
  contract change request rather than an edit by DEV A.
- Product owners provide valid `events.json` and `mission.json` configuration, including the
  radiation storm rules, English explanations, and source metadata.
- NASA DONKI data is committed as an offline snapshot and is not fetched by the game at runtime.
- The existing engine owns time advancement, production, power, crew deaths, and win or lose
  resolution; this feature supplies event updates and records effects through the existing
  contract.
- The existing UI owned by DEV B presents alerts and radiation alarms; this feature provides the
  state and source data needed by that UI.
- The existing scene owned by DEV C presents visual consequences; this feature provides the
  statuses and active-event state needed by that scene.
- Event balance values remain in `src/config/*.json` and may be changed by product owners without
  changing the behavioral requirements in this specification.
- The first release requires English player-facing text; Portuguese is optional.
