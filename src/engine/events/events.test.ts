import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { createGame } from '../game'
import type {
  ActiveEvent,
  EventRule,
  GameConfig,
  GameState,
  SeasonId,
  StructureInstance,
  StructureStatus,
} from '../types'
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
