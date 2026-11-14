// Owner: Breno. Grid rules (constitution V). Pure; the scene uses it through
// selectors in src/app/selectors.ts to show a valid/invalid placement preview.
import { beingDemolished } from './jobs'
import type {
  ActionError,
  GameConfig,
  GameState,
  StructureInstance,
  StructureTypeId,
  Tile,
} from './types'

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

/** True when a tile of `a` shares a side with a tile of `b` (a corner does not count). */
export function sharesSide(a: Tile[], b: Tile[]): boolean {
  return a.some(([ax, ay]) => b.some(([bx, by]) => Math.abs(ax - bx) + Math.abs(ay - by) === 1))
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

  // Principle V (R10): e.g. a new habitat module must share a side with an existing one.
  const linksTo = config.structures.find((d) => d.id === type)?.connectsTo ?? []
  const anchors = state.structures.filter(
    (s) => linksTo.includes(s.type) && !beingDemolished(state, s.id),
  )
  if (
    anchors.length > 0 &&
    !anchors.some((s) => sharesSide(wanted, footprint(config, s.type, s.tile)))
  ) {
    return 'not_connected'
  }
  return null
}

/** Groups of structures linked by shared sides (used so demolition never splits the habitats). */
export function sideGroups(config: GameConfig, structures: StructureInstance[]): number {
  const tiles = structures.map((s) => footprint(config, s.type, s.tile))
  const seen = new Set<number>()
  let groups = 0
  for (let start = 0; start < structures.length; start++) {
    if (seen.has(start)) continue
    groups++
    const stack = [start]
    seen.add(start)
    while (stack.length > 0) {
      const i = stack.pop()!
      tiles.forEach((t, j) => {
        if (!seen.has(j) && sharesSide(tiles[i], t)) {
          seen.add(j)
          stack.push(j)
        }
      })
    }
  }
  return groups
}
