// Owner: Breno. Where the crew lives: structures with a capacity (constitution II.6, II.9).
import type { GameConfig, GameState, StructureInstance } from './types'

/** People a structure houses (0 for anything that is not a habitat). */
export function capacityOf(config: GameConfig, s: StructureInstance): number {
  return config.structures.find((d) => d.id === s.type)?.capacity ?? 0
}

export function isHousing(config: GameConfig, s: StructureInstance): boolean {
  return capacityOf(config, s) > 0
}

/** Living astronauts who live in this structure. */
export function occupantsOf(state: GameState, structureId: string): number {
  return state.crew.filter((a) => a.alive && a.habitatId === structureId).length
}

/** Free places in a finished habitat (a habitat under construction has none). */
export function roomIn(state: GameState, config: GameConfig, s: StructureInstance): number {
  if (s.status === 'building') return 0
  return Math.max(0, capacityOf(config, s) - occupantsOf(state, s.id))
}
