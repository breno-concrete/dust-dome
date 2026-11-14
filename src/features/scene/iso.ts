// Owner: Dev C. Grid <-> world math for the isometric scene. Pure and tested.
// World units: 1 tile = 1 unit; the grid is centered on the origin; y is up.
import type { Tile } from '../../engine/types'

export interface Grid {
  width: number
  height: number
}

export type RotationStep = 0 | 1 | 2 | 3

/** Wrap a 90° camera rotation step (0..3) clockwise (+1) or counter-clockwise (-1). */
export function rotateStep(step: RotationStep, delta: 1 | -1): RotationStep {
  return ((((step + delta) % 4) + 4) % 4) as RotationStep
}

/** Isometric camera orbit position for a 90° rotation step around the origin. */
export function cameraPositionForStep(step: RotationStep, distance = 14): [number, number, number] {
  switch (step) {
    case 0:
      return [distance, distance, distance]
    case 1:
      return [-distance, distance, distance]
    case 2:
      return [-distance, distance, -distance]
    case 3:
      return [distance, distance, -distance]
  }
}

/** World position of the center of a structure of `size` tiles placed at `tile`. */
export function tileCenter(tile: Tile, size: number, grid: Grid): [number, number, number] {
  return [tile[0] + size / 2 - grid.width / 2, 0, tile[1] + size / 2 - grid.height / 2]
}

/** Tile under a world point on the ground, or null outside the grid. */
export function worldToTile(x: number, z: number, grid: Grid): Tile | null {
  const tx = Math.floor(x + grid.width / 2)
  const ty = Math.floor(z + grid.height / 2)
  if (tx < 0 || ty < 0 || tx >= grid.width || ty >= grid.height) return null
  return [tx, ty]
}
