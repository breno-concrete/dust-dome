// Owner: Breno. External jobs: build, upgrade, repair, clean, demolish (constitution II.6,
// II.9–II.10; research R8, R11).
import { isHousing, roomIn } from './habitats'
import type {
  Astronaut,
  GameConfig,
  GameState,
  Job,
  JobKind,
  LogKind,
  StructureInstance,
  StructureTypeId,
} from './types'

const EPS = 1e-9

/** Winter darkness (cycles 2–4) and any other event that keeps astronauts inside (R8). */
export function externalJobsBlocked(state: GameState): boolean {
  return state.activeEvents.some((e) => e.blocksExternalJobs)
}

/** A demolish job is waiting or running: for the grid and habitat rules it is already gone. */
export function beingDemolished(state: GameState, structureId: string): boolean {
  return state.jobs.some((j) => j.kind === 'demolish' && j.structureId === structureId)
}

export function dustStormActive(state: GameState): boolean {
  return state.activeEvents.some((e) => e.kind === 'dust_storm' || e.kind === 'global_dust_storm')
}

/** Configured duration of a job; a build takes the build time of the structure's type. */
export function jobSeconds(config: GameConfig, kind: JobKind, type?: StructureTypeId): number {
  const { jobs } = config.mission
  switch (kind) {
    case 'build':
      return config.structures.find((d) => d.id === type)?.buildSeconds ?? 0
    case 'upgrade':
      return jobs.upgradeSeconds
    case 'repair':
      return jobs.repairSeconds
    case 'clean':
      return jobs.cleanSeconds
    case 'demolish':
      return jobs.demolishSeconds
  }
}

/** Everything paid for a structure: its cost plus the cost of its installed upgrades. */
export function paidFor(config: GameConfig, s: StructureInstance): Record<string, number> {
  const paid: Record<string, number> = {}
  const costs = [
    config.structures.find((d) => d.id === s.type)?.cost ?? {},
    ...s.upgrades.map((id) => config.upgrades.find((u) => u.id === id)?.cost ?? {}),
  ]
  for (const cost of costs) {
    for (const [res, amount] of Object.entries(cost)) paid[res] = (paid[res] ?? 0) + amount
  }
  return paid
}

/**
 * One step of the job queue, in three passes (R11): blocks, progress, assignment.
 * A job that cannot run now never holds back the jobs behind it.
 */
export function updateJobs(state: GameState, config: GameConfig, dt: number): GameState {
  return assign(progress(holdAndRelease(state), config, dt), config)
}

function held(state: GameState, job: Job): boolean {
  return externalJobsBlocked(state) || (job.kind === 'clean' && dustStormActive(state))
}

function goInside(crew: Astronaut[], astronautId: string | null): Astronaut[] {
  return crew.map((a) =>
    a.id === astronautId && a.jobId !== null ? { ...a, location: 'inside', jobId: null } : a,
  )
}

/** Pass 1: blocked jobs pause (astronaut inside); orphaned jobs go back to the queue. */
function holdAndRelease(state: GameState): GameState {
  let crew = state.crew
  const jobs = state.jobs.map((job): Job => {
    if (job.status === 'paused') return held(state, job) ? job : { ...job, status: 'queued' }
    if (job.status !== 'active') return job
    const worker = crew.find((a) => a.id === job.astronautId)
    const orphaned = !worker || !worker.alive || worker.jobId !== job.id
    if (!orphaned && !held(state, job)) return job
    if (worker?.jobId === job.id) crew = goInside(crew, worker.id)
    return { ...job, status: orphaned ? 'queued' : 'paused', astronautId: null }
  })
  return { ...state, crew, jobs }
}

/** Pass 2: running jobs advance; finished ones apply their effect and free the astronaut. */
function progress(state: GameState, config: GameConfig, dt: number): GameState {
  let s = state
  for (const { id } of state.jobs.filter((j) => j.status === 'active')) {
    const job = s.jobs.find((j) => j.id === id)
    if (!job) continue // removed by a demolition earlier in this pass
    const left = job.remainingSeconds - dt
    if (left > EPS) {
      s = { ...s, jobs: s.jobs.map((j) => (j.id === id ? { ...j, remainingSeconds: left } : j)) }
    } else {
      s = finish(s, config, job)
    }
  }
  return s
}

const LOG_KIND: Record<JobKind, LogKind> = {
  build: 'built',
  upgrade: 'upgrade_installed',
  repair: 'repaired',
  clean: 'cleaned',
  demolish: 'demolished',
}

function finish(state: GameState, config: GameConfig, job: Job): GameState {
  let s: GameState = {
    ...state,
    jobs: state.jobs.filter((j) => j.id !== job.id),
    crew: goInside(state.crew, job.astronautId),
  }
  const target = s.structures.find((x) => x.id === job.structureId)
  if (!target) return s
  if (job.kind === 'demolish') {
    s = removeStructure(s, config, target)
  } else {
    s = { ...s, structures: s.structures.map((x) => (x.id === target.id ? applied(x, job) : x)) }
  }
  const { cycle, season, elapsed } = s.time
  return {
    ...s,
    log: [...s.log, { at: elapsed, cycle, season, kind: LOG_KIND[job.kind], ref: target.id }],
  }
}

function applied(s: StructureInstance, job: Job): StructureInstance {
  switch (job.kind) {
    case 'build':
      return s.status === 'building' ? { ...s, status: 'active' } : s
    case 'repair':
      return s.status === 'damaged' || s.status === 'short_circuit' ? { ...s, status: 'active' } : s
    case 'clean':
      return s.status === 'clogged' ? { ...s, status: 'active' } : s
    case 'upgrade':
      return job.upgradeId && !s.upgrades.includes(job.upgradeId)
        ? { ...s, upgrades: [...s.upgrades, job.upgradeId] }
        : s
    case 'demolish':
      return s
  }
}

/**
 * Demolition (II.6): refund everything paid (cost, installed upgrades and upgrades already paid
 * but still in the queue), drop the structure and its other jobs, move its occupants.
 */
function removeStructure(state: GameState, config: GameConfig, target: StructureInstance) {
  const dropped = state.jobs.filter((j) => j.structureId === target.id)
  const waiting = dropped.flatMap((j) =>
    j.kind === 'upgrade' && j.upgradeId && !target.upgrades.includes(j.upgradeId)
      ? [j.upgradeId]
      : [],
  )
  const share = config.mission.demolishRefundShare
  const stock = { ...state.stock }
  const paid = paidFor(config, { ...target, upgrades: [...target.upgrades, ...waiting] })
  for (const [res, amount] of Object.entries(paid)) {
    stock[res] = (stock[res] ?? 0) + share * amount
  }
  let crew = state.crew
  for (const j of dropped) crew = goInside(crew, j.astronautId)

  let s: GameState = {
    ...state,
    stock,
    crew,
    structures: state.structures.filter((x) => x.id !== target.id),
    jobs: state.jobs.filter((j) => j.structureId !== target.id),
  }
  for (const a of s.crew.filter((x) => x.habitatId === target.id)) {
    const home = a.alive
      ? s.structures.find(
          (x) => isHousing(config, x) && roomIn(s, config, x) > 0 && !beingDemolished(s, x.id),
        )
      : undefined
    s = {
      ...s,
      crew: s.crew.map((x) => (x.id === a.id ? { ...x, habitatId: home?.id ?? null } : x)),
    }
  }
  return s
}

/** Pass 3: queued jobs, in request order, take the least exposed eligible astronaut. */
function assign(state: GameState, config: GameConfig): GameState {
  if (externalJobsBlocked(state) || state.radiationStorm) return state
  const { resumeAt } = config.mission.exposure
  const storm = dustStormActive(state)
  let crew = state.crew
  const jobs = state.jobs.map((job): Job => {
    if (job.status !== 'queued' || (job.kind === 'clean' && storm)) return job
    const free = crew.filter(
      (a) =>
        a.alive &&
        a.location === 'inside' &&
        a.jobId === null &&
        !a.resting &&
        a.exposure <= resumeAt + EPS,
    )
    // Array.sort is stable, so equal exposures keep crew order.
    const worker = [...free].sort((a, b) => a.exposure - b.exposure)[0]
    if (!worker) return job
    crew = crew.map((a) => (a.id === worker.id ? { ...a, location: 'outside', jobId: job.id } : a))
    return { ...job, status: 'active', astronautId: worker.id }
  })
  return { ...state, crew, jobs }
}
