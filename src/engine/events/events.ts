// Owner: Dev A. Climate events and the radiation storm (constitution II.11).
// Pure and seeded: state.rng is the only source of randomness.
// Writes: activeEvents, nextEventAt, radiationStorm, structure statuses
// (damaged / clogged / short_circuit), log entries. Called by tick() after advanceTime.
import type { GameConfig, GameState } from '../types'

// TODO(Dev A, US1–US3)
export function updateEvents(state: GameState, _config: GameConfig, _dt: number): GameState {
  return state
}
