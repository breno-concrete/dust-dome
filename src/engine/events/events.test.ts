import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { createGame } from '../game'
import type { ActiveEvent, EventRule, GameConfig, GameState, SeasonId } from '../types'
import { updateEvents } from './events'

const SEASON_START = 1000
const SEASONS_IN_ORDER: SeasonId[] = ['spring', 'summer', 'autumn', 'winter']
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

const seasonDef = (id: SeasonId) => config.seasons.seasons.find((s) => s.id === id)!
const intervalRules = (cycle: number, season: SeasonId) =>
  config.events.filter((r) => r.cycles.includes(cycle) && r.season === season && r.intervalSeconds)
const factorFor = (cycle: number) =>
  cycle === config.seasons.cycles ? config.mission.finalCycleIntervalFactor : 1

/** A running game placed `into` seconds inside the given season (the season began at SEASON_START). */
function stateAt(cycle: number, season: SeasonId, seed = 42, into = 0): GameState {
  return {
    ...createGame(config, seed),
    briefing: null,
    time: { cycle, season, secondsIntoSeason: into, elapsed: SEASON_START + into },
  }
}

/** Moves the clock forward by dt, the way advanceTime does, then runs the events system. */
function step(state: GameState, dt: number, cfg: GameConfig = config): GameState {
  const time = {
    ...state.time,
    elapsed: state.time.elapsed + dt,
    secondsIntoSeason: state.time.secondsIntoSeason + dt,
  }
  return updateEvents({ ...state, time }, cfg, dt)
}

const activeOf = (ruleId: string): ActiveEvent => ({
  id: `e-${ruleId}`,
  ruleId,
  kind: 'dust_storm',
  endsAt: null,
  solarFactor: 0.5,
  blocksExternalJobs: false,
})

// US1 (Dev A) — scheduling, constitution II.11
describe('event scheduling', () => {
  it('schedules every interval rule of the current cycle and season, and only those', () => {
    for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
      for (const season of SEASONS_IN_ORDER) {
        const next = updateEvents(stateAt(cycle, season), config, 0).nextEventAt
        expect(Object.keys(next).sort()).toEqual(
          intervalRules(cycle, season)
            .map((r) => r.id)
            .sort(),
        )
      }
    }
  })

  it('draws every time inside the rule interval, for many seeds', () => {
    for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
      for (const season of SEASONS_IN_ORDER) {
        for (const seed of SEEDS) {
          const next = updateEvents(stateAt(cycle, season, seed), config, 0).nextEventAt
          for (const rule of intervalRules(cycle, season)) {
            const [lo, hi] = rule.intervalSeconds!
            const f = factorFor(cycle)
            expect(next[rule.id]).toBeGreaterThanOrEqual(SEASON_START + lo * f)
            expect(next[rule.id]).toBeLessThanOrEqual(SEASON_START + hi * f)
          }
        }
      }
    }
  })

  it('uses exactly the interval when its two ends are equal', () => {
    const fixed = config.events.find((r) => r.intervalSeconds?.[0] === r.intervalSeconds?.[1])!
    const next = updateEvents(stateAt(fixed.cycles[0], fixed.season), config, 0).nextEventAt
    expect(next[fixed.id]).toBe(SEASON_START + fixed.intervalSeconds![0])
  })

  it('stores the advanced generator state', () => {
    const before = stateAt(1, 'spring')
    expect(updateEvents(before, config, 0).rng).not.toBe(before.rng)
  })

  it('schedules the next occurrence inside the interval after an event fires', () => {
    const rule = intervalRules(1, 'spring')[0]
    const [lo, hi] = rule.intervalSeconds!
    for (const seed of SEEDS) {
      const first = updateEvents(stateAt(1, 'spring', seed), config, 0)
      const firedAt = first.nextEventAt[rule.id]
      const due = { ...first, time: { ...first.time, elapsed: firedAt - 1 } }
      const gap = step(due, 1).nextEventAt[rule.id] - firedAt
      expect(gap).toBeGreaterThanOrEqual(lo)
      expect(gap).toBeLessThanOrEqual(hi)
    }
  })

  it('counts the interval from the end of an event that has a duration', () => {
    const rule = config.events.find((r) => r.intervalSeconds && r.durationSeconds)!
    const [lo, hi] = rule.intervalSeconds!
    for (const seed of SEEDS) {
      const first = updateEvents(stateAt(rule.cycles[0], rule.season, seed), config, 0)
      const firedAt = first.nextEventAt[rule.id]
      const due = { ...first, time: { ...first.time, elapsed: firedAt - 1 } }
      const gap = step(due, 1).nextEventAt[rule.id] - firedAt
      expect(gap).toBeGreaterThanOrEqual(rule.durationSeconds! + lo)
      expect(gap).toBeLessThanOrEqual(rule.durationSeconds! + hi)
    }
  })

  it('does not delay the first occurrence of the season by the duration', () => {
    const rule = config.events.find((r) => r.intervalSeconds && r.durationSeconds)!
    const [lo, hi] = rule.intervalSeconds!
    for (const seed of SEEDS) {
      const next = updateEvents(stateAt(rule.cycles[0], rule.season, seed), config, 0).nextEventAt
      expect(next[rule.id] - SEASON_START).toBeGreaterThanOrEqual(lo)
      expect(next[rule.id] - SEASON_START).toBeLessThanOrEqual(hi)
    }
  })

  it('keeps the schedule and the generator untouched until an event is due', () => {
    const first = updateEvents(stateAt(1, 'spring'), config, 0)
    const again = step(first, 0.1)
    expect(again.nextEventAt).toEqual(first.nextEventAt)
    expect(again.rng).toBe(first.rng)
  })

  it('never schedules past the end of the season', () => {
    const rule: EventRule = { ...intervalRules(1, 'spring')[0], intervalSeconds: [9999, 99999] }
    const cfg: GameConfig = { ...config, events: [rule] }
    const length = seasonDef('spring').durationSeconds
    const first = updateEvents(stateAt(1, 'spring'), cfg, 0)
    expect(first.nextEventAt[rule.id]).toBe(SEASON_START + length)
    const later = step(first, length, cfg)
    expect(later.nextEventAt[rule.id]).toBe(SEASON_START + length)
    expect(later.rng).toBe(first.rng)
  })

  it('never schedules past the end of the season when the event has a duration', () => {
    const base = config.events.find((r) => r.intervalSeconds && r.durationSeconds)!
    const rule: EventRule = { ...base, intervalSeconds: [1, 1], durationSeconds: 9999 }
    const cfg: GameConfig = { ...config, events: [rule] }
    const length = seasonDef(rule.season).durationSeconds
    const first = updateEvents(stateAt(rule.cycles[0], rule.season), cfg, 0)
    expect(first.nextEventAt[rule.id]).toBe(SEASON_START + 1)
    const later = step(first, 1, cfg)
    expect(later.nextEventAt[rule.id]).toBe(SEASON_START + length)
  })

  it('does not mutate the state it receives', () => {
    const before = stateAt(1, 'spring')
    const snapshot = JSON.stringify(before)
    updateEvents(before, config, 0)
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('the same seed and the same time steps produce the same event times', () => {
    const run = (seed: number) => {
      let s = stateAt(1, 'spring', seed)
      const trace: Record<string, number>[] = []
      for (const dt of [0.5, 3, 12, 0.25, 40, 7, 90]) {
        s = step(s, dt)
        trace.push(s.nextEventAt)
      }
      return { trace, rng: s.rng }
    }
    expect(run(7)).toEqual(run(7))
    expect(run(7).trace).not.toEqual(run(8).trace)
  })

  it('removes every active event and stale schedule when the season changes', () => {
    const spring = updateEvents(stateAt(1, 'spring'), config, 0)
    const hurt = {
      ...spring,
      structures: spring.structures.map((s, i) =>
        i === 2 ? { ...s, status: 'damaged' as const } : s,
      ),
      activeEvents: [activeOf('c1_dust_devils')],
    }
    const summer = updateEvents({ ...hurt, time: { ...hurt.time, season: 'summer' } }, config, 0)
    expect(summer.activeEvents).toEqual([])
    expect(Object.keys(summer.nextEventAt)).toEqual(intervalRules(1, 'summer').map((r) => r.id))
    expect(summer.structures).toEqual(hurt.structures)
  })

  it('clears whole-season events when the next season has nothing to schedule', () => {
    const autumn = { ...stateAt(1, 'autumn'), activeEvents: [activeOf('c1_cold_autumn')] }
    const time = { ...autumn.time, season: 'winter' as const }
    const winter = updateEvents({ ...autumn, time }, config, 0)
    expect(winter.activeEvents).toEqual([])
    expect(winter.nextEventAt).toEqual({})
  })

  it('starts a new cycle with its own schedule', () => {
    const winter = { ...stateAt(1, 'winter'), nextEventAt: { c1_dust_devils: 1 } }
    const time = { ...winter.time, cycle: 2, season: 'spring' as const }
    const next = updateEvents({ ...winter, time }, config, 0)
    expect(Object.keys(next.nextEventAt)).toEqual(intervalRules(2, 'spring').map((r) => r.id))
  })

  it('multiplies intervals by finalCycleIntervalFactor in the last cycle', () => {
    const last = config.seasons.cycles
    const rule = intervalRules(last, 'spring')[0]
    expect(rule.cycles).toContain(last - 1)
    const f = config.mission.finalCycleIntervalFactor
    for (const seed of SEEDS) {
      const normal = updateEvents(stateAt(last - 1, 'spring', seed), config, 0)
      const final = updateEvents(stateAt(last, 'spring', seed), config, 0)
      // Same seed draws the same fraction of the interval, so the offsets differ by exactly f.
      expect(final.nextEventAt[rule.id] - SEASON_START).toBeCloseTo(
        (normal.nextEventAt[rule.id] - SEASON_START) * f,
      )
    }
  })
})

// US2 (Dev A) — dust
describe('dust events', () => {
  it.todo('a dust devil damages damagePanels random active solar panels')
  it.todo('panels with dust_filters are not damaged by dust devils')
  it.todo('clog hits the listed types with clogChance; dust_filters make them immune')
  it.todo('a dust storm stays active for durationSeconds with its solarFactor')
  it.todo(
    'a global dust storm lasts the whole season and short-circuits a listed structure every shortCircuitEverySeconds',
  )
  it.todo('darkness blocks external jobs for the whole season')
})

// US3 (Dev A) — radiation storm
describe('radiation storm', () => {
  it.todo(
    'happens perCycle times per cycle from fromCycle, at a seeded time in the allowed seasons',
  )
  it.todo('starts with a warning phase of warningSeconds, then an active phase of durationSeconds')
  it.todo(
    'when the active phase starts, astronauts outside or in a habitat without shelter are hit',
  )
  it.todo('carries the date and link of the real DONKI event it is based on')
})
