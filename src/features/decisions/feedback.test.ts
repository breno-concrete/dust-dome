// Commander Vega's advice after a game over: what to change next time, from what happened.
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { GameState, LogEntry, StructureInstance } from '../../engine/types'
import { buildGameOverFeedback } from './feedback'

const name = (id: string) => config.structures.find((s) => s.id === id)!.name
const resourceName = (id: string) => config.resources.find((r) => r.id === id)!.name
const people = config.mission.colonists + config.mission.crew

function base(): GameState {
  act(() => useGameStore.getState().start(42))
  return useGameStore.getState().game!
}

const death = (cause: string, at = 100): LogEntry => ({
  at,
  cycle: 2,
  season: 'summer',
  kind: 'death',
  ref: 'a1',
  cause,
})

/** A lost game whose crew died of `cause`, with optional changes to the final base. */
function lost(cause: string, patch: Partial<GameState> = {}): GameState {
  return {
    ...base(),
    status: 'lost',
    lostReason: 'crew_lost',
    log: [death(cause)],
    ...patch,
  }
}

const withUpgrade = (g: GameState, type: string, upgrade: string): StructureInstance[] =>
  g.structures.map((s) => (s.type === type ? { ...s, upgrades: [...s.upgrades, upgrade] } : s))
const without = (g: GameState, type: string) => g.structures.filter((s) => s.type !== type)
const ids = (g: GameState) => buildGameOverFeedback(g, config)!.tips.map((t) => t.id)
const text = (g: GameState) =>
  buildGameOverFeedback(g, config)!
    .tips.map((t) => t.text.en)
    .join(' | ')

describe('buildGameOverFeedback', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
  })

  it('has nothing to say while the mission is running or after a win', () => {
    expect(buildGameOverFeedback(base(), config)).toBeNull()
    expect(buildGameOverFeedback({ ...base(), status: 'won' }, config)).toBeNull()
  })

  it('always gives between one and three tips, in English and Portuguese', () => {
    const causes = ['cold', 'radiation_storm', 'empty_oxygen', 'empty_water', 'empty_food']
    for (const cause of causes) {
      const feedback = buildGameOverFeedback(lost(cause), config)!
      expect(feedback.tips.length, cause).toBeGreaterThanOrEqual(1)
      expect(feedback.tips.length, cause).toBeLessThanOrEqual(3)
      for (const tip of feedback.tips) {
        expect(tip.text.en.length, `${cause}/${tip.id}`).toBeGreaterThan(20)
        expect((tip.text.pt ?? '').length, `${cause}/${tip.id}`).toBeGreaterThan(20)
      }
    }
  })

  it('advises about the first death, not a later one', () => {
    const g = lost('radiation_storm', {
      log: [death('radiation_storm', 100), death('cold', 400)],
    })
    expect(buildGameOverFeedback(g, config)!.cause).toBe('radiation_storm')
  })

  describe('cold', () => {
    it('without insulation: build it, and say by when', () => {
      const g = lost('cold')
      expect(ids(g)[0]).toBe('insulation')
      expect(text(g)).toContain('Thermal insulation')
      expect(text(g)).toContain(`year ${config.mission.insulationRequiredFromCycle}`)
    })

    it('with insulation but no power for the heating: talk about power', () => {
      const g0 = lost('cold')
      const g = {
        ...g0,
        structures: withUpgrade(g0, 'habitat', 'thermal_insulation'),
        power: { ...g0.power, unheated: true, balanceKw: -5 },
      }
      expect(ids(g)).not.toContain('insulation')
      expect(ids(g)[0]).toBe('power')
    })
  })

  describe('radiation storm', () => {
    it('without a shelter: build the Radiation shelter', () => {
      const g = lost('radiation_storm')
      expect(ids(g)[0]).toBe('shelter')
      expect(text(g)).toContain('Radiation shelter')
    })

    it('with a shelter: press Take shelter within the seconds of warning', () => {
      const g0 = lost('radiation_storm')
      const g = { ...g0, structures: withUpgrade(g0, 'habitat', 'radiation_shelter') }
      expect(ids(g)).not.toContain('shelter')
      expect(text(g)).toContain('Take shelter')
      expect(text(g)).toContain(`${config.mission.radiationStorm.warningSeconds} seconds`)
    })
  })

  describe.each([
    ['empty_oxygen', 'oxygen_generator'],
    ['empty_water', 'ice_melter'],
    ['empty_food', 'greenhouse'],
  ])('%s', (cause, maker) => {
    it('no machine for it: build one', () => {
      const g0 = lost(cause)
      const g = { ...g0, structures: without(g0, maker) }
      expect(ids(g)[0]).toBe('build')
      expect(text(g)).toContain(name(maker).en)
    })

    it('the machine shut down for lack of power: talk about power', () => {
      const g0 = lost(cause)
      const g = { ...g0, power: { ...g0.power, shed: [maker] } }
      expect(ids(g)[0]).toBe('power')
      expect(text(g)).toContain(name(maker).en)
    })

    it('the machine was switched off: say to switch it on', () => {
      const g0 = lost(cause)
      const g = { ...g0, powerModes: { ...g0.powerModes, [maker]: 'off' as const } }
      expect(ids(g)[0]).toBe('switch')
      expect(text(g)).toContain(name(maker).en)
    })

    it('the machine was broken or clogged: repair or clean it', () => {
      const g0 = lost(cause)
      const g = {
        ...g0,
        structures: g0.structures.map((s) =>
          s.type === maker ? { ...s, status: 'damaged' as const } : s,
        ),
      }
      expect(ids(g)[0]).toBe('fix')
    })
  })

  it('food: the greenhouse also needs water, so say so when the water ran out', () => {
    const g0 = lost('empty_food')
    const g = { ...g0, stock: { ...g0.stock, water: 0 } }
    expect(ids(g)).toContain('water')
    expect(text(g)).toContain('Water')
  })

  describe('survived but did not reach the goals', () => {
    const missed = (patch: Partial<GameState>): GameState => ({
      ...base(),
      status: 'lost',
      lostReason: 'targets_missed',
      log: [],
      ...patch,
    })

    it('names the reserve that was short and the goal', () => {
      const g0 = base()
      const g = missed({ stock: { ...g0.stock, oxygen: 10 } })
      const tips = buildGameOverFeedback(g, config)!.tips
      const tip = tips.find((t) => t.id === 'reserve-oxygen')!
      expect(tip.text.en).toContain(resourceName('oxygen').en)
      expect(tip.text.en).toContain(String(people))
    })

    it('says how many habitat modules are still missing', () => {
      const habitat = config.structures.find((s) => s.id === 'habitat')!
      const needed = people / (habitat.capacity ?? 1)
      const g0 = base()
      const have = g0.structures.filter((s) => s.type === 'habitat').length
      const g = missed({ stock: { ...g0.stock, oxygen: 99, water: 99, food: 99 } })
      const tip = buildGameOverFeedback(g, config)!.tips.find((t) => t.id === 'habitats')!
      expect(tip.text.en).toContain(String(needed - have))
    })

    it('has the cause "targets_missed"', () => {
      expect(buildGameOverFeedback(missed({}), config)!.cause).toBe('targets_missed')
    })
  })
})
