import { describe, expect, it, vi } from 'vitest'
import { config } from '../config/loadConfig'
import { createGame, tick, winTargets } from './game'
import { gameAt } from './testState'

// Every step of the tick records its name and then runs the real code, so the other tests in
// this file see the real engine.
const calls = vi.hoisted(() => [] as string[])

function recorded<M extends Record<string, unknown>>(mod: M, name: string, step: string): M {
  const real = mod[name] as (...args: unknown[]) => unknown
  return {
    ...mod,
    [name]: (...args: unknown[]) => {
      calls.push(step)
      return real(...args)
    },
  }
}

vi.mock('./time', async (orig) => recorded(await orig(), 'advanceTime', 'time'))
vi.mock('./events/events', async (orig) => recorded(await orig(), 'updateEvents', 'events'))
vi.mock('./power', async (orig) => recorded(await orig(), 'computePower', 'power'))
vi.mock('./economy', async (orig) => recorded(await orig(), 'applyProduction', 'production'))
vi.mock('./jobs', async (orig) => recorded(await orig(), 'updateJobs', 'jobs'))
vi.mock('./crew', async (orig) => recorded(await orig(), 'updateCrew', 'crew'))
vi.mock('./outcome', async (orig) => recorded(await orig(), 'checkOutcome', 'outcome'))

describe('createGame', () => {
  const game = createGame(config, 42)

  it('places the starting base from mission.json', () => {
    expect(game.structures.map((s) => s.type)).toEqual(
      config.mission.startingStructures.map((s) => s.type),
    )
    expect(game.structures.every((s) => s.status === 'active')).toBe(true)
  })

  it('starts every astronaut ready to work (not resting)', () => {
    expect(game.crew.every((a) => a.resting === false)).toBe(true)
  })

  it('starts the crew inside the first habitat', () => {
    expect(game.crew).toHaveLength(config.mission.crew)
    const habitat = game.structures.find((s) => s.type === 'habitat')
    expect(game.crew.every((a) => a.habitatId === habitat?.id && a.location === 'inside')).toBe(
      true,
    )
  })

  it('starts on cycle 1, spring, with the first briefing open', () => {
    expect(game.time).toMatchObject({ cycle: 1, season: 'spring', elapsed: 0 })
    expect(game.briefing).toEqual({ cycle: 1, season: 'spring' })
  })

  it('loads the starting stock and sets every switch to min', () => {
    for (const r of config.resources) expect(game.stock[r.id]).toBe(r.start)
    expect(Object.values(game.powerModes).every((m) => m === 'min')).toBe(true)
  })

  it('createGame logs the first season_start', () => {
    const first = config.seasons.seasons[0].id
    expect(game.log).toEqual([{ at: 0, cycle: 1, season: first, kind: 'season_start', ref: first }])
  })

  it('createGame already has a power report', () => {
    expect(game.power.productionKw).toBeGreaterThan(0)
    expect(game.power.demandKw).toBeGreaterThan(0)
    expect(game.power.balanceKw).toBeCloseTo(game.power.productionKw - game.power.demandKw)
    expect(game.batteryEu).toBe(0)
  })

  it('is deterministic for the same seed', () => {
    expect(createGame(config, 42)).toEqual(game)
  })
})

describe('tick', () => {
  it('does nothing while a briefing is open', () => {
    const game = createGame(config, 1)
    expect(tick(game, config, 1)).toBe(game)
  })

  it('tick does nothing once the mission time is over', () => {
    const seasons = config.seasons.seasons
    const winter = seasons[seasons.length - 1]
    const over = gameAt(config, config.seasons.cycles, winter.id, winter.durationSeconds)
    expect(tick(over, config, 1)).toBe(over)
  })

  it('runs time -> events -> power -> production -> jobs -> crew -> outcome in order', () => {
    const s = gameAt(config, 1, 'spring', 10)
    calls.length = 0
    tick(s, config, 1)
    expect(calls).toEqual(['time', 'events', 'power', 'production', 'jobs', 'crew', 'outcome'])
  })
})

describe('winTargets', () => {
  it('asks for one season of reserves for colonists + crew', () => {
    const people = config.mission.colonists + config.mission.crew
    expect(winTargets(config)).toEqual({
      people,
      reserves: {
        oxygen: people * config.mission.needs.oxygen,
        water: people * config.mission.needs.water,
        food: people * config.mission.needs.food,
      },
      habitatCapacity: people,
    })
  })
})
