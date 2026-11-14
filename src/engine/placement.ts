// Owner: Breno. Grid rules (constitution V). Pure; the scene uses it through
// selectors in src/app/selectors.ts to show a valid/invalid placement preview.
import type { ActionError, GameConfig, GameState, StructureTypeId, Tile } from './types'

export function sizeOf(config: GameConfig, type: StructureTypeId): number {
  return config.structures.find((s) => s.id === type)?.size ?? 1
}

/** Every tile covered by a structure of this type placed at `tile` (top-left). */
export function footprint(config: GameConfig, type: StructureTypeId, tile: Tile): Tile[] {
  const size = sizeOf(config, type)
  const tiles: Tile[] = []
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) tiles.push([tile[0] + dx, tile[1] + dy])
  }
  return tiles
}

/** null = can place; otherwise the reason. Does not check cost. */
export function placementError(
  state: GameState,
  config: GameConfig,
  type: StructureTypeId,
  tile: Tile,
): ActionError | null {
  const { width, height } = config.mission.grid
  const wanted = footprint(config, type, tile)
  if (wanted.some(([x, y]) => x < 0 || y < 0 || x >= width || y >= height)) return 'out_of_bounds'

  const taken = new Set(
    state.structures.flatMap((s) => footprint(config, s.type, s.tile).map(([x, y]) => `${x},${y}`)),
  )
  if (wanted.some(([x, y]) => taken.has(`${x},${y}`))) return 'tile_blocked'
  return null
}
