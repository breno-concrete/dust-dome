# Events Engine Contract

## Function

```ts
updateEvents(state: GameState, config: GameConfig, dt: number): GameState
```

Defined in `src/engine/events/events.ts` and called by `tick()` after time advancement.

## Inputs

- `state`: current immutable game state, including `time`, `rng`, structures, crew, jobs,
  active events, radiation state, and log.
- `config`: validated game configuration from the PO-owned JSON files.
- `dt`: elapsed game seconds for the current tick.

## Outputs

Returns a new state reference only when event state changes. The function may update:

- `rng`;
- `activeEvents`;
- `nextEventAt`;
- `radiationStorm`;
- structure statuses;
- crew outcomes required by the existing radiation contract;
- jobs paused by a radiation warning;
- event and loss log entries.

## Invariants

- No mutation of the input state.
- No React, store, fetch, file I/O, timers, or `Math.random`.
- Same seed, input state, configuration, and `dt` produce the same output.
- Only rules matching the current cycle and season can schedule.
- Temporary effects expire; persistent structure statuses remain until their fix.
- Radiation storms use an archived DONKI citation when available.
- Missing required contract state is a blocker for a separate `shared/` change, not a local cast or
  silent fallback.
