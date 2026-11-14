// Owner: Breno. Read-only helpers for components. Components import these instead
// of the engine. Pure functions of the store state + config.
// Rule: inside useGameStore(selector) return only primitives or existing references.
// A selector that builds a new object/array on every call causes an infinite render
// loop (React error #185). Select the raw fields, then call these helpers in render.
import { config } from '../config/loadConfig'
import { winTargets } from '../engine/game'
import { footprint, placementError } from '../engine/placement'
import type { StructureDef, Tile } from '../engine/types'
import type { GameStore } from './store'

export const targets = winTargets(config)

export function structureDef(type: string): StructureDef | undefined {
  return config.structures.find((s) => s.id === type)
}

export function seasonDef(id: string) {
  return config.seasons.seasons.find((s) => s.id === id)
}

/** Tiles of the structure being placed under the cursor, and whether it fits. */
export function placementPreview(store: Pick<GameStore, 'game' | 'placing' | 'hoverTile'>): {
  tiles: Tile[]
  valid: boolean
} | null {
  const { game, placing, hoverTile } = store
  if (!game || !placing || !hoverTile) return null
  return {
    tiles: footprint(config, placing, hoverTile),
    valid: placementError(game, config, placing, hoverTile) === null,
  }
}

/** Seconds left in the current season. */
export function secondsLeftInSeason(store: Pick<GameStore, 'game'>): number {
  const g = store.game
  if (!g) return 0
  return Math.max(0, (seasonDef(g.time.season)?.durationSeconds ?? 0) - g.time.secondsIntoSeason)
}
