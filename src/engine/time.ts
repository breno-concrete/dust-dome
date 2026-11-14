// Owner: Breno. Game clock: seasons and cycles (constitution II.3). Smoke test: do not merge.
import type { GameConfig, GameState } from './types'

// TODO(Breno, US1): season rollover with remainder, winter -> next cycle,
// open the briefing at each season start, stop after the last cycle.
export function advanceTime(state: GameState, _config: GameConfig, dt: number): GameState {
  return {
    ...state,
    time: {
      ...state.time,
      elapsed: state.time.elapsed + dt,
      secondsIntoSeason: state.time.secondsIntoSeason + dt,
    },
  }
}
