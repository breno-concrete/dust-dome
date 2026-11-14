// Owner: Breno. Win and lose (constitution II.2; research R16).
import { winTargets } from './game'
import { capacityOf } from './habitats'
import { isMissionTimeOver } from './time'
import type { GameConfig, GameState } from './types'

const EPS = 1e-9

/**
 * Lost as soon as the whole crew is dead. When winter of the last cycle ends: won if someone is
 * alive, the vital reserves reach the targets and the finished habitats house everyone.
 * Power is not a target (constitution 3.0.0).
 */
export function checkOutcome(state: GameState, config: GameConfig): GameState {
  if (state.status !== 'running') return state
  if (!state.crew.some((a) => a.alive)) {
    return { ...state, status: 'lost', lostReason: 'crew_lost' }
  }
  if (!isMissionTimeOver(state, config)) return state

  const targets = winTargets(config)
  const reservesMet = Object.entries(targets.reserves).every(
    ([res, target]) => (state.stock[res] ?? 0) >= target - EPS,
  )
  const capacity = state.structures
    .filter((s) => s.status !== 'building')
    .reduce((sum, s) => sum + capacityOf(config, s), 0)
  const won = reservesMet && capacity >= targets.habitatCapacity
  return won
    ? { ...state, status: 'won', lostReason: null }
    : { ...state, status: 'lost', lostReason: 'targets_missed' }
}
