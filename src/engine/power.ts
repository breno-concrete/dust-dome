// Owner: Breno. Power balance, batteries, heating and brownout (constitution II.7).
import type { GameConfig, GameState } from './types'

// TODO(Breno, US3)
export function computePower(state: GameState, _config: GameConfig, _dt: number): GameState {
  return state
}

// TODO(Breno, US3)
export function demandAtSwitches(_state: GameState, _config: GameConfig): number {
  return -1
}

// TODO(Breno, US3)
export function batteryCapacity(_state: GameState, _config: GameConfig): number {
  return -1
}
