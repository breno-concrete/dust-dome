import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { createGame } from './game'
import { footprint, placementError } from './placement'

describe('placement', () => {
  const game = createGame(config, 1)

  it('a 2x2 structure covers four tiles', () => {
    expect(footprint(config, 'habitat', [0, 0])).toHaveLength(4)
    expect(footprint(config, 'solar_panel', [0, 0])).toEqual([[0, 0]])
  })

  it('accepts a free tile inside the grid', () => {
    expect(placementError(game, config, 'solar_panel', [0, 0])).toBeNull()
  })

  it('rejects tiles outside the grid, including a 2x2 hanging off the edge', () => {
    const { width } = config.mission.grid
    expect(placementError(game, config, 'solar_panel', [-1, 0])).toBe('out_of_bounds')
    expect(placementError(game, config, 'habitat', [width - 1, 0])).toBe('out_of_bounds')
  })

  it('rejects tiles covered by an existing structure', () => {
    const habitat = game.structures.find((s) => s.type === 'habitat')!
    const [x, y] = habitat.tile
    expect(placementError(game, config, 'solar_panel', [x + 1, y + 1])).toBe('tile_blocked')
  })
})
