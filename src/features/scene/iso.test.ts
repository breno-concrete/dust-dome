import { describe, expect, it } from 'vitest'
import { tileCenter, worldToTile } from './iso'

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
  it.todo('rotating the camera in 90° steps keeps tile picking correct')
})
