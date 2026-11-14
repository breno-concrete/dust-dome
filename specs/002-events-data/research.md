# Research: Events and NASA Data

## Decision: Reuse the existing pure engine boundary

- **Decision**: Implement all simulation behavior in `src/engine/events/events.ts` through
  `updateEvents(state, config, dt)`.
- **Rationale**: `src/engine/game.ts` already calls this function after `advanceTime` and before
  power, production, jobs, crew, and outcome. This preserves the documented tick order and keeps
  event effects observable by the systems that consume `GameState`.
- **Alternatives considered**: Adding event logic to `game.ts` would bypass the owned event module;
  putting it in the store would violate the pure-engine boundary and make deterministic tests
  depend on React state.

## Decision: Use `state.rng` for every random choice

- **Decision**: Use `nextRange` for interval selection and `nextIndex` for structure and DONKI
  selection, writing every returned RNG value back into the next state.
- **Rationale**: `src/engine/rng.ts` is the established seeded generator and the constitution
  requires identical seeds to produce identical missions.
- **Alternatives considered**: `Math.random` is prohibited; deriving a new random generator from
  elapsed time would break replayability.

## Decision: Treat configured event rules as the source of balance

- **Decision**: Read cycle, season, interval, duration, and effects from `GameConfig.events` and
  radiation settings from `GameConfig.mission.radiationStorm`.
- **Rationale**: `src/config/schema.ts` already models the full event configuration, including
  cycle-four interval scaling, status effects, source metadata, and radiation timing.
- **Alternatives considered**: Hard-coding the canon's numbers in TypeScript would prevent PO
  tuning and violate the configuration ownership rule.

## Decision: Keep persistent and temporary effects separate

- **Decision**: Store active temporary effects in `activeEvents`; store persistent structure
  statuses and log entries on their existing state fields. Clear temporary effects at event or
  season boundaries without clearing damage, clogging, or short-circuit statuses.
- **Rationale**: `visualState.ts` already derives dust and light from `activeEvents`, while
  structure status is the existing contract consumed by production, repair, and scene code.
- **Alternatives considered**: Encoding all effects as permanent statuses would make storm
  duration and season cleanup incorrect.

## Decision: Use committed DONKI snapshots, never runtime NASA access

- **Decision**: Complete `sepEvents()` by reading the committed snapshot format described in
  `src/data/snapshots/README.md`, and keep `pickSepEvent()` deterministic and null-safe.
- **Rationale**: The game must work offline and the constitution explicitly restricts NASA I/O to
  `src/data/`. The source metadata already identifies NASA DONKI as the real basis.
- **Alternatives considered**: Fetching DONKI during a mission would make behavior non-reproducible,
  require network access, and incorrectly present archived data as live.

## Decision: Derive the debrief from `GameState.log`

- **Decision**: Add feature-local pure helpers for grouping log entries, resolving cause text,
  and collecting sources; render the results in the existing end and sources screens.
- **Rationale**: `LogEntry` already records cycle, season, kind, reference, and optional cause,
  which is the authoritative record of what happened. A helper makes behavior testable without
  mounting the whole application.
- **Alternatives considered**: Reconstructing losses from current structures or stock would omit
  historical events and could invent causes.

## Decision: No new contract fields in this plan

- **Decision**: Use `activeEvents`, `nextEventAt`, `radiationStorm`, structure status, and `log`
  as currently defined. If implementation proves a field is missing, stop and request a
  `shared/` contract PR.
- **Rationale**: The brief explicitly assigns those existing fields to DEV A and requires contract
  changes to be coordinated with Breno.
- **Alternatives considered**: Editing `src/engine/types.ts`, `src/config/schema.ts`, or
  `src/app/store.ts` from the data branch would violate ownership and CI rules.

## Research conclusion

No unresolved `NEEDS CLARIFICATION` items remain. The repository already supplies the required
engine, configuration, RNG, store, test, and snapshot boundaries; implementation work is
behavioral completion of the existing TODOs.
