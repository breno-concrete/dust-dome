import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import type { SepEvent } from '../../data/donki'
import { bringAllInside } from '../actions'
import { updateCrew } from '../crew'
import { createGame } from '../game'
import { updateJobs } from '../jobs'
import { withCrew, withJobs, withStructures } from '../testState'
import type {
  ActiveEvent,
  EventRule,
  GameConfig,
  GameState,
  GameTime,
  RadiationStorm,
  SeasonId,
  StructureInstance,
  StructureStatus,
} from '../types'
import { radiationPlan, updateEvents, updateRadiationStorm } from './events'

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

  it('clears the previous season events when the next season has nothing to schedule', () => {
    const autumn = { ...stateAt(1, 'autumn'), activeEvents: [activeOf('c1_cold_autumn')] }
    const time = { ...autumn.time, season: 'winter' as const }
    const winter = updateEvents({ ...autumn, time }, config, 0)
    // Only the winter's own whole-season rules remain (US2 scenario 6).
    const own = config.events
      .filter((r) => r.cycles.includes(1) && r.season === 'winter' && !r.intervalSeconds)
      .map((r) => r.id)
    expect(winter.activeEvents.map((e) => e.ruleId)).toEqual(own)
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

// US2 (Dev A) — dust, cold and darkness. Constitution II.10–II.11; spec 002, US2 scenarios 1–9.
// Numbers come from the config or from rules built in the test, never from the canon.

const TEMPLATE = config.events.find((r) => r.intervalSeconds)!
const FILTERS = 'dust_filters'
const HIT_KINDS = ['damaged', 'clogged', 'short_circuit']

/** A rule owned by the test: spring of cycle 1, one occurrence every second, no effects. */
function rule(over: Partial<EventRule>): EventRule {
  return {
    ...TEMPLATE,
    id: 't_rule',
    kind: 'dust_devil',
    cycles: [1],
    season: 'spring',
    intervalSeconds: [1, 1],
    durationSeconds: undefined,
    effects: {},
    ...over,
  }
}
const only = (...rules: EventRule[]): GameConfig => ({ ...config, events: rules })

function struct(
  type: string,
  n: number,
  status: StructureStatus = 'active',
  upgrades: string[] = [],
): StructureInstance {
  return { id: `${type}-${n}`, type, tile: [n, 0] as const, status, upgrades }
}
const many = (type: string, count: number) =>
  Array.from({ length: count }, (_, i) => struct(type, i + 1))

function base(structures: StructureInstance[], cycle = 1, season: SeasonId = 'spring', seed = 42) {
  return { ...stateAt(cycle, season, seed), structures }
}

/** Steps `total` seconds in ticks of at most `dt`. */
function advance(state: GameState, total: number, dt: number, cfg: GameConfig): GameState {
  let s = state
  for (let done = 0; done < total; done += dt) s = step(s, Math.min(dt, total - done), cfg)
  return s
}

/** Schedules the rules (dt 0) and steps 1 s: the first occurrence of a [1, 1] rule. */
const firstOccurrence = (state: GameState, cfg: GameConfig) =>
  step(updateEvents(state, cfg, 0), 1, cfg)

/** The same game, moved to the first instant of another season. */
function toSeason(state: GameState, cycle: number, season: SeasonId): GameState {
  return { ...state, time: { cycle, season, secondsIntoSeason: 0, elapsed: state.time.elapsed } }
}

const statusOf = (s: GameState, id: string) => s.structures.find((x) => x.id === id)!.status
const withStatus = (s: GameState, status: StructureStatus, type?: string) =>
  s.structures.filter((x) => x.status === status && (!type || x.type === type))
const hits = (s: GameState) => s.log.filter((e) => HIT_KINDS.includes(e.kind))
const hitSummary = (s: GameState) => hits(s).map(({ kind, ref, cause }) => ({ kind, ref, cause }))

describe('dust devils (US2 scenario 1)', () => {
  const devil = rule({ effects: { damagePanels: 3 } })
  const cfg = only(devil)

  it('damages damagePanels different eligible panels', () => {
    for (const seed of SEEDS) {
      const s = firstOccurrence(base(many('solar_panel', 5), 1, 'spring', seed), cfg)
      const damaged = withStatus(s, 'damaged', 'solar_panel')
      expect(damaged).toHaveLength(3)
      expect(new Set(damaged.map((x) => x.id)).size).toBe(3)
    }
  })

  it('damages every eligible panel when there are fewer than damagePanels', () => {
    const s = firstOccurrence(base(many('solar_panel', 2)), cfg)
    expect(withStatus(s, 'damaged', 'solar_panel')).toHaveLength(2)
  })

  it('only damages panels that are finished, have no dust filters and are active', () => {
    const panels = [
      struct('solar_panel', 1, 'active', [FILTERS]),
      struct('solar_panel', 2, 'building'),
      struct('solar_panel', 3, 'clogged'),
      struct('solar_panel', 4, 'short_circuit'),
      struct('solar_panel', 5, 'damaged'),
      struct('solar_panel', 6, 'active'),
    ]
    const wide = only(rule({ effects: { damagePanels: 6 } }))
    for (const seed of SEEDS) {
      const s = firstOccurrence(base(panels, 1, 'spring', seed), wide)
      expect(statusOf(s, 'solar_panel-6')).toBe('damaged')
      for (const p of panels.slice(0, 5)) expect(statusOf(s, p.id)).toBe(p.status)
      expect(hits(s).map((e) => e.ref)).toEqual(['solar_panel-6'])
    }
  })

  it('never damages a structure that is not a solar panel', () => {
    const list = [
      struct('mine', 1),
      struct('oxygen_generator', 1),
      struct('ice_melter', 1),
      struct('solar_panel', 1),
    ]
    const s = firstOccurrence(base(list), only(rule({ effects: { damagePanels: 4 } })))
    expect(statusOf(s, 'solar_panel-1')).toBe('damaged')
    expect(withStatus(s, 'active').map((x) => x.type)).toEqual([
      'mine',
      'oxygen_generator',
      'ice_melter',
    ])
  })

  it('loses the damage when no panel is eligible, and the rest of the occurrence still applies', () => {
    const list = [struct('solar_panel', 1, 'active', [FILTERS]), struct('mine', 1)]
    const both = only(rule({ effects: { damagePanels: 1, clog: ['mine'] } }))
    const s = firstOccurrence(base(list), both)
    expect(statusOf(s, 'solar_panel-1')).toBe('active')
    expect(statusOf(s, 'mine-1')).toBe('clogged')
  })

  it('draws the panels at random: different seeds hit different panels', () => {
    const one = only(rule({ effects: { damagePanels: 1 } }))
    const picked = SEEDS.map((seed) =>
      withStatus(firstOccurrence(base(many('solar_panel', 5), 1, 'spring', seed), one), 'damaged')
        .map((x) => x.id)
        .join(),
    )
    expect(picked).not.toContain('')
    expect(new Set(picked).size).toBeGreaterThan(1)
  })

  it('is instant: it damages panels but leaves no active event', () => {
    const s = firstOccurrence(base(many('solar_panel', 3)), cfg)
    expect(withStatus(s, 'damaged')).not.toHaveLength(0)
    expect(s.activeEvents).toEqual([])
  })
})

describe('clogging (US2 scenario 2)', () => {
  const listed = ['oxygen_generator', 'mine', 'iron_refinery']
  const crowd = [
    ...many('oxygen_generator', 3),
    ...many('mine', 2),
    ...many('iron_refinery', 2),
    ...many('ice_melter', 2),
  ]

  it('clogs exactly one eligible structure of each listed type', () => {
    const cfg = only(rule({ effects: { clog: listed, clogChance: 1 } }))
    for (const seed of SEEDS) {
      const s = firstOccurrence(base(crowd, 1, 'spring', seed), cfg)
      for (const type of listed) expect(withStatus(s, 'clogged', type)).toHaveLength(1)
      expect(withStatus(s, 'clogged', 'ice_melter')).toHaveLength(0)
    }
  })

  it('always clogs when the rule has no clogChance', () => {
    const cfg = only(rule({ effects: { clog: ['mine'] } }))
    for (const seed of SEEDS) {
      const s = firstOccurrence(base(many('mine', 2), 1, 'spring', seed), cfg)
      expect(withStatus(s, 'clogged', 'mine')).toHaveLength(1)
    }
  })

  it('never clogs with clogChance 0, while the panel damage still happens', () => {
    const cfg = only(rule({ effects: { damagePanels: 1, clog: ['mine'], clogChance: 0 } }))
    for (const seed of SEEDS) {
      const s = firstOccurrence(
        base([struct('solar_panel', 1), struct('mine', 1)], 1, 'spring', seed),
        cfg,
      )
      expect(statusOf(s, 'solar_panel-1')).toBe('damaged')
      expect(statusOf(s, 'mine-1')).toBe('active')
    }
  })

  it('draws clogChance once per occurrence: the listed types clog together or not at all', () => {
    const cfg = only(rule({ effects: { clog: ['mine', 'iron_refinery'], clogChance: 0.5 } }))
    const counts = SEEDS.map(
      (seed) =>
        withStatus(
          firstOccurrence(
            base([struct('mine', 1), struct('iron_refinery', 1)], 1, 'spring', seed),
            cfg,
          ),
          'clogged',
        ).length,
    )
    expect(counts.every((c) => c === 0 || c === 2)).toBe(true)
    expect(counts).toContain(0)
    expect(counts).toContain(2)
  })

  it('only clogs structures that are finished, have no dust filters and are active', () => {
    const mines = [
      struct('mine', 1, 'active', [FILTERS]),
      struct('mine', 2, 'building'),
      struct('mine', 3, 'damaged'),
      struct('mine', 4, 'short_circuit'),
      struct('mine', 5, 'clogged'),
      struct('mine', 6, 'active'),
    ]
    const cfg = only(rule({ effects: { clog: ['mine'] } }))
    for (const seed of SEEDS) {
      const s = firstOccurrence(base(mines, 1, 'spring', seed), cfg)
      expect(statusOf(s, 'mine-6')).toBe('clogged')
      for (const m of mines.slice(0, 5)) expect(statusOf(s, m.id)).toBe(m.status)
      expect(hits(s).map((e) => e.ref)).toEqual(['mine-6'])
    }
  })

  it('skips a listed type with nothing eligible, or unknown, and still clogs the other types', () => {
    const cfg = only(rule({ effects: { clog: ['iron_refinery', 'not_a_structure', 'mine'] } }))
    const list = [struct('iron_refinery', 1, 'active', [FILTERS]), struct('mine', 1)]
    const s = firstOccurrence(base(list), cfg)
    expect(statusOf(s, 'iron_refinery-1')).toBe('active')
    expect(statusOf(s, 'mine-1')).toBe('clogged')
  })

  it('a dust storm with clog clogs on every occurrence', () => {
    const storm = rule({
      kind: 'dust_storm',
      durationSeconds: 5,
      effects: { solarFactor: 0.5, clog: ['mine'] },
    })
    const cfg = only(storm)
    const first = firstOccurrence(base(many('mine', 2)), cfg)
    expect(withStatus(first, 'clogged', 'mine')).toHaveLength(1)
    // The next storm starts one interval after this one ends.
    const second = advance(first, 5 + 1, 1, cfg)
    expect(withStatus(second, 'clogged', 'mine')).toHaveLength(2)
  })
})

describe('dust storms with a duration (US2 scenario 3)', () => {
  const D = 5
  const storm = rule({ kind: 'dust_storm', durationSeconds: D, effects: { solarFactor: 0.3 } })
  const cfg = only(storm)
  const storms = (s: GameState) => s.activeEvents.filter((e) => e.ruleId === storm.id)

  it('starts an active event with the rule solarFactor that ends durationSeconds later', () => {
    const scheduled = updateEvents(base([]), cfg, 0)
    expect(storms(scheduled)).toEqual([])
    const s = step(scheduled, 1, cfg)
    expect(storms(s)).toHaveLength(1)
    expect(storms(s)[0]).toMatchObject({
      ruleId: storm.id,
      kind: 'dust_storm',
      endsAt: SEASON_START + 1 + D,
      solarFactor: 0.3,
      blocksExternalJobs: false,
    })
  })

  it('stays active until endsAt and is removed when the game time reaches it', () => {
    const started = firstOccurrence(base([]), cfg)
    const almost = step(started, D - 0.5, cfg)
    expect(storms(almost)).toHaveLength(1)
    expect(storms(step(almost, 0.5, cfg))).toEqual([])
  })

  it('gives each occurrence its own deterministic id', () => {
    const run = () => {
      const first = firstOccurrence(base([]), cfg)
      const second = advance(first, D + 1, 1, cfg)
      return [storms(first)[0]?.id, storms(second)[0]?.id]
    }
    const [a, b] = run()
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a).not.toBe(b)
    expect(run()).toEqual([a, b])
  })

  it('uses solarFactor 1 when the rule has none', () => {
    const plain = rule({ kind: 'dust_storm', durationSeconds: D, effects: {} })
    const s = firstOccurrence(base([]), only(plain))
    expect(s.activeEvents.map((e) => e.solarFactor)).toEqual([1])
  })

  it('a storm that starts and ends inside one tick still clogs and leaves no active event', () => {
    const clogging = rule({ kind: 'dust_storm', durationSeconds: D, effects: { clog: ['mine'] } })
    const c = only(clogging)
    const s = step(updateEvents(base([struct('mine', 1)]), c, 0), 1 + D + 0.5, c)
    expect(statusOf(s, 'mine-1')).toBe('clogged')
    expect(s.activeEvents).toEqual([])
  })

  it('ends at the season change, while the clog it caused stays', () => {
    const clogging = rule({ kind: 'dust_storm', durationSeconds: D, effects: { clog: ['mine'] } })
    const c = only(clogging)
    const during = firstOccurrence(base([struct('mine', 1)]), c)
    expect(during.activeEvents).toHaveLength(1)
    const summer = updateEvents(toSeason(during, 1, 'summer'), c, 0)
    expect(summer.activeEvents).toEqual([])
    expect(statusOf(summer, 'mine-1')).toBe('clogged')
  })
})

describe('global dust storm (US2 scenario 4)', () => {
  const g = config.events.find((r) => r.kind === 'global_dust_storm' && r.cycles.includes(3))!
  const P = g.effects.shortCircuitEverySeconds!
  const cfg = only(g)
  const yard = [...many('mine', 6), ...many('iron_refinery', 6), ...many('solar_panel', 2)]
  const summer = (structures = yard, seed = 42) => base(structures, 3, 'summer', seed)
  const globals = (s: GameState) => s.activeEvents.filter((e) => e.ruleId === g.id)
  const shorted = (s: GameState) => withStatus(s, 'short_circuit')

  it('is active the whole summer from the first tick, created only once', () => {
    const first = updateEvents(summer(), cfg, 0)
    expect(globals(first)).toEqual([
      expect.objectContaining({
        kind: 'global_dust_storm',
        endsAt: null,
        solarFactor: g.effects.solarFactor ?? 1,
        blocksExternalJobs: false,
      }),
    ])
    const late = advance(first, seasonDef('summer').durationSeconds - 1, 10, cfg)
    expect(globals(late)).toHaveLength(1)
  })

  it('short-circuits one mine or refinery every shortCircuitEverySeconds from the start of summer', () => {
    const first = updateEvents(summer(), cfg, 0)
    const before = advance(first, P - 0.5, 1, cfg)
    expect(shorted(before)).toHaveLength(0)
    const atP = step(before, 0.5, cfg)
    expect(shorted(atP)).toHaveLength(1)
    expect(['mine', 'iron_refinery']).toContain(shorted(atP)[0].type)
    expect(shorted(advance(atP, 2 * P, 1, cfg))).toHaveLength(3)
  })

  it('gives the same short circuits for any tick size', () => {
    const total = 4 * P + 3
    const run = (dt: number) => advance(updateEvents(summer(), cfg, 0), total, dt, cfg)
    const small = run(1)
    expect(shorted(small)).toHaveLength(4)
    for (const dt of [7, P, total]) {
      const other = run(dt)
      expect(other.structures).toEqual(small.structures)
      expect(hitSummary(other)).toEqual(hitSummary(small))
    }
  })

  it('never short-circuits a type that is not listed', () => {
    const list = [...many('solar_panel', 3), ...many('oxygen_generator', 2), struct('mine', 1)]
    const s = advance(updateEvents(summer(list), cfg, 0), 3 * P, 1, cfg)
    expect(shorted(s).map((x) => x.id)).toEqual(['mine-1'])
  })

  it('can hit a clogged structure, never a filtered, unfinished or already shorted one', () => {
    const mines = [
      struct('mine', 1, 'active', [FILTERS]),
      struct('mine', 2, 'building'),
      struct('mine', 3, 'short_circuit'),
      struct('mine', 4, 'clogged'),
    ]
    const s = advance(updateEvents(summer(mines), cfg, 0), P, 1, cfg)
    expect(statusOf(s, 'mine-4')).toBe('short_circuit')
    for (const m of mines.slice(0, 3)) expect(statusOf(s, m.id)).toBe(m.status)
    expect(hits(s).map((e) => e.ref)).toEqual(['mine-4'])
  })

  it('loses an occurrence when nothing is eligible', () => {
    const list = [struct('mine', 1, 'active', [FILTERS]), struct('mine', 2)]
    const first = advance(updateEvents(summer(list), cfg, 0), P, 1, cfg)
    expect(statusOf(first, 'mine-2')).toBe('short_circuit')
    const later = advance(first, 2 * P, 1, cfg)
    expect(statusOf(later, 'mine-1')).toBe('active')
    expect(hits(later)).toHaveLength(1)
  })

  it('keeps the same period in the last cycle (finalCycleIntervalFactor does not apply)', () => {
    const last = config.seasons.cycles
    const g4 = config.events.find((r) => r.kind === 'global_dust_storm' && r.cycles.includes(last))!
    const P4 = g4.effects.shortCircuitEverySeconds!
    const c = only(g4)
    const first = updateEvents(base(yard, last, 'summer'), c, 0)
    const before = advance(first, P4 - 0.5, 1, c)
    expect(shorted(before)).toHaveLength(0)
    expect(shorted(step(before, 0.5, c))).toHaveLength(1)
  })

  it('does not count short circuits for the rest of a tick that crossed into summer', () => {
    // The tick crossed the season start: only 2 s of it belong to summer.
    const crossed = updateEvents(base(yard, 3, 'summer'), cfg, 0)
    const into2 = { ...crossed, time: { ...crossed.time, secondsIntoSeason: 2 } }
    const s = updateEvents(into2, cfg, 3 * P)
    expect(globals(s)).toHaveLength(1)
    expect(shorted(s)).toHaveLength(0)
    // Control: a tick that does cross a period boundary inside summer counts it.
    const intoP = { ...crossed, time: { ...crossed.time, secondsIntoSeason: P + 1 } }
    expect(shorted(updateEvents(intoP, cfg, 2))).toHaveLength(1)
  })

  it('ends with the summer, while the short circuits stay', () => {
    const s = advance(updateEvents(summer(), cfg, 0), P, 1, cfg)
    const id = shorted(s)[0]?.id
    expect(id).toBeDefined()
    const autumn = updateEvents(toSeason(s, 3, 'autumn'), cfg, 0)
    expect(globals(autumn)).toEqual([])
    expect(statusOf(autumn, id!)).toBe('short_circuit')
  })
})

describe('darkness and cold (US2 scenarios 5 and 6)', () => {
  const wholeSeason = (cycle: number, season: SeasonId) =>
    config.events.filter(
      (r) => r.cycles.includes(cycle) && r.season === season && !r.intervalSeconds,
    )

  it('every whole-season rule is active from the first tick of its season, only once', () => {
    let checked = 0
    for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
      for (const season of SEASONS_IN_ORDER) {
        const rules = wholeSeason(cycle, season)
        const first = updateEvents(stateAt(cycle, season), config, 0)
        const later = step(step(first, 1), 1)
        for (const s of [first, later]) {
          const mine = s.activeEvents.filter((e) => rules.some((r) => r.id === e.ruleId))
          expect(mine.map((e) => e.ruleId).sort()).toEqual(rules.map((r) => r.id).sort())
          for (const r of rules) {
            expect(mine.find((e) => e.ruleId === r.id)).toMatchObject({
              kind: r.kind,
              endsAt: null,
              solarFactor: r.effects.solarFactor ?? 1,
              blocksExternalJobs: r.effects.blocksExternalJobs ?? false,
            })
          }
        }
        checked += rules.length
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('darkness copies solarFactor and blocksExternalJobs from its rule', () => {
    const dark = rule({
      kind: 'darkness',
      cycles: [2],
      season: 'winter',
      intervalSeconds: undefined,
      effects: { solarFactor: 0, blocksExternalJobs: true },
    })
    const s = updateEvents(base([], 2, 'winter'), only(dark), 0)
    expect(s.activeEvents).toEqual([
      expect.objectContaining({
        ruleId: dark.id,
        kind: 'darkness',
        endsAt: null,
        solarFactor: 0,
        blocksExternalJobs: true,
      }),
    ])
  })

  it('the winters of cycles 2 to 4 are dark and block external jobs', () => {
    for (let cycle = 2; cycle <= config.seasons.cycles; cycle++) {
      const s = updateEvents(stateAt(cycle, 'winter'), config, 0)
      expect(s.activeEvents.filter((e) => e.kind === 'darkness')).toEqual([
        expect.objectContaining({ blocksExternalJobs: true, endsAt: null }),
      ])
    }
  })

  it('cold has no mechanical effect: full sunlight, no blocked jobs', () => {
    const s = updateEvents(stateAt(1, 'autumn'), config, 0)
    const cold = s.activeEvents.filter((e) => e.kind === 'cold')
    expect(cold).toHaveLength(1)
    expect(cold[0]).toMatchObject({ solarFactor: 1, blocksExternalJobs: false, endsAt: null })
  })

  it('is created even when the update starts in the middle of the season', () => {
    const s = updateEvents(stateAt(1, 'autumn', 42, 100), config, 0)
    expect(s.activeEvents.map((e) => e.kind)).toEqual(['cold'])
  })

  it('returns the same state when nothing changes', () => {
    const first = updateEvents(stateAt(1, 'autumn'), config, 0)
    expect(first.activeEvents).toHaveLength(1)
    const next = {
      ...first,
      time: { ...first.time, elapsed: first.time.elapsed + 1, secondsIntoSeason: 1 },
    }
    expect(updateEvents(next, config, 1)).toBe(next)
  })
})

describe('status priority, log and persistence (US2 scenarios 7 to 9)', () => {
  it('one status per structure: a short circuit replaces a clog and a later clog never undoes it', () => {
    const g = config.events.find((r) => r.kind === 'global_dust_storm' && r.cycles.includes(3))!
    const P = g.effects.shortCircuitEverySeconds!
    const devil = rule({ cycles: [3, 4], effects: { clog: ['mine'] } })
    const cfg = only(devil, { ...g, cycles: [3] })

    const spring = firstOccurrence(base([struct('mine', 1)], 3, 'spring'), cfg)
    expect(statusOf(spring, 'mine-1')).toBe('clogged')

    const summer = advance(updateEvents(toSeason(spring, 3, 'summer'), cfg, 0), P, 1, cfg)
    expect(statusOf(summer, 'mine-1')).toBe('short_circuit')

    const nextSpring = firstOccurrence(toSeason(summer, 4, 'spring'), cfg)
    expect(statusOf(nextSpring, 'mine-1')).toBe('short_circuit')
    expect(hits(nextSpring).map((e) => e.kind)).toEqual(['clogged', 'short_circuit'])
  })

  it('writes one log entry per structure hit, with the structure in ref and the rule in cause', () => {
    const devil = rule({ id: 't_devil', effects: { damagePanels: 2, clog: ['mine'] } })
    const before = base([...many('solar_panel', 3), struct('mine', 1)])
    const s = firstOccurrence(before, only(devil))
    expect(s.log.slice(0, before.log.length)).toEqual(before.log)

    const changed = s.structures.filter((x) => x.status !== 'active')
    const entries = hits(s)
    expect(entries).toHaveLength(3)
    expect(entries.map((e) => e.ref).sort()).toEqual(changed.map((x) => x.id).sort())
    for (const e of entries) {
      expect(e.kind).toBe(statusOf(s, e.ref))
      expect(e.cause).toBe('t_devil')
      expect(e.cycle).toBe(1)
      expect(e.season).toBe('spring')
    }
  })

  it('statuses outlive the event and the season change', () => {
    const devil = rule({ effects: { damagePanels: 1, clog: ['mine'] } })
    const cfg = only(devil)
    const hit = firstOccurrence(base([struct('solar_panel', 1), struct('mine', 1)]), cfg)
    expect(statusOf(hit, 'solar_panel-1')).toBe('damaged')
    expect(statusOf(hit, 'mine-1')).toBe('clogged')
    const summer = step(updateEvents(toSeason(hit, 1, 'summer'), cfg, 0), 10, cfg)
    const autumn = step(updateEvents(toSeason(summer, 1, 'autumn'), cfg, 0), 10, cfg)
    expect(autumn.structures).toEqual(hit.structures)
  })

  it('installing dust filters later does not fix a status', () => {
    const devil = rule({ effects: { damagePanels: 1, clog: ['mine'] } })
    const cfg = only(devil)
    const hit = firstOccurrence(base([struct('solar_panel', 1), struct('mine', 1)]), cfg)
    expect(withStatus(hit, 'active')).toHaveLength(0)
    const filtered = {
      ...hit,
      structures: hit.structures.map((x) => ({ ...x, upgrades: [...x.upgrades, FILTERS] })),
    }
    const later = advance(filtered, 10, 1, cfg)
    expect(statusOf(later, 'solar_panel-1')).toBe('damaged')
    expect(statusOf(later, 'mine-1')).toBe('clogged')
  })
})

describe('dust event determinism (US2)', () => {
  const devil = rule({
    intervalSeconds: [1, 3],
    effects: { damagePanels: 2, clog: ['oxygen_generator', 'mine'], clogChance: 0.5 },
  })
  const cfg = only(devil)
  const yard = [...many('solar_panel', 6), ...many('oxygen_generator', 3), ...many('mine', 3)]

  it('the same seed and the same time steps hit the same structures', () => {
    const run = (seed: number) => {
      let s = updateEvents(base(yard, 1, 'spring', seed), cfg, 0)
      for (const dt of [0.5, 3, 12, 0.25, 7, 4, 9]) s = step(s, dt, cfg)
      return { structures: s.structures, log: s.log, rng: s.rng }
    }
    expect(run(7).structures.filter((x) => x.status === 'damaged')).not.toHaveLength(0)
    expect(run(7)).toEqual(run(7))
    const outcomes = new Set(
      SEEDS.slice(0, 10).map((seed) =>
        run(seed)
          .log.map((e) => e.ref)
          .join(),
      ),
    )
    expect(outcomes.size).toBeGreaterThan(1)
  })

  it('applies the occurrences of different rules in time order, whatever the tick size', () => {
    const late = rule({ id: 't_late', intervalSeconds: [3, 3], effects: { clog: ['mine'] } })
    const early = rule({
      id: 't_early',
      intervalSeconds: [2, 2],
      effects: { clog: ['oxygen_generator'] },
    })
    const c = only(late, early)
    const start = updateEvents(base([struct('mine', 1), struct('oxygen_generator', 1)]), c, 0)
    const big = step(start, 3.5, c)
    expect(hits(big).map((e) => e.cause)).toEqual(['t_early', 't_late'])
    expect(hitSummary(advance(start, 3.5, 0.5, c))).toEqual(hitSummary(big))
  })

  it('does not mutate the state it receives when effects apply', () => {
    const scheduled = updateEvents(base(yard), cfg, 0)
    const due = {
      ...scheduled,
      time: { ...scheduled.time, elapsed: SEASON_START + 10, secondsIntoSeason: 10 },
    }
    const snapshot = JSON.stringify(due)
    const after = updateEvents(due, cfg, 10)
    expect(hits(after)).not.toHaveLength(0)
    expect(JSON.stringify(due)).toBe(snapshot)
  })

  it('an occurrence stuck at the end of the season applies nothing', () => {
    const never = rule({
      id: 't_never',
      intervalSeconds: [99999, 99999],
      effects: { clog: ['mine'] },
    })
    const often = rule({ id: 't_often', effects: { damagePanels: 1 } })
    const c = only(never, often)
    const length = seasonDef('spring').durationSeconds
    const s = step(
      updateEvents(base([struct('solar_panel', 1), struct('mine', 1)]), c, 0),
      length,
      c,
    )
    expect(statusOf(s, 'solar_panel-1')).toBe('damaged')
    expect(statusOf(s, 'mine-1')).toBe('active')
  })
})

// US3 (Dev A) — radiation storm. Constitution II.2, II.11 and VII; spec 002, US3 scenarios 1–7;
// data-model "Tempestade de radiação". Times, counts and seasons come from the config (or from a
// config changed in the test), never from the canon. The storm logic is tested through
// updateRadiationStorm(state, config, dt, events) with a list of events built in the test; the
// committed DONKI snapshot is only used by the integration test through updateEvents.

const STORM = config.mission.radiationStorm
const CYCLE_SECONDS = config.seasons.seasons.reduce((sum, s) => sum + s.durationSeconds, 0)
const MISSION_SECONDS = config.seasons.cycles * CYCLE_SECONDS
const cycleStart = (cycle: number) => (cycle - 1) * CYCLE_SECONDS
const STORM_SEEDS = SEEDS.slice(0, 12)
const SHELTER = config.upgrades.find((u) => u.effect === 'radiation_shelter')!.id
const EPSILON = 1e-9

/** SYNTHETIC SEP events, not real NASA records: only their position in the list matters. */
const fakeSep = (count: number): SepEvent[] =>
  Array.from({ length: count }, (_, i) => ({
    date: `2099-01-${String(i + 1).padStart(2, '0')}T00:00Z`,
    url: `https://example.test/synthetic-sep/${i}`,
  }))
const SEP14 = fakeSep(14)

function stormRules(over: Partial<GameConfig['mission']['radiationStorm']>): GameConfig {
  return { ...config, mission: { ...config.mission, radiationStorm: { ...STORM, ...over } } }
}

/** How many groups the event list is split into (data-model), computed from the config. */
const groupsOf = (cfg: GameConfig) => {
  const { fromCycle, perCycle } = cfg.mission.radiationStorm
  return (cfg.seasons.cycles - fromCycle + 1) * perCycle
}

/** The mission clock at game time t, as advanceTime keeps it (seasons and cycles in order). */
function clock(cfg: GameConfig, t: number): GameTime {
  const seasons = cfg.seasons.seasons
  const length = seasons.reduce((sum, s) => sum + s.durationSeconds, 0)
  const cycle = Math.min(Math.floor(t / length) + 1, cfg.seasons.cycles)
  let into = t - (cycle - 1) * length
  for (const s of seasons) {
    if (into < s.durationSeconds) {
      return { cycle, season: s.id, secondsIntoSeason: into, elapsed: t }
    }
    into -= s.durationSeconds
  }
  const last = seasons[seasons.length - 1]
  return { cycle, season: last.id, secondsIntoSeason: last.durationSeconds, elapsed: t }
}

/** A new game (briefing closed) with the clock at game time t. */
function gameAtTime(seed: number, t = 0, cfg: GameConfig = config): GameState {
  return { ...createGame(cfg, seed), briefing: null, time: clock(cfg, t) }
}

type Update = (state: GameState, dt: number) => GameState

const stormOnly =
  (cfg: GameConfig, events: SepEvent[]): Update =>
  (s, dt) =>
    updateRadiationStorm(s, cfg, dt, () => events)

/** The real path: updateEvents reads the committed snapshot itself. */
const allEvents =
  (cfg: GameConfig): Update =>
  (s, dt) =>
    updateEvents(s, cfg, dt)

/** The parts of tick() a radiation storm touches, in tick order: events, jobs, crew. */
const withEngine: Update = (s, dt) =>
  updateCrew(updateJobs(updateEvents(s, config, dt), config, dt), config, dt)

/** Moves the clock forward by dt (crossing seasons and cycles), then runs the update. */
const stepWith = (state: GameState, cfg: GameConfig, dt: number, update: Update): GameState =>
  update({ ...state, time: clock(cfg, state.time.elapsed + dt) }, dt)

interface Frame {
  elapsed: number
  cycle: number
  season: SeasonId
  storm: RadiationStorm | null
}

/** Runs from the state's clock to game time `until` in steps of dt, recording every step. */
function play(start: GameState, cfg: GameConfig, dt: number, until: number, update: Update) {
  let state = update(start, 0)
  const frames: Frame[] = []
  while (state.time.elapsed < until - EPSILON) {
    state = stepWith(state, cfg, Math.min(dt, until - state.time.elapsed), update)
    const { elapsed, cycle, season } = state.time
    frames.push({ elapsed, cycle, season, storm: state.radiationStorm })
  }
  return { state, frames }
}

interface StormSeen {
  /** Game time the warning began: the warning's phaseEndsAt minus warningSeconds. */
  startsAt: number
  /** Cycle and season of startsAt. */
  cycle: number
  season: SeasonId
  warningEndsAt: number
  activeEndsAt: number
  basedOn: RadiationStorm['basedOn']
  /** Phases in the order they were seen, without repeats. */
  phases: RadiationStorm['phase'][]
  frames: Frame[]
}

/** Splits the recorded steps into storms, from their first step to their last. */
function stormsIn(frames: Frame[], cfg: GameConfig): StormSeen[] {
  const out: StormSeen[] = []
  let current: StormSeen | null = null
  for (const f of frames) {
    if (!f.storm) {
      current = null
      continue
    }
    if (!current || (f.storm.phase === 'warning' && current.phases.at(-1) === 'active')) {
      current = {
        startsAt: NaN,
        cycle: f.cycle,
        season: f.season,
        warningEndsAt: NaN,
        activeEndsAt: NaN,
        basedOn: f.storm.basedOn,
        phases: [],
        frames: [],
      }
      out.push(current)
    }
    current.frames.push(f)
    if (current.phases.at(-1) !== f.storm.phase) current.phases.push(f.storm.phase)
    if (f.storm.phase === 'warning') current.warningEndsAt = f.storm.phaseEndsAt
    else current.activeEndsAt = f.storm.phaseEndsAt
  }
  for (const s of out) {
    s.startsAt = s.warningEndsAt - cfg.mission.radiationStorm.warningSeconds
    const at = clock(cfg, s.startsAt)
    s.cycle = at.cycle
    s.season = at.season
  }
  return out
}

/** A whole mission with only the radiation storm running, in steps of dt. */
function mission(seed: number, cfg: GameConfig = config, events: SepEvent[] = SEP14, dt = 1) {
  const run = play(gameAtTime(seed, 0, cfg), cfg, dt, MISSION_SECONDS, stormOnly(cfg, events))
  return { ...run, storms: stormsIn(run.frames, cfg) }
}

const defaultRuns = new Map<number, ReturnType<typeof mission>>()
/** The default mission of a seed, computed once because several tests read it. */
function missionOf(seed: number) {
  if (!defaultRuns.has(seed)) defaultRuns.set(seed, mission(seed))
  return defaultRuns.get(seed)!
}

/** Position of the cited event in the list, or -1 when it is not one of them. */
const citedIndex = (events: SepEvent[], basedOn: RadiationStorm['basedOn']) =>
  events.findIndex((e) => e.date === basedOn?.date && e.url === basedOn?.url)

/** Storms of one cycle, in time order. */
const stormsOfCycle = (storms: StormSeen[], cycle: number) =>
  storms.filter((s) => s.cycle === cycle).sort((a, b) => a.startsAt - b.startsAt)

/** Steps 1 s at a time until the warning starts; fails when no storm comes within a cycle. */
function untilWarning(start: GameState, update: Update): GameState {
  let s = update(start, 0)
  for (let t = 0; t < CYCLE_SECONDS; t++) {
    s = stepWith(s, config, 1, update)
    if (s.radiationStorm) return s
  }
  throw new Error('no radiation storm came')
}

/** Steps 1 s at a time while the warning lasts: the first state of the hit. */
function untilHit(start: GameState, update: Update): GameState {
  let s = start
  for (let t = 0; t <= STORM.warningSeconds + 1 && s.radiationStorm?.phase === 'warning'; t++) {
    s = stepWith(s, config, 1, update)
  }
  return s
}

/** Steps 1 s at a time while the storm lasts: the first state without it. */
function throughStorm(start: GameState, update: Update): GameState {
  let s = start
  const limit = STORM.warningSeconds + STORM.durationSeconds + 5
  for (let t = 0; t < limit && s.radiationStorm; t++) s = stepWith(s, config, 1, update)
  return s
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

/** The start of cycle fromCycle, with a habitat with a radiation shelter next to the first one. */
const shelteredBase = (seed = 3) =>
  withStructures(gameAtTime(seed, cycleStart(STORM.fromCycle)), config, [
    { type: 'habitat', tile: [5, 7], upgrades: [SHELTER] },
  ])

describe('radiation storm: when it comes (US3 scenario 1, FR-007)', () => {
  it('comes perCycle times in every cycle from fromCycle, and never before', () => {
    for (const seed of STORM_SEEDS) {
      const { storms } = missionOf(seed)
      for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
        const expected = cycle >= STORM.fromCycle ? STORM.perCycle : 0
        expect(stormsOfCycle(storms, cycle), `seed ${seed}, cycle ${cycle}`).toHaveLength(expected)
      }
    }
  })

  it('from the warning to the end, it only exists in the allowed seasons', () => {
    for (const seed of STORM_SEEDS) {
      for (const f of missionOf(seed).frames.filter((x) => x.storm)) {
        expect(STORM.seasons, `seed ${seed} at ${f.elapsed}`).toContain(f.season)
        expect(f.cycle).toBeGreaterThanOrEqual(STORM.fromCycle)
      }
    }
  })

  it('starts at a seeded time: the same seed gives the same times, and seeds use every allowed season', () => {
    const times = (seed: number) => mission(seed).storms.map((s) => s.startsAt)
    expect(times(5)).toEqual(missionOf(5).storms.map((s) => s.startsAt))

    const starts = STORM_SEEDS.flatMap((seed) => missionOf(seed).storms)
    expect(new Set(starts.map((s) => s.season))).toEqual(new Set(STORM.seasons))
    const firstCycle = starts.filter((s) => s.cycle === STORM.fromCycle).map((s) => s.startsAt)
    expect(new Set(firstCycle).size).toBeGreaterThan(1)
  })

  it('reads fromCycle from the config', () => {
    const later = stormRules({ fromCycle: STORM.fromCycle + 1 })
    const { storms } = mission(2, later)
    expect(stormsOfCycle(storms, STORM.fromCycle)).toHaveLength(0)
    for (let cycle = STORM.fromCycle + 1; cycle <= config.seasons.cycles; cycle++) {
      expect(stormsOfCycle(storms, cycle)).toHaveLength(STORM.perCycle)
    }
  })

  it('reads perCycle from the config: 0 means no storm, 2 means two storms that never overlap', () => {
    const none = mission(2, stormRules({ perCycle: 0 }))
    expect(none.frames.some((f) => f.storm)).toBe(false)

    const twice = mission(2, stormRules({ perCycle: 2 }))
    for (let cycle = STORM.fromCycle; cycle <= config.seasons.cycles; cycle++) {
      const inCycle = stormsOfCycle(twice.storms, cycle)
      expect(inCycle, `cycle ${cycle}`).toHaveLength(2)
      expect(inCycle[1].startsAt).toBeGreaterThanOrEqual(inCycle[0].activeEndsAt)
    }
  })

  it('reads the allowed seasons from the config', () => {
    const autumnOnly = stormRules({ seasons: ['autumn'] })
    for (const seed of STORM_SEEDS.slice(0, 4)) {
      const { frames, storms } = mission(seed, autumnOnly)
      expect(storms.length).toBeGreaterThan(0)
      for (const f of frames.filter((x) => x.storm)) expect(f.season).toBe('autumn')
    }
  })
})

describe('radiation storm: warning, hit and end (US3 scenarios 1 and 4, FR-008)', () => {
  // Odd numbers, so a test cannot pass by matching the canon by chance.
  const timed = stormRules({ warningSeconds: 7, durationSeconds: 13 })

  it('starts with a warning of warningSeconds when the seeded time comes, then an active phase of durationSeconds, then ends', () => {
    for (const seed of STORM_SEEDS.slice(0, 4)) {
      const { frames, storms } = mission(seed, timed)
      expect(storms.length).toBeGreaterThan(0)
      for (const storm of storms) {
        expect(storm.phases).toEqual(['warning', 'active'])
        expect(storm.activeEndsAt - storm.warningEndsAt).toBeCloseTo(13)
        for (const f of storm.frames) {
          if (f.storm!.phase === 'warning') {
            expect(f.elapsed).toBeGreaterThanOrEqual(storm.startsAt)
            expect(f.elapsed).toBeLessThan(storm.warningEndsAt)
          } else {
            expect(f.elapsed).toBeGreaterThanOrEqual(storm.warningEndsAt)
            expect(f.elapsed).toBeLessThan(storm.activeEndsAt)
          }
        }
        // Not a moment early, and gone for good once it is over.
        const first = frames.indexOf(storm.frames[0])
        expect(frames[first - 1].elapsed).toBeLessThan(storm.startsAt)
        const after = frames[frames.indexOf(storm.frames.at(-1)!) + 1]
        expect(after.storm).toBeNull()
        expect(after.elapsed).toBeGreaterThanOrEqual(storm.activeEndsAt)
      }
    }
  })

  it('the next season does not inherit the storm: it is over before a season outside the allowed ones', () => {
    for (const seed of STORM_SEEDS) {
      const { frames } = missionOf(seed)
      for (let i = 1; i < frames.length; i++) {
        const seasonChanged = frames[i].season !== frames[i - 1].season
        if (seasonChanged && !STORM.seasons.includes(frames[i].season)) {
          expect(frames[i].storm, `seed ${seed} at ${frames[i].elapsed}`).toBeNull()
        }
      }
    }
  })

  it('phase times and the cited event do not depend on the tick size', () => {
    const summary = (dt: number) => {
      const run = mission(7, config, SEP14, dt)
      return {
        storms: run.storms.map(({ cycle, warningEndsAt, activeEndsAt, basedOn }) => ({
          cycle,
          warningEndsAt,
          activeEndsAt,
          basedOn,
        })),
        logged: run.state.log.filter((e) => e.kind === 'radiation_storm').length,
      }
    }
    const reference = summary(1)
    expect(reference.storms.length).toBeGreaterThan(0)
    expect(summary(0.5)).toEqual(reference)
    expect(summary(2.5)).toEqual(reference)
  })

  it('a tick that crosses several phase changes moves the storm one phase at a time, so the warning is always seen and the hit always lands', () => {
    const update = stormOnly(config, SEP14)
    // A seed whose first storm starts early enough for a long tick to stay in allowed seasons.
    const seed = STORM_SEEDS.find((x) =>
      ['spring', 'summer'].includes(missionOf(x).storms[0]?.season),
    )
    expect(seed).toBeDefined()
    const seen = missionOf(seed!).storms[0]

    let before = update(gameAtTime(seed!, 0), 0)
    while (before.time.elapsed + 1 < seen.startsAt) before = stepWith(before, config, 1, update)
    expect(before.radiationStorm).toBeNull()

    const jump = STORM.warningSeconds + STORM.durationSeconds + 1
    const warned = stepWith(before, config, jump, update)
    expect(warned.radiationStorm).toMatchObject({ phase: 'warning' })
    expect(warned.radiationStorm!.phaseEndsAt).toBeCloseTo(seen.warningEndsAt)
    const hit = stepWith(warned, config, 1, update)
    expect(hit.radiationStorm).toMatchObject({ phase: 'active' })
    expect(hit.radiationStorm!.phaseEndsAt).toBeCloseTo(seen.activeEndsAt)
    expect(stepWith(hit, config, 1, update).radiationStorm).toBeNull()
  })
})

describe('radiation storm: the real DONKI event (US3 scenarios 1, 5 and 7, FR-011, FR-012)', () => {
  it('names one of the archived events, and keeps the same one from the warning to the end', () => {
    for (const seed of STORM_SEEDS) {
      for (const storm of missionOf(seed).storms) {
        expect(citedIndex(SEP14, storm.basedOn), `seed ${seed}`).toBeGreaterThanOrEqual(0)
        for (const f of storm.frames) expect(f.storm!.basedOn).toEqual(storm.basedOn)
      }
    }
  })

  it('with 14 events, the storms of one mission cite different events, for every seed', () => {
    for (const seed of STORM_SEEDS) {
      const cited = missionOf(seed).storms.map((s) => citedIndex(SEP14, s.basedOn))
      expect(cited).toHaveLength(groupsOf(config))
      expect(new Set(cited).size, `seed ${seed}: ${cited.join(', ')}`).toBe(cited.length)
    }
  })

  it('each storm draws from its own group: event i is in group i % groups, groups come from the config', () => {
    const configs = [
      config,
      stormRules({ fromCycle: STORM.fromCycle + 1 }),
      stormRules({ perCycle: 2 }),
    ]
    for (const cfg of configs) {
      const { fromCycle, perCycle } = cfg.mission.radiationStorm
      const groups = groupsOf(cfg)
      for (const seed of STORM_SEEDS.slice(0, 4)) {
        const { storms } = mission(seed, cfg)
        expect(storms).toHaveLength(groups)
        for (let cycle = fromCycle; cycle <= cfg.seasons.cycles; cycle++) {
          stormsOfCycle(storms, cycle).forEach((storm, n) => {
            const i = citedIndex(SEP14, storm.basedOn)
            expect(i, `seed ${seed}, cycle ${cycle}, storm ${n}`).toBeGreaterThanOrEqual(0)
            expect(i % groups, `seed ${seed}, cycle ${cycle}, storm ${n}`).toBe(
              (cycle - fromCycle) * perCycle + n,
            )
          })
        }
      }
    }
  })

  it('the same seed cites the same events, and the seed picks which event of the group', () => {
    const cited = (seed: number) => mission(seed).storms.map((s) => s.basedOn)
    expect(cited(9)).toEqual(missionOf(9).storms.map((s) => s.basedOn))

    const firstStorm = STORM_SEEDS.map((seed) =>
      citedIndex(SEP14, missionOf(seed).storms[0]?.basedOn ?? null),
    )
    expect(new Set(firstStorm).size).toBeGreaterThan(1)
  })

  it('with fewer events than storms it still works: an empty group draws from the whole list', () => {
    const one = fakeSep(1)
    const withOne = mission(4, config, one).storms
    expect(withOne).toHaveLength(groupsOf(config))
    for (const storm of withOne) expect(storm.basedOn).toEqual(one[0])

    // Two events and three groups: groups 0 and 1 hold one event each, group 2 is empty.
    const two = fakeSep(2)
    const withTwo = mission(4, config, two).storms
    expect(withTwo).toHaveLength(groupsOf(config))
    withTwo.forEach((storm, n) => {
      if (n < two.length) expect(storm.basedOn).toEqual(two[n])
      else expect(two).toContainEqual(storm.basedOn)
    })
  })

  it('with no event at all, the storm still comes, citing nothing (basedOn null)', () => {
    const { storms } = mission(4, config, [])
    expect(storms).toHaveLength(groupsOf(config))
    for (const storm of storms) {
      expect(storm.phases).toEqual(['warning', 'active'])
      expect(storm.basedOn).toBeNull()
    }
  })
})

describe('radiation storm: log and purity (US3, FR-002, FR-017)', () => {
  it('logs one radiation_storm entry per storm, when it starts, in its cycle', () => {
    for (const seed of STORM_SEEDS.slice(0, 4)) {
      const { state, storms } = missionOf(seed)
      const entries = state.log.filter((e) => e.kind === 'radiation_storm')
      expect(storms.length).toBeGreaterThan(0)
      expect(entries).toHaveLength(storms.length)
      entries.forEach((entry, i) => {
        expect(entry.at).toBeCloseTo(storms[i].startsAt)
        expect(entry.cycle).toBe(storms[i].cycle)
        expect(STORM.seasons).toContain(entry.season)
        expect(entry.ref).toEqual(expect.any(String))
        expect(entry.ref).not.toBe('')
      })
    }
  })

  it('does not change the state or the event list it receives', () => {
    const events = deepFreeze(fakeSep(14))
    const frozen: Update = (s, dt) => updateRadiationStorm(deepFreeze(s), config, dt, () => events)
    const start = gameAtTime(6, cycleStart(STORM.fromCycle))
    const run = play(start, config, 1, cycleStart(STORM.fromCycle + 1), frozen)
    expect(stormsIn(run.frames, config)).toHaveLength(STORM.perCycle)
  })

  it('returns the same state when there is nothing to do', () => {
    const update = stormOnly(config, SEP14)
    const lastSeason = config.seasons.seasons.at(-1)!
    const quiet = cycleStart(STORM.fromCycle + 1) - lastSeason.durationSeconds / 2
    const { state } = play(gameAtTime(6, 0), config, 1, quiet, update)
    expect(state.log.some((e) => e.kind === 'radiation_storm')).toBe(true)
    expect(state.radiationStorm).toBeNull()
    const input = { ...state, time: clock(config, quiet + 1) }
    expect(updateRadiationStorm(input, config, 1, () => SEP14)).toBe(input)
  })
})

describe('radiation storm with the engine: shelter and jobs (US3 scenarios 2 to 4, FR-009, FR-010)', () => {
  it('when the storm hits, an astronaut left outside dies and the crew inside goes to the shelter and lives', () => {
    const warned = untilWarning(shelteredBase(), withEngine)
    expect(warned.radiationStorm).toMatchObject({ phase: 'warning' })
    const outsider = warned.crew[0].id
    const hit = untilHit(withCrew(warned, [{ location: 'outside', jobId: null }]), withEngine)

    expect(hit.radiationStorm).toMatchObject({ phase: 'active' })
    expect(hit.crew.find((a) => a.id === outsider)!.alive).toBe(false)
    expect(hit.crew.filter((a) => a.alive)).toHaveLength(config.mission.crew - 1)
    expect(hit.log).toContainEqual(
      expect.objectContaining({ kind: 'death', ref: outsider, cause: 'radiation_storm' }),
    )
  })

  it('without any radiation shelter, everyone dies when the storm hits', () => {
    const warned = untilWarning(gameAtTime(3, cycleStart(STORM.fromCycle)), withEngine)
    const hit = untilHit(warned, withEngine)
    expect(hit.radiationStorm).toMatchObject({ phase: 'active' })
    expect(hit.crew.every((a) => !a.alive)).toBe(true)
  })

  it('taking shelter during the warning keeps every astronaut alive', () => {
    const warned = untilWarning(shelteredBase(), withEngine)
    const out = withCrew(warned, [{ location: 'outside', jobId: null }])
    const sheltered = bringAllInside(out, config)
    expect(sheltered.ok).toBe(true)
    const after = throughStorm(sheltered.state, withEngine)
    expect(after.radiationStorm).toBeNull()
    expect(after.crew.every((a) => a.alive)).toBe(true)
  })

  it('no job starts from the warning until the storm is over, then the waiting job starts', () => {
    const warned = untilWarning(shelteredBase(), withEngine)
    const site = withStructures(warned, config, [
      { type: 'solar_panel', tile: [0, 0], status: 'building' },
    ])
    let s = withJobs(site, config, [{ kind: 'build', structureId: site.structures.at(-1)!.id }])
    const limit = STORM.warningSeconds + STORM.durationSeconds + 5
    for (let t = 0; t < limit && s.radiationStorm; t++) {
      s = stepWith(s, config, 1, withEngine)
      if (s.radiationStorm) {
        expect(s.jobs[0]).toMatchObject({ status: 'queued', astronautId: null })
        expect(s.crew.some((a) => a.location === 'outside')).toBe(false)
      }
    }
    expect(s.radiationStorm).toBeNull()
    expect(s.jobs[0].status).toBe('active')
  })
})

describe('radiation storm: its own seeded plan (US3 review)', () => {
  /** Game time of every planned storm of the mission, from radiationPlan. */
  const planned = (seed: number, cfg: GameConfig = config) =>
    Array.from({ length: cfg.seasons.cycles }, (_, i) => i + 1).flatMap((cycle) =>
      radiationPlan(seed, cycle, cfg).map((slot) => cycleStart(cycle) + slot.offset),
    )

  it('the storms of a mission are the ones radiationPlan gives, cycle by cycle', () => {
    for (const seed of STORM_SEEDS) {
      const seen = missionOf(seed).storms.map((s) => s.startsAt)
      const plan = planned(seed)
      expect(seen).toHaveLength(plan.length)
      seen.forEach((at, i) => expect(at).toBeCloseTo(plan[i]))
    }
  })

  it('plans nothing before fromCycle or after the last cycle', () => {
    for (let cycle = 0; cycle < STORM.fromCycle; cycle++) {
      expect(radiationPlan(1, cycle, config)).toEqual([])
    }
    expect(radiationPlan(1, config.seasons.cycles + 1, config)).toEqual([])
  })

  it('mixes the cycle into the seed: the cycles of one mission get different times', () => {
    for (const seed of STORM_SEEDS) {
      const offsets = Array.from(
        { length: config.seasons.cycles - STORM.fromCycle + 1 },
        (_, i) => radiationPlan(seed, STORM.fromCycle + i, config)[0].offset,
      )
      expect(new Set(offsets).size, `seed ${seed}`).toBe(offsets.length)
    }
  })

  it('never starts in the first warningSeconds of a season, when the briefing pauses the game', () => {
    const timed = stormRules({ warningSeconds: 7, durationSeconds: 13 })
    for (const cfg of [config, timed]) {
      const margin = cfg.mission.radiationStorm.warningSeconds
      for (const seed of SEEDS) {
        for (const at of planned(seed, cfg)) {
          expect(clock(cfg, at).secondsIntoSeason, `seed ${seed}`).toBeGreaterThanOrEqual(margin)
        }
      }
    }
  })

  it('never draws from state.rng', () => {
    const { frames, state } = play(gameAtTime(8, 0), config, 1, MISSION_SECONDS, (s, dt) => {
      const next = updateRadiationStorm(s, config, dt, () => SEP14)
      expect(next.rng).toBe(s.rng)
      return next
    })
    expect(frames.some((f) => f.storm)).toBe(true)
    expect(state.rng).toBe(gameAtTime(8, 0).rng)
  })

  it('does not change the dust draws: the same climate events with and without storms', () => {
    const climate = (s: GameState) => ({
      rng: s.rng,
      structures: s.structures,
      activeEvents: s.activeEvents,
      nextEventAt: s.nextEventAt,
      log: s.log.filter((e) => e.kind !== 'radiation_storm'),
    })
    const until = cycleStart(STORM.fromCycle + 1)
    const start = withStructures(gameAtTime(11, cycleStart(STORM.fromCycle)), config, [
      { type: 'solar_panel', tile: [0, 0] },
    ])
    const withStorms = play(start, config, 1, until, allEvents(config))
    const without = play(start, config, 1, until, allEvents(stormRules({ perCycle: 0 })))
    expect(withStorms.frames.some((f) => f.storm)).toBe(true)
    expect(climate(withStorms.state)).toEqual(climate(without.state))
  })
})

// The committed snapshot (T016/T017), loaded with import.meta.glob so that a missing file fails
// only this test instead of the whole file.
const SNAPSHOT_FILE = '../../data/snapshots/2024-05.json'
const snapshots = import.meta.glob<{ sep: { eventTime: string; link: string }[] }>(
  '../../data/snapshots/2024-05.json',
  { eager: true, import: 'default' },
)

describe('radiation storm through updateEvents (US3, committed DONKI snapshot)', () => {
  it('cites a record of the 2024-05 snapshot (date = eventTime, url = link), the same one for the same seed', () => {
    const snapshot = snapshots[SNAPSHOT_FILE]
    expect(snapshot, 'src/data/snapshots/2024-05.json is missing (T016/T017)').toBeDefined()
    const records = snapshot!.sep.map((r) => ({ date: r.eventTime, url: r.link }))

    const cited = (seed: number) =>
      untilWarning(gameAtTime(seed, cycleStart(STORM.fromCycle)), allEvents(config)).radiationStorm!
        .basedOn
    const first = cited(5)
    expect(first).not.toBeNull()
    expect(records).toContainEqual(first)
    expect(cited(5)).toEqual(first)
  })
})
