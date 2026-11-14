import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { build, dismissBriefing } from './actions'
import { createGame, tick, winTargets } from './game'
import { onlyStructures, withStock, type StructureSpec } from './testState'
import type { GameState, LogEntry } from './types'

// Polish (Breno) — whole missions, end to end (spec 001 SC-001, SC-002, SC-006).
// Kept apart from game.test.ts, whose module mocks would slow these runs down.

const DT = 0.25

interface ScriptStep {
  /** Game time (state.time.elapsed) at which the action runs. */
  at: number
  run: (s: GameState) => GameState
}

/** Plays a mission like a player who closes every briefing at once and acts on a script. */
function play(start: GameState, script: ScriptStep[] = []): GameState {
  let s = start
  let next = 0
  for (let steps = 0; s.status === 'running' && steps < 100_000; steps++) {
    const briefing = dismissBriefing(s)
    if (briefing.ok) s = briefing.state
    while (next < script.length && script[next].at <= s.time.elapsed) s = script[next++].run(s)
    const after = tick(s, config, DT)
    if (after === s) break // nothing moves any more: the mission time is over
    s = after
  }
  return s
}

const deaths = (s: GameState): LogEntry[] => s.log.filter((e) => e.kind === 'death')

/**
 * A base ready for the colonists before it starts: enough habitats, all with thermal insulation
 * and a radiation shelter, reactors for every kW of heating, and reserves for the whole mission
 * plus the win targets. No producers, so no event can hurt it. Counts come from the config.
 */
function preparedBase(seed: number): GameState {
  const targets = winTargets(config)
  const habitat = config.structures.find((d) => d.id === 'habitat')!
  const habitats = Math.ceil(targets.habitatCapacity / (habitat.capacity ?? 1))
  const specs: StructureSpec[] = []
  for (let i = 0; i < habitats; i++) {
    specs.push({
      type: 'habitat',
      tile: [i * 2, 0],
      upgrades: ['thermal_insulation', 'radiation_shelter'],
    })
    // One reactor per habitat: far more than any season's heating demand.
    specs.push({ type: 'nuclear_reactor', tile: [i * 2, 4] })
  }
  const seasons = config.seasons.cycles * config.seasons.seasons.length
  const { needs, crew } = config.mission
  const reserve = (need: number, target: number) => target + need * crew * seasons * 2
  const game = onlyStructures(createGame(config, seed), config, specs)
  const home = game.structures[0].id
  return withStock(
    { ...game, crew: game.crew.map((a) => ({ ...a, habitatId: home })) },
    {
      oxygen: reserve(needs.oxygen, targets.reserves.oxygen),
      water: reserve(needs.water, targets.reserves.water),
      food: reserve(needs.food, targets.reserves.food),
    },
  )
}

/** A player who only builds one solar panel a few seconds in. */
const onePanel: ScriptStep[] = [
  {
    at: 5,
    run: (s) => {
      const r = build(s, config, 'solar_panel', [0, 0])
      return r.ok ? r.state : s
    },
  },
]

describe('a whole mission', () => {
  it('a prepared base wins after 4 cycles', () => {
    const end = play(preparedBase(7))
    expect(end.status).toBe('won')
    expect(end.time.cycle).toBe(config.seasons.cycles)
    expect(deaths(end)).toEqual([])
    const seasonStarts = end.log.filter((e) => e.kind === 'season_start')
    expect(seasonStarts).toHaveLength(config.seasons.cycles * config.seasons.seasons.length)
  })

  it('the untouched starting base loses, and every death has a cause', () => {
    const end = play(createGame(config, 7))
    expect(end.status).toBe('lost')
    expect(end.lostReason).toBe('crew_lost')
    expect(deaths(end)).toHaveLength(config.mission.crew)
    expect(deaths(end).every((e) => typeof e.cause === 'string' && e.cause.length > 0)).toBe(true)
  })

  it('the same seed and the same actions give the same mission', () => {
    const first = play(createGame(config, 99), onePanel)
    const second = play(createGame(config, 99), onePanel)
    expect(first.log.some((e) => e.kind === 'built')).toBe(true)
    expect(second).toEqual(first)
  })

  it('a whole mission (80 game minutes) is simulated in under 2 seconds', () => {
    const t0 = performance.now()
    const end = play(preparedBase(3))
    const ms = performance.now() - t0
    console.info(`full mission at dt=${DT}: ${ms.toFixed(0)} ms`)
    expect(end.status).toBe('won')
    expect(ms).toBeLessThan(2000)
  })
})
