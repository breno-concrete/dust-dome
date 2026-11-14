// Owner: Dev C. Pure mapping: game state -> how the scene looks (constitution V).
// Keep ALL "how does the state look" logic here (testable); R3F components stay thin.
import type { GameConfig, GameState, StructureStatus } from '../../engine/types'

export interface VisualState {
  /** 0 = black, 1 = full daylight. */
  light: number
  /** 0 = clear sky, 1 = sky full of dust. */
  dustHaze: number
  /** Total winter darkness outside. */
  dark: boolean
}

export const STATUS_COLOR: Record<StructureStatus, string> = {
  building: '#8fb8de',
  active: '#e6e6e6',
  damaged: '#f5a623',
  clogged: '#b89a6a',
  short_circuit: '#ff5a5a',
}

const SEASON_LIGHT = { spring: 0.85, summer: 1, autumn: 0.75, winter: 0.55 } as const

export function visualState(game: GameState, config: GameConfig): VisualState {
  const dark =
    game.time.season === 'winter' && game.time.cycle >= config.seasons.winterDarknessFromCycle
  const solarFactor = Math.min(1, ...game.activeEvents.map((e) => e.solarFactor))
  const dustHaze = 1 - solarFactor
  const light = dark ? 0.15 : SEASON_LIGHT[game.time.season] * (0.4 + 0.6 * solarFactor)
  return { light, dustHaze, dark }
}
