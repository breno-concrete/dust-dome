import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import type { StructureInstance } from '../../engine/types'
import { computeConduitRuns, computeHabitatCorridors, type TrailStripSpec } from './baseConnections'

const grid = config.mission.grid

describe('baseConnections', () => {
  describe('computeHabitatCorridors', () => {
    it('connects touching 2x2 habitats with a sealed bellows collar', () => {
      const structures: StructureInstance[] = [
        { id: 'h1', type: 'habitat', tile: [2, 2], status: 'active', upgrades: [] },
        { id: 'h2', type: 'habitat', tile: [4, 2], status: 'active', upgrades: [] },
      ]

      const corridors = computeHabitatCorridors(structures, config, grid)
      expect(corridors).toHaveLength(1)
      expect(corridors[0]).toMatchObject({
        axis: 'x',
        kind: 'seal',
      })
      expect(corridors[0]!.length).toBeGreaterThan(0.1)
    })

    it('connects nearby habitats separated by 1 tile with a pressurized bridge corridor', () => {
      const structures: StructureInstance[] = [
        { id: 'h1', type: 'habitat', tile: [2, 2], status: 'active', upgrades: [] },
        { id: 'h2', type: 'habitat', tile: [2, 5], status: 'active', upgrades: [] },
      ]

      const corridors = computeHabitatCorridors(structures, config, grid)
      expect(corridors).toHaveLength(1)
      expect(corridors[0]).toMatchObject({
        axis: 'z',
        kind: 'bridge',
      })
      expect(corridors[0]!.length).toBeGreaterThanOrEqual(1)
    })

    it('does not connect distant habitats, blocked gaps, or non-habitat structures', () => {
      const structures: StructureInstance[] = [
        { id: 'h1', type: 'habitat', tile: [1, 2], status: 'active', upgrades: [] },
        // Separated by 2 tiles (> 1 tile limit)
        { id: 'h2', type: 'habitat', tile: [5, 2], status: 'active', upgrades: [] },
        // Blocked by solar panel in the 1-tile gap between h1 and h3
        { id: 'blocker', type: 'solar_panel', tile: [1, 4], status: 'active', upgrades: [] },
        { id: 'h3', type: 'habitat', tile: [1, 5], status: 'active', upgrades: [] },
      ]

      const corridors = computeHabitatCorridors(structures, config, grid)
      expect(corridors).toHaveLength(0)
    })
  })

  describe('computeConduitRuns', () => {
    it('places parallel power cables and oxygen pipes alongside X and Z trail strips', () => {
      const strips: TrailStripSpec[] = [
        { x: 0, z: 1, lenX: 3.12, lenZ: 0.26, axis: 'x', length: 3 },
        { x: -1.5, z: -0.5, lenX: 0.26, lenZ: 2.12, axis: 'z', length: 2 },
      ]
      const structures: StructureInstance[] = [
        { id: 'h1', type: 'habitat', tile: [2, 2], status: 'active', upgrades: [] },
        { id: 'sol', type: 'solar_panel', tile: [5, 2], status: 'active', upgrades: [] },
        { id: 'oxy', type: 'oxygen_generator', tile: [5, 4], status: 'active', upgrades: [] },
      ]

      const conduits = computeConduitRuns(strips, [{ x: -1.5, z: 1 }], structures, config)
      const powerRuns = conduits.lines.filter((l) => l.kind === 'power')
      const oxygenRuns = conduits.lines.filter((l) => l.kind === 'oxygen')

      expect(powerRuns).toHaveLength(2)
      expect(oxygenRuns).toHaveLength(2)
      // Opposite sides of the strip along its perpendicular axis
      expect(powerRuns[0]!.z).not.toBe(oxygenRuns[0]!.z)
      expect(powerRuns[1]!.x).not.toBe(oxygenRuns[1]!.x)
      expect(conduits.nodes).toHaveLength(1)
    })
  })
})
