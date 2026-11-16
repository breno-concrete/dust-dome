import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { createGame } from '../../engine/game'
import type { Astronaut, Job, StructureInstance } from '../../engine/types'
import { tileCenter } from './iso'
import {
  ASTRONAUT_ACCENT_PALETTE,
  astronautPositionAt,
  astronautWaypoints,
  findAstronautPath,
} from './astronautMarkers'

const grid = config.mission.grid

const makeAstronaut = (overrides: Partial<Astronaut> = {}): Astronaut => ({
  id: 'a1',
  name: 'Alice',
  alive: true,
  location: 'outside',
  habitatId: 'hab-1',
  exposure: 0.1,
  jobId: 'job-1',
  resting: false,
  ...overrides,
})

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  kind: 'repair',
  structureId: 'solar-1',
  astronautId: 'a1',
  remainingSeconds: 10,
  status: 'active',
  ...overrides,
})

describe('astronautMarkers', () => {
  const baseGame = createGame(config, 1)
  const structures: StructureInstance[] = [
    { id: 'hab-1', type: 'habitat', tile: [1, 1], status: 'active', upgrades: [] },
    { id: 'solar-1', type: 'solar_panel', tile: [6, 1], status: 'damaged', upgrades: [] },
    { id: 'mine-1', type: 'mine', tile: [1, 7], status: 'building', upgrades: [] },
  ]

  it('includes only alive astronauts currently outside and resolves start/end world coordinates', () => {
    const game = {
      ...baseGame,
      structures,
      jobs: [makeJob()],
      crew: [
        makeAstronaut({ id: 'a1', location: 'outside', jobId: 'job-1' }),
        makeAstronaut({ id: 'a2', name: 'Bob', location: 'inside', jobId: null }),
        makeAstronaut({ id: 'a3', name: 'Cara', alive: false, location: 'outside', jobId: null }),
      ],
    }

    const waypoints = astronautWaypoints(game, config, grid)
    expect(waypoints).toHaveLength(1)

    const wp = waypoints[0]!
    expect(wp.id).toBe('a1')

    const habCenter = tileCenter([1, 1], 2, grid)
    const solarCenter = tileCenter([6, 1], 1, grid)

    // Starts near habitat airlock/center and targets the work structure
    expect(Math.hypot(wp.from[0] - habCenter[0], wp.from[2] - habCenter[2])).toBeLessThanOrEqual(
      1.2,
    )
    expect(Math.hypot(wp.to[0] - solarCenter[0], wp.to[2] - solarCenter[2])).toBeLessThanOrEqual(
      1.0,
    )
    expect(wp.from[1]).toBe(0)
    expect(wp.to[1]).toBe(0)
  })

  it('assigns distinct game-palette suit accent colors across astronauts', () => {
    const game = {
      ...baseGame,
      structures,
      jobs: [
        makeJob({ id: 'j1', astronautId: 'a1', structureId: 'solar-1' }),
        makeJob({ id: 'j2', astronautId: 'a2', structureId: 'mine-1' }),
        makeJob({ id: 'j3', astronautId: 'a3', structureId: 'solar-1' }),
        makeJob({ id: 'j4', astronautId: 'a4', structureId: 'mine-1' }),
      ],
      crew: [
        makeAstronaut({ id: 'a1', jobId: 'j1' }),
        makeAstronaut({ id: 'a2', name: 'Bob', jobId: 'j2' }),
        makeAstronaut({ id: 'a3', name: 'Cara', jobId: 'j3' }),
        makeAstronaut({ id: 'a4', name: 'Dan', jobId: 'j4' }),
      ],
    }

    const waypoints = astronautWaypoints(game, config, grid)
    expect(waypoints).toHaveLength(4)

    const colors = waypoints.map((w) => w.color)
    expect(new Set(colors).size).toBe(4)
    for (const c of colors) {
      expect(ASTRONAUT_ACCENT_PALETTE).toContain(c)
    }
  })

  it('falls back safely without throwing when habitatId or job structure is missing', () => {
    const game = {
      ...baseGame,
      structures,
      jobs: [makeJob({ id: 'j-missing', structureId: 'gone' })],
      crew: [makeAstronaut({ id: 'a-orphan', habitatId: 'gone-hab', jobId: 'j-missing' })],
    }

    const waypoints = astronautWaypoints(game, config, grid)
    expect(waypoints).toHaveLength(1)
    expect(Number.isFinite(waypoints[0]!.from[0])).toBe(true)
    expect(Number.isFinite(waypoints[0]!.to[2])).toBe(true)
  })

  it('interpolates strictly in a straight line and clamps t to [0, 1]', () => {
    const game = {
      ...baseGame,
      structures,
      jobs: [makeJob()],
      crew: [makeAstronaut()],
    }

    const wp = astronautWaypoints(game, config, grid)[0]!
    expect(astronautPositionAt(wp, 0)).toEqual(wp.from)
    expect(astronautPositionAt(wp, -0.5)).toEqual(wp.from)
    expect(astronautPositionAt(wp, 1)).toEqual(wp.to)
    expect(astronautPositionAt(wp, 1.5)).toEqual(wp.to)

    const mid = astronautPositionAt(wp, 0.5)
    expect(mid[0]).toBeCloseTo((wp.from[0] + wp.to[0]) / 2)
    expect(mid[1]).toBe(0)
    expect(mid[2]).toBeCloseTo((wp.from[2] + wp.to[2]) / 2)
  })

  it('routes astronauts around blocking structures instead of walking through them', () => {
    const blocker: StructureInstance = {
      id: 'blocker',
      type: 'greenhouse',
      tile: [5, 5],
      status: 'active',
      upgrades: [],
    }
    const [bx, , bz] = tileCenter(blocker.tile, 2, grid)
    const from: readonly [number, number, number] = [bx - 1.6, 0, bz]
    const to: readonly [number, number, number] = [bx + 1.6, 0, bz]
    const path = findAstronautPath(from, to, [blocker], config, grid)

    expect(path.length).toBeGreaterThan(2)
    // Sample along the path and ensure no point enters the blocker interior
    for (let t = 0.05; t <= 0.95; t += 0.05) {
      const pt = astronautPositionAt({ from, to, path }, t)
      const inside = Math.abs(pt[0] - bx) < 0.8 && Math.abs(pt[2] - bz) < 0.8
      expect(inside).toBe(false)
    }
  })
})
