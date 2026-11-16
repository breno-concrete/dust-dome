import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { createGame } from '../../engine/game'
import type { ActiveEvent, StructureInstance } from '../../engine/types'
import { STATUS_COLOR, structureVisualState, visualState } from './visualState'

const storm: ActiveEvent = {
  id: 'e1',
  ruleId: 'c3_global_storm',
  kind: 'global_dust_storm',
  endsAt: null,
  solarFactor: 0.2,
  blocksExternalJobs: false,
}

const makeStructure = (overrides: Partial<StructureInstance> = {}): StructureInstance => ({
  id: 's1',
  type: 'solar_panel',
  tile: [2, 2],
  status: 'active',
  upgrades: [],
  ...overrides,
})

describe('visualState', () => {
  const game = createGame(config, 1)

  it('summer is brighter than winter', () => {
    const summer = visualState({ ...game, time: { ...game.time, season: 'summer' } }, config)
    const winter = visualState({ ...game, time: { ...game.time, season: 'winter' } }, config)
    expect(summer.light).toBeGreaterThan(winter.light)
  })

  it('winter is dark from seasons.winterDarknessFromCycle on', () => {
    const v = visualState(
      {
        ...game,
        time: { ...game.time, season: 'winter', cycle: config.seasons.winterDarknessFromCycle },
      },
      config,
    )
    expect(v.dark).toBe(true)
  })

  it('a dust storm fills the sky with haze and dims the light', () => {
    const clear = visualState(game, config)
    const dusty = visualState({ ...game, activeEvents: [storm] }, config)
    expect(dusty.dustHaze).toBeCloseTo(0.8)
    expect(dusty.light).toBeLessThan(clear.light)
  })

  it('an unheated base shows frost on the habitats', () => {
    const heated = visualState(game, config)
    const unheated = visualState({ ...game, power: { ...game.power, unheated: true } }, config)
    expect(heated.frost).toBe(false)
    expect(unheated.frost).toBe(true)

    const habitat = makeStructure({ type: 'habitat', status: 'active' })
    const solar = makeStructure({ type: 'solar_panel', status: 'active' })
    expect(structureVisualState(habitat, unheated).nonColorCue).toBe('frost')
    expect(structureVisualState(solar, unheated).nonColorCue).toBe('none')
  })

  it('the radiation alarm tints the scene during the warning phase', () => {
    const calm = visualState(game, config)
    const warning = visualState(
      {
        ...game,
        radiationStorm: { phase: 'warning', phaseEndsAt: 10, basedOn: null },
      },
      config,
    )
    const activeStorm = visualState(
      {
        ...game,
        radiationStorm: { phase: 'active', phaseEndsAt: 40, basedOn: null },
      },
      config,
    )
    expect(calm.radiationTint).toBe(false)
    expect(warning.radiationTint).toBe(true)
    expect(activeStorm.radiationTint).toBe(false)
  })

  it('maps damaged, clogged, short-circuited, building and active structures to distinct colors and non-color cues', () => {
    const clear = visualState(game, config)

    const active = structureVisualState(makeStructure({ status: 'active' }), clear)
    expect(active).toMatchObject({
      status: 'active',
      color: STATUS_COLOR.active,
      nonColorCue: 'none',
    })

    const building = structureVisualState(makeStructure({ status: 'building' }), clear)
    expect(building).toMatchObject({
      status: 'building',
      color: STATUS_COLOR.building,
      nonColorCue: 'construction',
    })

    const damaged = structureVisualState(makeStructure({ status: 'damaged' }), clear)
    expect(damaged).toMatchObject({
      status: 'damaged',
      color: STATUS_COLOR.damaged,
      nonColorCue: 'damage',
    })

    const clogged = structureVisualState(makeStructure({ status: 'clogged' }), clear)
    expect(clogged).toMatchObject({
      status: 'clogged',
      color: STATUS_COLOR.clogged,
      nonColorCue: 'dust',
    })

    const shortCircuit = structureVisualState(makeStructure({ status: 'short_circuit' }), clear)
    expect(shortCircuit).toMatchObject({
      status: 'short_circuit',
      color: STATUS_COLOR.short_circuit,
      nonColorCue: 'sparks',
    })
  })

  it('activates dustDevils only for active dust_devil events or recent panel hits, not continuously', () => {
    const calmSummer = visualState(
      { ...game, time: { ...game.time, season: 'summer' }, activeEvents: [], log: [] },
      config,
    )
    expect(calmSummer.dustDevils).toBe(0)

    const calmSpring = visualState(
      { ...game, time: { ...game.time, season: 'spring' }, activeEvents: [], log: [] },
      config,
    )
    expect(calmSpring.dustDevils).toBe(0)

    const activeDevilEvent: ActiveEvent = {
      id: 'dd1',
      ruleId: 'c1_dust_devils',
      kind: 'dust_devil',
      endsAt: 50,
      solarFactor: 1,
      blocksExternalJobs: false,
    }
    const explicitDevil = visualState(
      { ...game, time: { ...game.time, season: 'summer' }, activeEvents: [activeDevilEvent] },
      config,
    )
    expect(explicitDevil.dustDevils).toBeGreaterThanOrEqual(1)

    const recentHit = visualState(
      {
        ...game,
        time: { ...game.time, season: 'spring', elapsed: 45 },
        log: [
          {
            at: 40,
            cycle: 1,
            season: 'spring',
            kind: 'damaged',
            ref: 'solar-1',
            cause: 'c1_dust_devils',
          },
        ],
      },
      config,
    )
    expect(recentHit.dustDevils).toBeGreaterThanOrEqual(1)

    const expiredHit = visualState(
      {
        ...game,
        time: { ...game.time, season: 'spring', elapsed: 65 },
        log: [
          {
            at: 40,
            cycle: 1,
            season: 'spring',
            kind: 'damaged',
            ref: 'solar-1',
            cause: 'c1_dust_devils',
          },
        ],
      },
      config,
    )
    expect(expiredHit.dustDevils).toBe(0)
  })

  it('reports ambient cold intensity across summer, autumn, and winter', () => {
    const summer = visualState({ ...game, time: { ...game.time, season: 'summer' } }, config)
    const autumn = visualState({ ...game, time: { ...game.time, season: 'autumn' } }, config)
    const winter = visualState({ ...game, time: { ...game.time, season: 'winter' } }, config)

    expect(summer.cold).toBe(0)
    expect(autumn.cold).toBeGreaterThan(0)
    expect(autumn.cold).toBeLessThan(winter.cold)
    expect(winter.cold).toBe(1)
  })
})
