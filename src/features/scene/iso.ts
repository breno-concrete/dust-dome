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

/** Clamp a camera pan target (x, z) to stay within the outpost grid boundaries. */
export function clampPanTarget(x: number, z: number, grid: Grid): [number, number] {
  const halfW = grid.width / 2
  const halfH = grid.height / 2
  return [Math.max(-halfW, Math.min(halfW, x)), Math.max(-halfH, Math.min(halfH, z))]
}

/** Isometric camera orbit position for a 90° rotation step around an XZ target. */
export function cameraPositionForStep(
  step: RotationStep,
  distance = 14,
  target: readonly [number, number] = [0, 0],
): [number, number, number] {
  const [tx, tz] = target
  switch (step) {
    case 0:
      return [tx + distance, distance, tz + distance]
    case 1:
      return [tx - distance, distance, tz + distance]
    case 2:
      return [tx - distance, distance, tz - distance]
    case 3:
      return [tx + distance, distance, tz - distance]
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
