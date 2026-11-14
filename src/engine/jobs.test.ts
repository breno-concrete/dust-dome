import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { updateJobs } from './jobs'
import {
  gameAt,
  onlyStructures,
  withCrew,
  withEvents,
  withJobs,
  withStructures,
  type JobSpec,
} from './testState'
import type { GameState, Job, StructureDef, StructureStatus } from './types'

// US4 (Breno) — constitution II.9–II.10, research R8, R11

const { jobs: times, exposure } = config.mission

function defOf(id: string): StructureDef {
  const def = config.structures.find((d) => d.id === id)
  if (!def) throw new Error(`no structure ${id}`)
  return def
}

/** A spring base with one solar panel in the given state, plus `jobs` on that panel. */
function panelWith(status: StructureStatus, jobs: Omit<JobSpec, 'structureId'>[] = []) {
  const s = withStructures(gameAt(config, 1, 'spring'), config, [
    { type: 'solar_panel', tile: [0, 0], status },
  ])
  const panel = s.structures[s.structures.length - 1]
  return {
    s: withJobs(
      s,
      config,
      jobs.map((j) => ({ ...j, structureId: panel.id })),
    ),
    panel,
  }
}

const jobOf = (s: GameState, id: string): Job | undefined => s.jobs.find((j) => j.id === id)
const statusOf = (s: GameState, id: string) => s.structures.find((x) => x.id === id)?.status
const outside = (s: GameState) => s.crew.filter((a) => a.location === 'outside')
const dark = (s: GameState) => withEvents(s, [{ kind: 'darkness', blocksExternalJobs: true }])

describe('updateJobs', () => {
  it('a queued job takes a free living astronaut, who goes outside', () => {
    const { s } = panelWith('clogged', [{ kind: 'clean' }])
    const job = s.jobs[0]
    const after = updateJobs(s, config, 0)
    const worker = after.crew[0]
    expect(jobOf(after, job.id)).toMatchObject({ status: 'active', astronautId: worker.id })
    expect(worker).toMatchObject({ location: 'outside', jobId: job.id })
    expect(outside(after)).toHaveLength(1)
  })

  it('the least exposed astronaut takes the job; ties go in crew order', () => {
    const { s } = panelWith('clogged', [{ kind: 'clean' }])
    const low = exposure.resumeAt / 4
    const spread = withCrew(s, [{ exposure: low * 2 }, { exposure: low }, { exposure: low }])
    expect(updateJobs(spread, config, 0).jobs[0].astronautId).toBe(spread.crew[3].id)
    const tie = withCrew(s, [
      { exposure: low },
      { exposure: low },
      { exposure: low * 2 },
      { exposure: low * 2 },
    ])
    expect(updateJobs(tie, config, 0).jobs[0].astronautId).toBe(tie.crew[0].id)
  })

  it('only an astronaut at or below resumeAt who is not resting takes a job', () => {
    const { s } = panelWith('clogged', [{ kind: 'clean' }])
    const tired = withCrew(s, [
      { resting: true },
      { exposure: exposure.resumeAt + 0.01 },
      { alive: false },
      { exposure: exposure.resumeAt },
    ])
    expect(updateJobs(tired, config, 0).jobs[0].astronautId).toBe(tired.crew[3].id)

    const nobody = withCrew(tired, [{}, {}, {}, { exposure: exposure.warnAt }])
    const after = updateJobs(nobody, config, 0)
    expect(after.jobs[0]).toMatchObject({ status: 'queued', astronautId: null })
    expect(outside(after)).toHaveLength(0)
  })

  it('at most one active job per living astronaut; the rest wait in the queue', () => {
    const { s } = panelWith('damaged', [])
    const bigBase = withStructures(
      s,
      config,
      Array.from({ length: 6 }, (_, i) => ({
        type: 'solar_panel',
        tile: [i, 11] as const,
        status: 'clogged' as const,
      })),
    )
    const panels = bigBase.structures.slice(-6)
    const queued = withJobs(
      bigBase,
      config,
      panels.map((p) => ({ kind: 'clean', structureId: p.id })),
    )
    const oneDead = withCrew(queued, [{ alive: false }])
    const after = updateJobs(oneDead, config, 0)
    const alive = oneDead.crew.filter((a) => a.alive).length
    expect(after.jobs.map((j) => j.status)).toEqual([
      ...Array(alive).fill('active'),
      ...Array(6 - alive).fill('queued'),
    ])
    const workers = after.jobs.flatMap((j) => (j.astronautId ? [j.astronautId] : []))
    expect(new Set(workers).size).toBe(alive)
    expect(workers).not.toContain(oneDead.crew[0].id)
  })

  it("a build job finishes after the structure's buildSeconds and the structure becomes active", () => {
    for (const type of ['solar_panel', 'iron_refinery', 'steel_factory']) {
      const base = onlyStructures(gameAt(config, 1, 'spring'), config, [
        { type: 'habitat', tile: [0, 0] },
        { type, tile: [6, 6], status: 'building' },
      ])
      const site = base.structures[1]
      let s = updateJobs(
        withJobs(base, config, [{ kind: 'build', structureId: site.id }]),
        config,
        0,
      )
      s = updateJobs(s, config, defOf(type).buildSeconds - 1)
      expect(statusOf(s, site.id)).toBe('building')
      s = updateJobs(s, config, 1)
      expect(statusOf(s, site.id)).toBe('active')
      expect(s.jobs).toEqual([])
      expect(s.log.at(-1)).toMatchObject({ kind: 'built', ref: site.id })
    }
  })

  it('a demolish job removes the structure and refunds demolishRefundShare of its cost and upgrades, whatever its state (log "demolished")', () => {
    const { s, panel } = panelWith('damaged', [{ kind: 'demolish' }])
    const upgraded = {
      ...s,
      structures: s.structures.map((x) =>
        x.id === panel.id ? { ...x, upgrades: ['dust_filters'] } : x,
      ),
    }
    let after = updateJobs(upgraded, config, 0)
    after = updateJobs(after, config, times.demolishSeconds)
    expect(after.structures.find((x) => x.id === panel.id)).toBeUndefined()
    expect(after.jobs).toEqual([])
    const filters = config.upgrades.find((u) => u.id === 'dust_filters')!.cost
    const paid: Record<string, number> = { ...defOf('solar_panel').cost }
    for (const [res, amount] of Object.entries(filters)) paid[res] = (paid[res] ?? 0) + amount
    for (const [res, amount] of Object.entries(paid)) {
      expect(after.stock[res]).toBeCloseTo(
        s.stock[res] + config.mission.demolishRefundShare * amount,
      )
    }
    expect(after.log.at(-1)).toMatchObject({ kind: 'demolished', ref: panel.id })
  })

  it('demolishing a habitat moves its occupants into another habitat', () => {
    const base = onlyStructures(gameAt(config, 1, 'spring'), config, [
      { type: 'habitat', tile: [0, 0] },
      { type: 'habitat', tile: [2, 0] },
    ])
    const [first, second] = base.structures
    const housed = withCrew(
      base,
      base.crew.map(() => ({ habitatId: first.id })),
    )
    let s = withJobs(housed, config, [{ kind: 'demolish', structureId: first.id }])
    s = updateJobs(updateJobs(s, config, 0), config, times.demolishSeconds)
    expect(s.structures.map((x) => x.id)).toEqual([second.id])
    expect(s.crew.every((a) => a.habitatId === second.id)).toBe(true)
  })

  it('the occupants never move into a habitat that is also being demolished', () => {
    // Three habitats in an L; the crew lives in the corner one. Corner and right are leaving.
    const base = onlyStructures(gameAt(config, 1, 'spring'), config, [
      { type: 'habitat', tile: [0, 0] },
      { type: 'habitat', tile: [2, 0] },
      { type: 'habitat', tile: [0, 2] },
    ])
    const [corner, right, below] = base.structures
    const housed = withCrew(
      base,
      base.crew.map((_, i) => ({ habitatId: corner.id, resting: i > 0 })),
    )
    let s = withJobs(housed, config, [
      { kind: 'demolish', structureId: corner.id, status: 'active', astronautId: base.crew[0].id },
      { kind: 'demolish', structureId: right.id },
    ])
    s = updateJobs(s, config, times.demolishSeconds)
    expect(s.structures.map((x) => x.id)).toEqual([right.id, below.id])
    expect(s.crew.every((a) => a.habitatId === below.id)).toBe(true)
  })

  it('an upgrade job adds the upgrade to the structure', () => {
    const { s, panel } = panelWith('active', [{ kind: 'upgrade', upgradeId: 'dust_filters' }])
    let after = updateJobs(s, config, 0)
    after = updateJobs(after, config, times.upgradeSeconds)
    expect(after.structures.find((x) => x.id === panel.id)?.upgrades).toEqual(['dust_filters'])
    expect(after.jobs).toEqual([])
    expect(after.log.at(-1)).toMatchObject({ kind: 'upgrade_installed', ref: panel.id })
  })

  it('a repair job restores damaged or short_circuit structures', () => {
    for (const status of ['damaged', 'short_circuit'] as const) {
      const { s, panel } = panelWith(status, [{ kind: 'repair' }])
      let after = updateJobs(s, config, 0)
      after = updateJobs(after, config, times.repairSeconds - 1)
      expect(statusOf(after, panel.id)).toBe(status)
      after = updateJobs(after, config, 1)
      expect(statusOf(after, panel.id)).toBe('active')
      expect(after.log.at(-1)).toMatchObject({ kind: 'repaired', ref: panel.id })
    }
  })

  it('a clean job restores clogged structures and cannot run during an active dust storm', () => {
    const { s, panel } = panelWith('clogged', [{ kind: 'clean' }])
    const done = updateJobs(updateJobs(s, config, 0), config, times.cleanSeconds)
    expect(statusOf(done, panel.id)).toBe('active')
    expect(done.log.at(-1)).toMatchObject({ kind: 'cleaned', ref: panel.id })

    for (const kind of ['dust_storm', 'global_dust_storm'] as const) {
      const waiting = updateJobs(withEvents(s, [{ kind }]), config, times.cleanSeconds)
      expect(waiting.jobs[0]).toMatchObject({ status: 'queued', astronautId: null })
      expect(statusOf(waiting, panel.id)).toBe('clogged')

      const started = updateJobs(s, config, 1)
      const stormy = updateJobs(withEvents(started, [{ kind }]), config, times.cleanSeconds)
      expect(stormy.jobs[0]).toMatchObject({ status: 'paused', astronautId: null })
      expect(outside(stormy)).toHaveLength(0)
      expect(statusOf(stormy, panel.id)).toBe('clogged')
    }
  })

  it('jobs pause while an event blocks external jobs, and resume after', () => {
    const { s, panel } = panelWith('damaged', [{ kind: 'repair' }])
    const started = updateJobs(updateJobs(s, config, 0), config, 1)
    const left = started.jobs[0].remainingSeconds
    expect(left).toBeCloseTo(times.repairSeconds - 1)

    const paused = updateJobs(dark(started), config, times.repairSeconds)
    expect(paused.jobs[0]).toMatchObject({ status: 'paused', astronautId: null })
    expect(paused.jobs[0].remainingSeconds).toBeCloseTo(left)
    expect(outside(paused)).toHaveLength(0)
    expect(paused.crew.every((a) => a.jobId === null)).toBe(true)
    expect(statusOf(paused, panel.id)).toBe('damaged')

    const resumed = updateJobs({ ...paused, activeEvents: [] }, config, 0)
    expect(resumed.jobs[0].status).toBe('active')
    expect(outside(resumed)).toHaveLength(1)
    const finished = updateJobs(resumed, config, left)
    expect(statusOf(finished, panel.id)).toBe('active')
  })

  it('the astronaut goes back inside when the job ends', () => {
    const { s } = panelWith('clogged', [{ kind: 'clean' }])
    const working = updateJobs(s, config, 0)
    expect(outside(working)).toHaveLength(1)
    const done = updateJobs(working, config, times.cleanSeconds)
    expect(outside(done)).toHaveLength(0)
    expect(done.crew.every((a) => a.jobId === null)).toBe(true)
  })

  it('no job starts while a radiation storm is on (warning or active)', () => {
    const { s } = panelWith('clogged', [{ kind: 'clean' }])
    for (const phase of ['warning', 'active'] as const) {
      const storm: GameState = {
        ...s,
        radiationStorm: { phase, phaseEndsAt: s.time.elapsed + 10, basedOn: null },
      }
      const after = updateJobs(storm, config, 1)
      expect(after.jobs[0]).toMatchObject({ status: 'queued', astronautId: null })
      expect(outside(after)).toHaveLength(0)
    }
  })

  it('a job whose astronaut dies or is recalled goes back to the queue with its remaining time', () => {
    const { s } = panelWith('damaged', [{ kind: 'repair' }])
    const started = updateJobs(updateJobs(s, config, 0), config, 1)
    const left = started.jobs[0].remainingSeconds
    const first = started.crew[0]
    expect(started.jobs[0].astronautId).toBe(first.id)

    // Nobody else can take it, so it waits in the queue with the time it had left.
    const othersBusy = withCrew(started, [
      {},
      { resting: true },
      { resting: true },
      { resting: true },
    ])
    const dead = updateJobs(withCrew(othersBusy, [{ alive: false }]), config, 1)
    expect(dead.jobs[0]).toMatchObject({ status: 'queued', astronautId: null })
    expect(dead.jobs[0].remainingSeconds).toBeCloseTo(left)
    expect(dead.crew[0].jobId).toBeNull()

    // Recalled: inside and resting, so another astronaut continues from where it stopped.
    const recalled = withCrew(started, [{ location: 'inside', jobId: null, resting: true }])
    const after = updateJobs(recalled, config, 0)
    expect(after.jobs[0].astronautId).toBe(recalled.crew[1].id)
    expect(after.jobs[0].remainingSeconds).toBeCloseTo(left)
  })
})
