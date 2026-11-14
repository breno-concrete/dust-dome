// Owner: Dev C. Pure mapping: game state -> how the scene looks (constitution V).
// Keep ALL "how does the state look" logic here (testable); R3F components stay thin.
import type { GameConfig, GameState, StructureInstance, StructureStatus } from '../../engine/types'

export type NonColorCue = 'none' | 'construction' | 'damage' | 'dust' | 'sparks' | 'frost'

export interface VisualState {
  /** 0 = black, 1 = full daylight. */
  light: number
  /** 0 = clear sky, 1 = sky full of dust. */
  dustHaze: number
  /** Total winter darkness outside. */
  dark: boolean
  /** True when the base power cannot meet habitat heating demand. */
  frost: boolean
  /** True during the 10-second radiation storm warning alarm phase. */
  radiationTint: boolean
}

export interface StructureVisual {
  status: StructureStatus
  color: string
  nonColorCue: NonColorCue
  /** True when a habitat module is covered in frost due to an unheated base. */
  frosted: boolean
}

export const STATUS_COLOR: Record<StructureStatus, string> = {
  building: '#8fb8de',
  active: '#e6e6e6',
  damaged: '#f5a623',
  clogged: '#b89a6a',
  short_circuit: '#ff5a5a',
}

const STATUS_NON_COLOR_CUE: Record<StructureStatus, NonColorCue> = {
  building: 'construction',
  active: 'none',
  damaged: 'damage',
  clogged: 'dust',
  short_circuit: 'sparks',
}

const SEASON_LIGHT = { spring: 0.85, summer: 1, autumn: 0.75, winter: 0.55 } as const

export function visualState(game: GameState, config: GameConfig): VisualState {
  const dark =
    game.time.season === 'winter' && game.time.cycle >= config.seasons.winterDarknessFromCycle
  const solarFactor = Math.min(1, ...game.activeEvents.map((e) => e.solarFactor))
  const dustHaze = 1 - solarFactor
  const light = dark ? 0.15 : SEASON_LIGHT[game.time.season] * (0.4 + 0.6 * solarFactor)
  const frost = Boolean(game.power.unheated)
  const radiationTint = game.radiationStorm?.phase === 'warning'
  return { light, dustHaze, dark, frost, radiationTint }
}

export function structureVisualState(
  structure: Pick<StructureInstance, 'type' | 'status'>,
  visual: Pick<VisualState, 'frost'>,
): StructureVisual {
  const frosted = structure.type === 'habitat' && visual.frost
  const baseCue = STATUS_NON_COLOR_CUE[structure.status]
  const nonColorCue: NonColorCue = structure.status === 'active' && frosted ? 'frost' : baseCue
  return {
    status: structure.status,
    color: STATUS_COLOR[structure.status],
    nonColorCue,
    frosted,
  }
}
