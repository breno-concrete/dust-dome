import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import {
  bringAllInside,
  bringInside,
  build,
  clean,
  demolish,
  dismissBriefing,
  installUpgrade,
  resumeJobs,
  setPowerMode,
  startRepair,
} from './actions'
import { updateCrew } from './crew'
import { createGame } from './game'
import { updateJobs } from './jobs'
import {
  gameAt,
  onlyStructures,
  withCrew,
  withEvents,
  withJobs,
  withStock,
  withStructures,
} from './testState'
import type { ActionResult, GameState, StructureDef, StructureInstance } from './types'

function defOf(id: string): StructureDef {
  const def = config.structures.find((d) => d.id === id)
  if (!def) throw new Error(`no structure ${id}`)
  return def
}

function upgradeCost(id: string): Record<string, number> {
  const def = config.upgrades.find((u) => u.id === id)
  if (!def) throw new Error(`no upgrade ${id}`)
  return def.cost
}

const plenty = Object.fromEntries(config.resources.map((r) => [r.id, 9999]))
const spring = () => withStock(gameAt(config, 1, 'spring'), plenty)
const blocked = (s: GameState) => withEvents(s, [{ kind: 'darkness', blocksExternalJobs: true }])
const firstOf = (s: GameState, type: string): StructureInstance => {
  const found = s.structures.find((x) => x.type === type)
  if (!found) throw new Error(`no ${type} in the base`)
  return found
}
const last = (s: GameState): StructureInstance => s.structures[s.structures.length - 1]

function expectRefused(r: ActionResult, before: GameState, reason: string) {
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.reason).toBe(reason)
  expect(r.state).toBe(before)
}

function okState(r: ActionResult): GameState {
  if (!r.ok) throw new Error(`refused: ${r.reason}`)
  return r.state
}

// US4 (Breno) — constitution II.6, II.9, II.10
describe('build', () => {
  it('rejects with not_enough_resources when the stock does not cover the cost', () => {
    const s = withStock(spring(), Object.fromEntries(config.resources.map((r) => [r.id, 0])))
    expectRefused(build(s, config, 'solar_panel', [0, 0]), s, 'not_enough_resources')
  })

  it('rejects with the placementError of the tile (out_of_bounds, tile_blocked)', () => {
    const s = spring()
    expectRefused(build(s, config, 'solar_panel', [-1, 0]), s, 'out_of_bounds')
    const taken = firstOf(s, 'habitat').tile
    expectRefused(build(s, config, 'solar_panel', taken), s, 'tile_blocked')
  })

  it('rejects with external_jobs_blocked during winter darkness', () => {
    const s = blocked(spring())
    expectRefused(build(s, config, 'solar_panel', [0, 0]), s, 'external_jobs_blocked')
  })

  it('deducts the cost, adds the structure as "building" and queues a build job', () => {
    const s = spring()
    const after = okState(build(s, config, 'solar_panel', [0, 0]))
    const def = defOf('solar_panel')
    for (const [res, amount] of Object.entries(def.cost)) {
      expect(after.stock[res]).toBeCloseTo(s.stock[res] - amount)
    }
    const added = last(after)
    expect(after.structures).toHaveLength(s.structures.length + 1)
    expect(added).toMatchObject({ type: 'solar_panel', tile: [0, 0], status: 'building' })
    expect(after.jobs).toEqual([
      expect.objectContaining({
        kind: 'build',
        structureId: added.id,
        astronautId: null,
        status: 'queued',
        remainingSeconds: def.buildSeconds,
      }),
    ])
  })

  it('rejects with not_connected a habitat that shares no side with an existing habitat', () => {
    const s = spring()
    expectRefused(build(s, config, 'habitat', [0, 0]), s, 'not_connected')
  })
})

describe('installUpgrade', () => {
  it('only allows upgrades listed in the structure definition', () => {
    const s = spring()
    const panel = firstOf(s, 'solar_panel')
    const listed = defOf('solar_panel').upgrades
    const notListed = config.upgrades.find((u) => !listed.includes(u.id))!
    expectRefused(installUpgrade(s, config, panel.id, notListed.id), s, 'not_allowed')
    expectRefused(installUpgrade(s, config, panel.id, 'no_such_upgrade'), s, 'not_allowed')
    expect(installUpgrade(s, config, panel.id, listed[0]).ok).toBe(true)
  })

  it('deducts the cost and queues an upgrade job', () => {
    const s = spring()
    const habitat = firstOf(s, 'habitat')
    const after = okState(installUpgrade(s, config, habitat.id, 'thermal_insulation'))
    for (const [res, amount] of Object.entries(upgradeCost('thermal_insulation'))) {
      expect(after.stock[res]).toBeCloseTo(s.stock[res] - amount)
    }
    expect(after.jobs).toEqual([
      expect.objectContaining({
        kind: 'upgrade',
        structureId: habitat.id,
        upgradeId: 'thermal_insulation',
        astronautId: null,
        status: 'queued',
        remainingSeconds: config.mission.jobs.upgradeSeconds,
      }),
    ])
    // The effect starts only when the job ends.
    expect(firstOf(after, 'habitat').upgrades).toEqual([])
  })

  it('rejects with not_allowed an upgrade already installed or queued, or a structure still building', () => {
    const s = spring()
    const habitat = firstOf(s, 'habitat')
    const queued = okState(installUpgrade(s, config, habitat.id, 'thermal_insulation'))
    expectRefused(
      installUpgrade(queued, config, habitat.id, 'thermal_insulation'),
      queued,
      'not_allowed',
    )

    const installed = withStructures(s, config, [
      { type: 'habitat', tile: [7, 7], upgrades: ['thermal_insulation'] },
    ])
    expectRefused(
      installUpgrade(installed, config, last(installed).id, 'thermal_insulation'),
      installed,
      'not_allowed',
    )

    const building = withStructures(s, config, [
      { type: 'habitat', tile: [7, 7], status: 'building' },
    ])
    expectRefused(
      installUpgrade(building, config, last(building).id, 'thermal_insulation'),
      building,
      'not_allowed',
    )
  })

  it('rejects with external_jobs_blocked or not_enough_resources', () => {
    const s = spring()
    const habitat = firstOf(s, 'habitat')
    const dark = blocked(s)
    expectRefused(
      installUpgrade(dark, config, habitat.id, 'thermal_insulation'),
      dark,
      'external_jobs_blocked',
    )
    const poor = withStock(s, Object.fromEntries(config.resources.map((r) => [r.id, 0])))
    expectRefused(
      installUpgrade(poor, config, habitat.id, 'thermal_insulation'),
      poor,
      'not_enough_resources',
    )
  })
})

describe('setPowerMode', () => {
  it('changes the mode of a switchable type', () => {
    const s = spring()
    const after = okState(setPowerMode(s, config, 'mine', 'max'))
    expect(after.powerModes.mine).toBe('max')
    expect(okState(setPowerMode(after, config, 'mine', 'off')).powerModes.mine).toBe('off')
  })

  it('rejects with not_allowed for habitats, panels, batteries and the reactor', () => {
    const s = spring()
    const fixed = config.structures.filter((d) => !d.switchable).map((d) => d.id)
    expect(fixed).toEqual(
      expect.arrayContaining(['habitat', 'solar_panel', 'battery', 'nuclear_reactor']),
    )
    for (const type of [...fixed, 'no_such_type']) {
      expectRefused(setPowerMode(s, config, type, 'max'), s, 'not_allowed')
    }
  })

  // Playtest 2026-11-15: with the game paused, the HUD kept the old numbers after a switch.
  it('refreshes the power report at once, without waiting for the next step', () => {
    const s = createGame(config, 1)
    const up = okState(setPowerMode(s, config, 'mine', 'max'))
    // More demand, or no power for it: either way the report already tells.
    expect(up.power.demandKw > s.power.demandKw || up.power.shed.includes('mine')).toBe(true)
    const off = okState(setPowerMode(s, config, 'oxygen_generator', 'off'))
    expect(off.power.demandKw).toBeLessThan(s.power.demandKw)
    expect(off.power.balanceKw).toBeCloseTo(off.power.productionKw - off.power.demandKw)
    // Asking for the report is not a step: batteries and the clock stay where they were.
    expect(off.batteryEu).toBe(s.batteryEu)
    expect(off.time).toEqual(s.time)
  })
})

describe('startRepair', () => {
  const parts = config.mission.repair.parts
  const withBroken = (status: 'damaged' | 'short_circuit' = 'damaged') =>
    withStructures(spring(), config, [{ type: 'solar_panel', tile: [0, 0], status }])

  it('rejects without enough repair parts', () => {
    const s = withStock(withBroken(), { repair_parts: parts - 1 })
    expectRefused(startRepair(s, config, last(s).id, true), s, 'not_enough_resources')
  })

  it('rejects with not_allowed a structure that is neither damaged nor short-circuited', () => {
    const s = spring()
    expectRefused(startRepair(s, config, firstOf(s, 'mine').id, true), s, 'not_allowed')
  })

  it('a failed QTE spends the parts and changes nothing else', () => {
    const s = withBroken()
    const after = okState(startRepair(s, config, last(s).id, false))
    expect(after.stock.repair_parts).toBeCloseTo(s.stock.repair_parts - parts)
    expect(after.jobs).toEqual(s.jobs)
    expect(after.structures).toEqual(s.structures)
  })

  it('a successful QTE spends the parts and queues a repair job', () => {
    for (const status of ['damaged', 'short_circuit'] as const) {
      const s = withBroken(status)
      const after = okState(startRepair(s, config, last(s).id, true))
      expect(after.stock.repair_parts).toBeCloseTo(s.stock.repair_parts - parts)
      expect(after.jobs).toEqual([
        expect.objectContaining({
          kind: 'repair',
          structureId: last(s).id,
          status: 'queued',
          remainingSeconds: config.mission.jobs.repairSeconds,
        }),
      ])
      // A second repair of the same structure is not allowed while one is queued.
      expectRefused(startRepair(after, config, last(s).id, true), after, 'not_allowed')
    }
  })
})

describe('clean', () => {
  const withClogged = () =>
    withStructures(spring(), config, [{ type: 'solar_panel', tile: [0, 0], status: 'clogged' }])

  it('queues a clean job for a clogged structure', () => {
    const s = withClogged()
    const after = okState(clean(s, config, last(s).id))
    expect(after.stock).toEqual(s.stock)
    expect(after.jobs).toEqual([
      expect.objectContaining({
        kind: 'clean',
        structureId: last(s).id,
        status: 'queued',
        remainingSeconds: config.mission.jobs.cleanSeconds,
      }),
    ])
    expectRefused(clean(after, config, last(s).id), after, 'not_allowed')
    const active = spring()
    expectRefused(clean(active, config, firstOf(active, 'mine').id), active, 'not_allowed')
  })

  it('rejects with not_allowed during an active dust storm', () => {
    for (const kind of ['dust_storm', 'global_dust_storm'] as const) {
      const s = withEvents(withClogged(), [{ kind }])
      expectRefused(clean(s, config, last(s).id), s, 'not_allowed')
    }
  })
})

// US5 (Breno) — constitution II.9, II.11
/** A spring base where the first `working` astronauts are outside cleaning clogged panels. */
function working(base: GameState, count: number, remainingSeconds = 6): GameState {
  let s = withStructures(
    base,
    config,
    Array.from({ length: count }, (_, i) => ({
      type: 'solar_panel',
      tile: [i, 0] as const,
      status: 'clogged' as const,
    })),
  )
  const panels = s.structures.slice(-count)
  s = withJobs(
    s,
    config,
    panels.map((p, i) => ({
      kind: 'clean' as const,
      structureId: p.id,
      status: 'active' as const,
      astronautId: s.crew[i].id,
      remainingSeconds,
    })),
  )
  return s
}

const inStorm = (s: GameState, phase: 'warning' | 'active' = 'warning'): GameState => ({
  ...s,
  radiationStorm: { phase, phaseEndsAt: s.time.elapsed + 10, basedOn: null },
})

/** Adds a habitat with a radiation shelter next to the starting one. */
function withShelter(s: GameState): { s: GameState; shelter: StructureInstance } {
  const out = withStructures(s, config, [
    { type: 'habitat', tile: [5, 7], upgrades: ['radiation_shelter'] },
  ])
  return { s: out, shelter: last(out) }
}

describe('bringInside', () => {
  it('brings one astronaut inside at once; their job pauses with its remaining time', () => {
    const s = working(spring(), 1, 6)
    const a = s.crew[0]
    const after = okState(bringInside(s, config, a.id))
    expect(after.crew[0]).toMatchObject({
      location: 'inside',
      jobId: null,
      resting: true,
      habitatId: a.habitatId,
    })
    expect(after.jobs[0]).toMatchObject({
      status: 'held',
      astronautId: null,
      remainingSeconds: 6,
    })
  })

  it('nobody continues the paused job by themselves, even a free astronaut inside', () => {
    const s = working(spring(), 1, 6)
    const recalled = okState(bringInside(s, config, s.crew[0].id))
    expect(recalled.crew[1]).toMatchObject({ location: 'inside', jobId: null, resting: false })
    const later = updateJobs(recalled, config, 5)
    expect(later.jobs[0]).toMatchObject({ status: 'held', astronautId: null, remainingSeconds: 6 })
    expect(later.crew.every((x) => x.location === 'inside')).toBe(true)
  })

  it('a recalled astronaut rests (takes no job) until their exposure is back to 0', () => {
    // Only the recalled astronaut is alive, with exposure low enough to work again.
    const s = withCrew(working(spring(), 1), [
      { exposure: 0.1 },
      { alive: false },
      { alive: false },
      { alive: false },
    ])
    const recalled = okState(bringInside(s, config, s.crew[0].id))
    const resumed = okState(resumeJobs(recalled, config, recalled.jobs[0].structureId))
    expect(updateJobs(resumed, config, 0).jobs[0].status).toBe('queued')

    const rested = updateCrew(resumed, config, 1000)
    expect(rested.crew[0]).toMatchObject({ exposure: 0, resting: false })
    expect(updateJobs(rested, config, 0).jobs[0]).toMatchObject({
      status: 'active',
      astronautId: s.crew[0].id,
    })
  })

  it('during a radiation storm, goes into a sheltered habitat with room', () => {
    const { s, shelter } = withShelter(working(spring(), 1))
    const after = okState(bringInside(inStorm(s), config, s.crew[0].id))
    expect(after.crew[0]).toMatchObject({ location: 'inside', habitatId: shelter.id, jobId: null })
    expect(after.jobs[0]).toMatchObject({ status: 'queued', astronautId: null })

    const noShelter = inStorm(working(spring(), 1))
    expectRefused(bringInside(noShelter, config, noShelter.crew[0].id), noShelter, 'not_allowed')
  })

  it('rejects with not_allowed for an unknown, dead or already-inside astronaut', () => {
    const s = withCrew(working(spring(), 2), [{}, { alive: false }])
    expectRefused(bringInside(s, config, 'nobody'), s, 'not_allowed')
    expectRefused(bringInside(s, config, s.crew[1].id), s, 'not_allowed')
    expectRefused(bringInside(s, config, s.crew[2].id), s, 'not_allowed')
  })
})

describe('bringAllInside', () => {
  it('moves every astronaut outside into a habitat with a radiation shelter', () => {
    const { s, shelter } = withShelter(working(spring(), 2))
    const after = okState(bringAllInside(inStorm(s), config))
    for (const a of after.crew.slice(0, 2)) {
      expect(a).toMatchObject({ location: 'inside', habitatId: shelter.id, jobId: null })
    }
  })

  it('pauses active jobs, which resume after the storm', () => {
    const { s } = withShelter(working(spring(), 2, 6))
    const sheltered = okState(bringAllInside(inStorm(s), config))
    const during = updateJobs(sheltered, config, 1)
    expect(during.jobs.every((j) => j.status !== 'active' && j.remainingSeconds === 6)).toBe(true)

    const after = updateJobs({ ...during, radiationStorm: null }, config, 0)
    expect(after.jobs.every((j) => j.status === 'active' && j.remainingSeconds === 6)).toBe(true)
  })

  it('brings every astronaut outside inside at once; their jobs pause', () => {
    const s = working(spring(), 3)
    const after = okState(bringAllInside(s, config))
    expect(after.crew.every((a) => a.location === 'inside' && a.jobId === null)).toBe(true)
    expect(after.crew.slice(0, 3).every((a) => a.resting)).toBe(true)
    expect(after.crew[3].resting).toBe(false)
    expect(after.jobs.every((j) => j.status === 'held' && j.astronautId === null)).toBe(true)
  })

  it('the astronaut who stayed inside does not go out for the paused jobs', () => {
    const after = updateJobs(okState(bringAllInside(working(spring(), 3), config)), config, 1)
    expect(after.crew[3]).toMatchObject({ location: 'inside', jobId: null })
    expect(after.jobs.every((j) => j.status === 'held')).toBe(true)
  })

  it('rejects with not_allowed when nobody is outside', () => {
    const s = spring()
    expectRefused(bringAllInside(s, config), s, 'not_allowed')
  })
})

describe('resumeJobs', () => {
  it('puts the paused jobs of a structure back in the queue; the least exposed free astronaut takes them', () => {
    const s = withCrew(okState(bringAllInside(working(spring(), 2, 6), config)), [
      {},
      {},
      { exposure: 0.2 },
      { exposure: 0.1 },
    ])
    const [first, second] = s.jobs
    const resumed = okState(resumeJobs(s, config, first.structureId))
    expect(resumed.jobs[0]).toMatchObject({ status: 'queued', remainingSeconds: 6 })
    expect(resumed.jobs[1]).toMatchObject({ id: second.id, status: 'held' })

    const next = updateJobs(resumed, config, 0)
    expect(next.jobs[0]).toMatchObject({ status: 'active', astronautId: s.crew[3].id })
    expect(next.jobs[1].status).toBe('held')
  })

  it('in winter darkness the resumed job waits in the queue until spring', () => {
    const base = working(spring(), 1, 6)
    const s = okState(bringInside(base, config, base.crew[0].id))
    const dark = blocked(s)
    const resumed = okState(resumeJobs(dark, config, s.jobs[0].structureId))
    expect(updateJobs(resumed, config, 1).jobs[0]).toMatchObject({ status: 'queued' })
  })

  it('rejects with not_allowed when the structure has no paused job', () => {
    const s = working(spring(), 1)
    expectRefused(resumeJobs(s, config, s.jobs[0].structureId), s, 'not_allowed')
    expectRefused(resumeJobs(s, config, 'nothing'), s, 'not_allowed')
  })
})

describe('any action', () => {
  it('is refused with not_allowed after the mission ended', () => {
    const broken = withStructures(spring(), config, [
      { type: 'solar_panel', tile: [0, 0], status: 'damaged' },
      { type: 'solar_panel', tile: [1, 0], status: 'clogged' },
    ])
    const s: GameState = { ...broken, status: 'won' }
    const [damaged, clogged] = s.structures.slice(-2)
    const habitat = firstOf(s, 'habitat')
    const results = [
      build(s, config, 'solar_panel', [0, 1]),
      installUpgrade(s, config, habitat.id, 'thermal_insulation'),
      setPowerMode(s, config, 'mine', 'max'),
      startRepair(s, config, damaged.id, true),
      clean(s, config, clogged.id),
      demolish(s, config, firstOf(s, 'mine').id),
      bringInside(s, config, s.crew[0].id),
      bringAllInside(s, config),
      resumeJobs(s, config, habitat.id),
    ]
    for (const r of results) expectRefused(r, s, 'not_allowed')
  })
})

// US4 (Breno) — constitution II.6 Demolition
describe('demolish', () => {
  const { demolishSeconds } = config.mission.jobs
  /** Habitats in a row on the top edge, the crew living in the first one. */
  const row = (count: number, lastStatus: 'active' | 'building' = 'active') => {
    const specs = Array.from({ length: count }, (_, i) => ({
      type: 'habitat',
      tile: [i * 2, 0] as const,
      status: i === count - 1 ? lastStatus : ('active' as const),
    }))
    const s = onlyStructures(spring(), config, specs)
    return withCrew(
      s,
      s.crew.map(() => ({ habitatId: s.structures[0].id })),
    )
  }

  it('queues a demolish job that takes demolishSeconds with one astronaut outside', () => {
    const s = spring()
    const mine = firstOf(s, 'mine')
    const after = okState(demolish(s, config, mine.id))
    expect(after.stock).toEqual(s.stock)
    expect(after.structures).toEqual(s.structures)
    expect(after.jobs).toEqual([
      expect.objectContaining({
        kind: 'demolish',
        structureId: mine.id,
        status: 'queued',
        remainingSeconds: demolishSeconds,
      }),
    ])
    const working = updateJobs(after, config, 0)
    expect(working.crew.filter((a) => a.location === 'outside')).toHaveLength(1)
    expectRefused(demolish(after, config, mine.id), after, 'not_allowed')
  })

  it('rejects with external_jobs_blocked during winter darkness', () => {
    const s = blocked(spring())
    expectRefused(demolish(s, config, firstOf(s, 'mine').id), s, 'external_jobs_blocked')
  })

  it('rejects with last_habitat for the last habitat module', () => {
    const s = spring()
    expectRefused(demolish(s, config, firstOf(s, 'habitat').id), s, 'last_habitat')
  })

  it('rejects with no_room_for_crew when the occupants do not fit in the other habitats', () => {
    // The only other habitat is still under construction, so it has no room yet.
    const s = row(2, 'building')
    expectRefused(demolish(s, config, s.structures[0].id), s, 'no_room_for_crew')
    expect(demolish(s, config, s.structures[1].id).ok).toBe(true)
  })

  it('rejects with not_connected when another habitat would lose its shared side', () => {
    const s = row(3)
    const [, middle, end] = s.structures
    expectRefused(demolish(s, config, middle.id), s, 'not_connected')
    const endQueued = okState(demolish(s, config, end.id))
    // With the end one on its way out, the middle one is now the last link of the row.
    expect(demolish(endQueued, config, middle.id).ok).toBe(true)
  })

  it('cancels a structure under construction, with the same refund', () => {
    const s = spring()
    const built = okState(build(s, config, 'solar_panel', [0, 0]))
    const site = last(built)
    let after = okState(demolish(built, config, site.id))
    after = updateJobs(after, config, 0)
    after = updateJobs(after, config, demolishSeconds)
    expect(after.structures.find((x) => x.id === site.id)).toBeUndefined()
    expect(after.jobs).toEqual([])
    const share = config.mission.demolishRefundShare
    for (const [res, amount] of Object.entries(defOf('solar_panel').cost)) {
      expect(after.stock[res]).toBeCloseTo(s.stock[res] - amount + share * amount)
    }
    expect(after.crew.every((a) => a.location === 'inside' && a.jobId === null)).toBe(true)
  })

  it('cancelling a construction stops its build job, so only one astronaut goes outside', () => {
    const s = spring()
    let site = okState(build(s, config, 'solar_panel', [0, 0]))
    site = updateJobs(site, config, 0) // the builder is already outside
    const cancelled = okState(demolish(site, config, last(site).id))
    expect(cancelled.jobs.map((j) => j.kind)).toEqual(['demolish'])
    expect(cancelled.crew.every((a) => a.location === 'inside' && a.jobId === null)).toBe(true)
    const working = updateJobs(cancelled, config, 0)
    expect(working.crew.filter((a) => a.location === 'outside')).toHaveLength(1)
  })
})

describe('dismissBriefing', () => {
  it('clears the briefing so the clock runs again', () => {
    const r = dismissBriefing(createGame(config, 1))
    expect(r.ok && r.state.briefing).toBeNull()
  })
})
