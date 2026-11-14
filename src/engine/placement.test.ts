import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { createGame } from './game'
import { footprint, placementError } from './placement'
import { onlyStructures } from './testState'
import type { StructureStatus } from './types'

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

  // US4 (Breno) — constitution V, research R10
  const oneHabitat = (status: StructureStatus = 'active') =>
    onlyStructures(game, config, [{ type: 'habitat', tile: [0, 0], status }])

  it('rejects with not_connected a habitat that shares no side with an existing habitat', () => {
    expect(placementError(oneHabitat(), config, 'habitat', [6, 6])).toBe('not_connected')
  })

  it('a corner contact does not count as connected', () => {
    // The 2x2 at [0,0] ends at tile [1,1]; a 2x2 at [2,2] only touches that corner.
    expect(placementError(oneHabitat(), config, 'habitat', [2, 2])).toBe('not_connected')
  })

  it('accepts a habitat that shares a side, even with a habitat still under construction', () => {
    expect(placementError(oneHabitat(), config, 'habitat', [2, 0])).toBeNull()
    expect(placementError(oneHabitat(), config, 'habitat', [1, 2])).toBeNull()
    expect(placementError(oneHabitat('building'), config, 'habitat', [0, 2])).toBeNull()
  })

  it('places the first habitat anywhere when none exists', () => {
    const noHabitat = onlyStructures(game, config, [{ type: 'solar_panel', tile: [0, 0] }])
    expect(placementError(noHabitat, config, 'habitat', [8, 8])).toBeNull()
  })

  it('other structure types may go on any free tile', () => {
    const loose = config.structures.filter((d) => d.connectsTo.length === 0)
    expect(loose.length).toBeGreaterThan(0)
    for (const def of loose) {
      expect(placementError(oneHabitat(), config, def.id, [8, 8])).toBeNull()
    }
  })
})
