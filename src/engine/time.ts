// Owner: Breno. Game clock: seasons and cycles (constitution II.3; research R1, R2).
import type { GameConfig, GameState, SeasonId } from './types'

/** Tolerance for comparisons of accumulated game seconds. */
const EPS = 1e-9

export function seasonDuration(config: GameConfig, season: SeasonId): number {
  const def = config.seasons.seasons.find((s) => s.id === season)
  if (!def) throw new Error(`unknown season "${season}"`)
  return def.durationSeconds
}

function isLastSeason(state: GameState, config: GameConfig): boolean {
  const seasons = config.seasons.seasons
  return (
    state.time.cycle >= config.seasons.cycles &&
    state.time.season === seasons[seasons.length - 1].id
  )
}

/** True once winter of the last cycle has run to its end. */
export function isMissionTimeOver(state: GameState, config: GameConfig): boolean {
  return (
    isLastSeason(state, config) &&
    state.time.secondsIntoSeason >= seasonDuration(config, state.time.season) - EPS
  )
}

/** True in the step in which a season started (steps never cross two boundaries). */
export function seasonStartedThisStep(state: GameState, dt: number): boolean {
  return state.time.secondsIntoSeason < dt
}

/**
 * Adds dt game seconds. On reaching the season's duration the next season starts with the
 * leftover seconds (winter -> spring of the next cycle), its briefing opens and a season_start
 * is logged. Winter of the last cycle stops at its end.
 */
export function advanceTime(state: GameState, config: GameConfig, dt: number): GameState {
  const { cycle, season, secondsIntoSeason, elapsed } = state.time
  const duration = seasonDuration(config, season)

  if (isLastSeason(state, config)) {
    const used = Math.max(0, Math.min(dt, duration - secondsIntoSeason))
    if (used === 0) return state
    return {
      ...state,
      time: { ...state.time, secondsIntoSeason: secondsIntoSeason + used, elapsed: elapsed + used },
    }
  }

  const inSeason = secondsIntoSeason + dt
  const now = elapsed + dt
  if (inSeason < duration - EPS) {
    return { ...state, time: { ...state.time, secondsIntoSeason: inSeason, elapsed: now } }
  }

  const seasons = config.seasons.seasons
  const nextIndex = (seasons.findIndex((s) => s.id === season) + 1) % seasons.length
  const nextCycle = nextIndex === 0 ? cycle + 1 : cycle
  const nextSeason = seasons[nextIndex].id
  const remainder = Math.max(0, inSeason - duration)
  return {
    ...state,
    time: { cycle: nextCycle, season: nextSeason, secondsIntoSeason: remainder, elapsed: now },
    briefing: { cycle: nextCycle, season: nextSeason },
    log: [
      ...state.log,
      {
        at: now - remainder,
        cycle: nextCycle,
        season: nextSeason,
        kind: 'season_start',
        ref: nextSeason,
      },
    ],
  }
}
