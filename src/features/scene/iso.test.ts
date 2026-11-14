import { describe, expect, it } from 'vitest'
import {
  cameraPositionForStep,
  rotateStep,
  tileCenter,
  worldToTile,
  type RotationStep,
} from './iso'

const grid = { width: 12, height: 12 }

describe('iso grid math', () => {
  it('places a 1x1 structure at the center of its tile', () => {
    expect(tileCenter([0, 0], 1, grid)).toEqual([-5.5, 0, -5.5])
  })

  it('places a 2x2 structure at the center of its four tiles', () => {
    expect(tileCenter([5, 5], 2, grid)).toEqual([0, 0, 0])
  })

  it('finds the tile under a ground point and back', () => {
    for (const tile of [
      [0, 0],
      [11, 11],
      [3, 7],
    ] as const) {
      const [x, , z] = tileCenter(tile, 1, grid)
      expect(worldToTile(x, z, grid)).toEqual(tile)
    }
  })

  it('returns null outside the grid', () => {
    expect(worldToTile(-6.1, 0, grid)).toBeNull()
    expect(worldToTile(0, 6.1, grid)).toBeNull()
  })

  // US1 (Dev C)
  it('wraps camera rotation steps in 90° increments (0..3)', () => {
    expect(rotateStep(0, 1)).toBe(1)
    expect(rotateStep(1, 1)).toBe(2)
    expect(rotateStep(2, 1)).toBe(3)
    expect(rotateStep(3, 1)).toBe(0)
    expect(rotateStep(0, -1)).toBe(3)
    expect(rotateStep(3, -1)).toBe(2)
  })

  it('computes orthogonal isometric camera orbit positions for each 90° step', () => {
    const p0 = cameraPositionForStep(0)
    const p1 = cameraPositionForStep(1)
    const p2 = cameraPositionForStep(2)
    const p3 = cameraPositionForStep(3)

    expect(p0).toEqual([14, 14, 14])
    expect(p1[1]).toBe(14)
    expect(p2).toEqual([-14, 14, -14])
    expect(p3[1]).toBe(14)
    // Adjacent steps are orthogonal in the XZ plane (dot product = 0)
    expect(p0[0] * p1[0] + p0[2] * p1[2]).toBe(0)
    expect(p1[0] * p2[0] + p1[2] * p2[2]).toBe(0)
    expect(p2[0] * p3[0] + p2[2] * p3[2]).toBe(0)
  })

  it('rotating the camera in 90° steps keeps tile picking correct', () => {
    const steps: RotationStep[] = [0, 1, 2, 3]
    const testTiles = [
      [0, 0],
      [11, 11],
      [3, 7],
      [5, 5],
    ] as const

    for (const step of steps) {
      const [camX, camY, camZ] = cameraPositionForStep(step)
      expect(camY).toBeGreaterThan(0)

      for (const tile of testTiles) {
        const [targetX, targetY, targetZ] = tileCenter(tile, 1, grid)
        // Ray from camera through target point to ground plane y = 0
        const dirX = targetX - camX
        const dirY = targetY - camY
        const dirZ = targetZ - camZ
        const t = -camY / dirY
        const hitX = camX + t * dirX
        const hitZ = camZ + t * dirZ

        expect(worldToTile(hitX, hitZ, grid)).toEqual(tile)
      }
    }
  })
})
