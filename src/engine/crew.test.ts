import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { updateCrew } from './crew'
import { updateJobs } from './jobs'
import { gameAt, withCrew, withJobs, withStock, withStructures } from './testState'
import type { GameConfig, GameState, LogEntry, SeasonId } from './types'

// US5 (Breno) — constitution II.2, II.9

const { exposure, emptyReserve, insulationRequiredFromCycle } = config.mission
const lastCycle = config.seasons.cycles

function duration(season: SeasonId): number {
  const def = config.seasons.seasons.find((s) => s.id === season)
  if (!def) throw new Error(`no season ${season}`)
  return def.durationSeconds
}

/** Seconds outside that would take exposure from 0 to 1 in this season. */
const fullTime = (season: SeasonId) => exposure.maxShareOfSeason * duration(season)

/** Runs the crew step in 1 s steps (the store's tick size). */
function run(s: GameState, seconds: number, cfg: GameConfig = config): GameState {
  let out = s
  for (let t = 0; t < seconds; t++) out = updateCrew(out, cfg, 1)
  return out
}

const deaths = (s: GameState): LogEntry[] => s.log.filter((e) => e.kind === 'death')
const habitatOf = (s: GameState) => s.structures.find((x) => x.type === 'habitat')!

/** The starting habitat plus a second habitat next to it with the given upgrades. */
function twoHabitats(s: GameState, upgrades: string[], cfg: GameConfig = config) {
  const out = withStructures(s, cfg, [{ type: 'habitat', tile: [5, 7], upgrades }])
  return { s: out, home: habitatOf(out), other: out.structures[out.structures.length - 1] }
}

/** Same content, smaller habitats: lets a test overflow a protecting habitat with 4 astronauts. */
const smallHabitats: GameConfig = {
  ...config,
  structures: config.structures.map((d) => (d.id === 'habitat' ? { ...d, capacity: 2 } : d)),
}

const storm = (s: GameState, phase: 'warning' | 'active'): GameState => ({
  ...s,
  radiationStorm: { phase, phaseEndsAt: s.time.elapsed + 20, basedOn: null },
})

describe('updateCrew', () => {
  describe('exposure', () => {
    it('exposure fills to 1 after maxShareOfSeason of the current season spent outside', () => {
      for (const season of ['spring', 'summer'] as const) {
        const s = withCrew(gameAt(config, 1, season), [{ location: 'outside', exposure: 0 }])
        const half = updateCrew(s, config, fullTime(season) / 2)
        expect(half.crew[0].exposure).toBeCloseTo(0.5)
        const tenth = updateCrew(s, config, fullTime(season) / 10)
        expect(tenth.crew[0].exposure).toBeCloseTo(0.1)
      }
    })

    it('exposure recovers inside a habitat at recoveryRate of the fill speed', () => {
      const s = withCrew(gameAt(config, 1, 'spring'), [{ location: 'inside', exposure: 0.5 }])
      const t = fullTime('spring') * 0.2
      expect(updateCrew(s, config, t).crew[0].exposure).toBeCloseTo(
        0.5 - exposure.recoveryRate * 0.2,
      )
      expect(updateCrew(s, config, fullTime('spring') * 10).crew[0].exposure).toBe(0)
    })

    it('at warnAt the astronaut stops working and comes back inside; the job returns to the queue with its remaining time', () => {
      let s = withCrew(gameAt(config, 1, 'spring'), [{ exposure: exposure.warnAt - 0.001 }])
      const panel = s.structures.find((x) => x.type === 'solar_panel')!
      s = {
        ...s,
        structures: s.structures.map((x) => (x.id === panel.id ? { ...x, status: 'clogged' } : x)),
      }
      s = withJobs(s, config, [
        {
          kind: 'clean',
          structureId: panel.id,
          status: 'active',
          astronautId: s.crew[0].id,
          remainingSeconds: 7,
        },
      ])

      const after = updateCrew(s, config, 1)
      const worker = after.crew[0]
      expect(worker).toMatchObject({ alive: true, location: 'inside', jobId: null })
      expect(after.jobs[0]).toMatchObject({
        status: 'queued',
        astronautId: null,
        remainingSeconds: 7,
      })

      // Any other free astronaut may continue it; the one who came back waits until resumeAt.
      const next = updateJobs(after, config, 0)
      expect(next.jobs[0].status).toBe('active')
      expect(next.jobs[0].astronautId).not.toBe(worker.id)
    })

    // Playtest 2026-11-15: the radiation icon showed for one step only and nobody said why the
    // astronaut came back (II.9: "the commander explains why").
    it('logs the automatic return once, so the commander can explain it', () => {
      const returns = (g: GameState) => g.log.filter((e) => e.kind === 'exposure_return')
      const s = withCrew(gameAt(config, 1, 'spring'), [
        { location: 'outside', exposure: exposure.warnAt - 0.001 },
      ])
      expect(returns(s)).toEqual([])

      const after = updateCrew(s, config, 1)
      expect(returns(after)).toHaveLength(1)
      expect(returns(after)[0]).toMatchObject({ ref: s.crew[0].id, cycle: 1, season: 'spring' })

      // Back inside, recovering: no second entry.
      expect(returns(run(after, 20))).toHaveLength(1)
    })

    it('exposure never kills: no astronaut stays outside past warnAt', () => {
      const s = withCrew(gameAt(config, 1, 'summer'), [{ location: 'outside', exposure: 0 }])
      const after = run(s, Math.ceil(duration('summer')))
      expect(after.crew[0].alive).toBe(true)
      expect(after.crew[0].location).toBe('inside')
      expect(deaths(after)).toEqual([])

      let peak = 0
      let step = s
      for (let t = 0; t < fullTime('summer') * 2; t++) {
        step = updateCrew(step, config, 1)
        if (step.crew[0].location === 'outside') peak = Math.max(peak, step.crew[0].exposure)
      }
      expect(peak).toBeLessThan(exposure.warnAt)
    })

    it('resting ends when exposure is back to 0', () => {
      const s = withCrew(gameAt(config, 1, 'spring'), [{ exposure: 0.2, resting: true }])
      expect(updateCrew(s, config, 1).crew[0].resting).toBe(true)
      const rested = updateCrew(s, config, fullTime('spring'))
      expect(rested.crew[0]).toMatchObject({ exposure: 0, resting: false })
    })
  })

  describe('radiation storm', () => {
    it('when a radiation storm hits, everyone not in a sheltered habitat (after moving into one with room) dies, cause "radiation_storm"', () => {
      const base = twoHabitats(gameAt(config, 2, 'summer', 100), ['radiation_shelter'])
      const s = storm(withCrew(base.s, [{ location: 'outside' }]), 'active')

      const after = updateCrew(s, config, 1)
      expect(after.crew.map((a) => a.alive)).toEqual([false, true, true, true])
      expect(after.crew.slice(1).every((a) => a.habitatId === base.other.id)).toBe(true)
      expect(deaths(after)).toEqual([
        {
          at: s.time.elapsed,
          cycle: 2,
          season: 'summer',
          kind: 'death',
          ref: s.crew[0].id,
          cause: 'radiation_storm',
        },
      ])
    })

    it('only the astronauts who fit in the sheltered habitats survive', () => {
      const base = twoHabitats(
        gameAt(smallHabitats, 2, 'summer', 100),
        ['radiation_shelter'],
        smallHabitats,
      )
      const after = updateCrew(storm(base.s, 'active'), smallHabitats, 1)
      expect(after.crew.map((a) => a.alive)).toEqual([true, true, false, false])
      expect(deaths(after).every((e) => e.cause === 'radiation_storm')).toBe(true)
    })

    it('a habitat without a shelter, or a shelter still being built, protects nobody', () => {
      const none = updateCrew(storm(gameAt(config, 2, 'summer', 100), 'active'), config, 1)
      expect(none.crew.every((a) => !a.alive)).toBe(true)

      const building = withStructures(gameAt(config, 2, 'summer', 100), config, [
        { type: 'habitat', tile: [5, 7], status: 'building', upgrades: ['radiation_shelter'] },
      ])
      expect(updateCrew(storm(building, 'active'), config, 1).crew.every((a) => !a.alive)).toBe(
        true,
      )
    })

    it('nobody dies during the warning phase', () => {
      const s = storm(
        withCrew(gameAt(config, 2, 'summer', 100), [{ location: 'outside' }]),
        'warning',
      )
      expect(deaths(updateCrew(s, config, 1))).toEqual([])
    })
  })

  describe('death countdowns', () => {
    it('an empty vital reserve kills one astronaut after graceSeconds, then one every deathEverySeconds', () => {
      for (const res of ['oxygen', 'water', 'food'] as const) {
        const s = withStock(gameAt(config, 1, 'spring', 10), { [res]: 0 })
        const before = run(s, emptyReserve.graceSeconds - 1)
        expect(deaths(before)).toEqual([])

        const first = run(before, 1)
        expect(deaths(first)).toMatchObject([{ ref: s.crew[0].id, cause: `empty_${res}` }])

        const second = run(first, emptyReserve.deathEverySeconds)
        expect(deaths(second).map((e) => e.ref)).toEqual([s.crew[0].id, s.crew[1].id])
      }
    })

    it('the countdown restarts from zero once the reserve is above zero again', () => {
      const s = run(
        withStock(gameAt(config, 1, 'spring', 10), { oxygen: 0 }),
        emptyReserve.graceSeconds - 1,
      )
      const refilled = updateCrew(withStock(s, { oxygen: 5 }), config, 1)
      expect(refilled.dangerTimers.empty_oxygen ?? 0).toBe(0)

      const emptyAgain = run(withStock(refilled, { oxygen: 0 }), emptyReserve.graceSeconds - 1)
      expect(deaths(emptyAgain)).toEqual([])
    })

    it('an unheated base kills the same way (cause "cold")', () => {
      const g = gameAt(config, 1, 'winter', 10)
      const s: GameState = { ...g, power: { ...g.power, unheated: true } }
      expect(deaths(run(s, emptyReserve.graceSeconds - 1))).toEqual([])
      expect(deaths(run(s, emptyReserve.graceSeconds))).toMatchObject([{ cause: 'cold' }])
    })

    it('two empty reserves have separate countdowns', () => {
      const s = withStock(gameAt(config, 1, 'spring', 10), { oxygen: 0, food: 0 })
      const after = run(s, emptyReserve.graceSeconds)
      expect(
        deaths(after)
          .map((e) => e.cause)
          .sort(),
      ).toEqual(['empty_food', 'empty_oxygen'])
      expect(after.crew.filter((a) => !a.alive)).toHaveLength(2)
    })

    it('the victim of a countdown is the first living astronaut in crew order', () => {
      const s = withCrew(withStock(gameAt(config, 1, 'spring', 10), { water: 0 }), [
        { alive: false },
      ])
      const after = run(s, emptyReserve.graceSeconds)
      expect(deaths(after).map((e) => e.ref)).toEqual([s.crew[1].id])
    })

    it('an astronaut who dies during a job leaves the job in the queue with its remaining time', () => {
      let s = withStock(gameAt(config, 1, 'spring', 10), { food: 0 })
      const panel = s.structures.find((x) => x.type === 'solar_panel')!
      s = {
        ...s,
        structures: s.structures.map((x) => (x.id === panel.id ? { ...x, status: 'clogged' } : x)),
      }
      s = withJobs(s, config, [
        {
          kind: 'clean',
          structureId: panel.id,
          status: 'active',
          astronautId: s.crew[0].id,
          remainingSeconds: 4,
        },
      ])
      const after = run(s, emptyReserve.graceSeconds)
      expect(after.crew[0]).toMatchObject({ alive: false, jobId: null })
      expect(after.jobs[0]).toMatchObject({
        status: 'queued',
        astronautId: null,
        remainingSeconds: 4,
      })
    })
  })

  describe('extreme cold', () => {
    it('from insulationRequiredFromCycle, at winter start astronauts in uninsulated habitats die', () => {
      const s = gameAt(config, insulationRequiredFromCycle, 'winter', 0)
      const after = updateCrew(s, config, 1)
      expect(after.crew.every((a) => !a.alive)).toBe(true)
      expect(deaths(after).every((e) => e.cause === 'cold')).toBe(true)

      // Not before that cycle, and not after the first step of winter.
      expect(
        deaths(updateCrew(gameAt(config, insulationRequiredFromCycle - 1, 'winter', 0), config, 1)),
      ).toEqual([])
      expect(deaths(updateCrew(gameAt(config, lastCycle, 'winter', 100), config, 1))).toEqual([])
    })

    it('at extreme cold, astronauts inside move into insulated habitats with room and only the rest die', () => {
      const base = twoHabitats(gameAt(config, insulationRequiredFromCycle, 'winter', 0), [
        'thermal_insulation',
      ])
      const after = updateCrew(base.s, config, 1)
      expect(deaths(after)).toEqual([])
      expect(after.crew.every((a) => a.habitatId === base.other.id)).toBe(true)

      const small = twoHabitats(
        gameAt(smallHabitats, insulationRequiredFromCycle, 'winter', 0),
        ['thermal_insulation'],
        smallHabitats,
      )
      const crowded = updateCrew(small.s, smallHabitats, 1)
      expect(crowded.crew.map((a) => a.alive)).toEqual([true, true, false, false])
      expect(crowded.crew.slice(0, 2).every((a) => a.habitatId === small.other.id)).toBe(true)
    })

    it('astronauts already in an insulated habitat keep their place', () => {
      const small = twoHabitats(
        gameAt(smallHabitats, insulationRequiredFromCycle, 'winter', 0),
        ['thermal_insulation'],
        smallHabitats,
      )
      const s = withCrew(small.s, [{}, {}, { habitatId: small.other.id }])
      const after = updateCrew(s, smallHabitats, 1)
      expect(after.crew.map((a) => a.alive)).toEqual([true, false, true, false])
    })
  })
})
