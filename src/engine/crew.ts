// Owner: Breno. Exposure, deaths and shelters (constitution II.2, II.9; research R13–R15).
import { capacityOf, protects } from './habitats'
import { seasonDuration, seasonStartedThisStep } from './time'
import type { Astronaut, GameConfig, GameState, Job, UpgradeDef } from './types'

const EPS = 1e-9

/** Death countdowns (R14), in the order they are checked. */
const RESERVE_TIMERS = [
  ['empty_oxygen', 'oxygen'],
  ['empty_water', 'water'],
  ['empty_food', 'food'],
] as const

/**
 * One crew step: exposure (with the automatic return at warnAt), protection against extreme
 * cold and radiation storms, then the death countdowns. Never draws from the random generator.
 */
export function updateCrew(state: GameState, config: GameConfig, dt: number): GameState {
  let s = updateExposure(state, config, dt)
  if (extremeColdStrikes(s, config, dt)) s = protect(s, config, 'insulation', 'cold')
  if (s.radiationStorm?.phase === 'active') {
    s = protect(s, config, 'radiation_shelter', 'radiation_storm')
  }
  return countdowns(s, config, dt)
}

/** R13: fill outside, recover inside; at warnAt the astronaut comes back and the job waits. */
function updateExposure(state: GameState, config: GameConfig, dt: number): GameState {
  const { maxShareOfSeason, recoveryRate, warnAt } = config.mission.exposure
  const fill = 1 / (maxShareOfSeason * seasonDuration(config, state.time.season))
  let jobs = state.jobs
  const crew = state.crew.map((a): Astronaut => {
    if (!a.alive) return a
    if (a.location === 'inside') {
      const exposure = Math.max(0, a.exposure - recoveryRate * fill * dt)
      return { ...a, exposure, resting: a.resting && exposure > EPS }
    }
    const exposure = Math.min(1, a.exposure + fill * dt)
    if (exposure < warnAt - EPS) return { ...a, exposure }
    jobs = requeue(jobs, a.jobId)
    return { ...a, exposure, location: 'inside', jobId: null }
  })
  return { ...state, crew, jobs }
}

/** The job goes back to the queue with its remaining time; any free astronaut may continue it. */
function requeue(jobs: Job[], jobId: string | null): Job[] {
  if (jobId === null) return jobs
  return jobs.map((j) => (j.id === jobId ? { ...j, status: 'queued', astronautId: null } : j))
}

function extremeColdStrikes(state: GameState, config: GameConfig, dt: number): boolean {
  const seasons = config.seasons.seasons
  return (
    state.time.season === seasons[seasons.length - 1].id &&
    state.time.cycle >= config.mission.insulationRequiredFromCycle &&
    seasonStartedThisStep(state, dt)
  )
}

/**
 * R15: the astronauts inside move into finished habitats with the protecting upgrade, in crew
 * order, up to their capacity; those already in one keep their place. Everyone else dies.
 */
function protect(
  state: GameState,
  config: GameConfig,
  effect: UpgradeDef['effect'],
  cause: string,
): GameState {
  const safe = state.structures.filter((x) => protects(config, x, effect))
  const room = new Map(safe.map((x) => [x.id, capacityOf(config, x)]))
  const living = state.crew.filter((a) => a.alive)
  const placed = new Map<string, string>()

  for (const a of living) {
    const left = a.habitatId === null ? undefined : room.get(a.habitatId)
    if (a.location === 'inside' && a.habitatId !== null && left !== undefined && left > 0) {
      placed.set(a.id, a.habitatId)
      room.set(a.habitatId, left - 1)
    }
  }
  for (const a of living) {
    if (a.location !== 'inside' || placed.has(a.id)) continue
    const home = safe.find((x) => (room.get(x.id) ?? 0) > 0)
    if (!home) continue
    placed.set(a.id, home.id)
    room.set(home.id, (room.get(home.id) ?? 0) - 1)
  }

  let s: GameState = {
    ...state,
    crew: state.crew.map((a) => {
      const home = placed.get(a.id)
      return home ? { ...a, habitatId: home } : a
    }),
  }
  for (const a of living) if (!placed.has(a.id)) s = kill(s, a.id, cause)
  return s
}

/** R14: each true condition runs its own timer; at graceSeconds one astronaut dies. */
function countdowns(state: GameState, config: GameConfig, dt: number): GameState {
  const { graceSeconds, deathEverySeconds } = config.mission.emptyReserve
  const conditions: [string, boolean][] = [
    ...RESERVE_TIMERS.map(([key, res]): [string, boolean] => [key, (state.stock[res] ?? 0) <= EPS]),
    ['cold', state.power.unheated],
  ]
  let s = state
  const timers = { ...state.dangerTimers }
  for (const [key, active] of conditions) {
    if (!active) {
      if (key in timers) timers[key] = 0
      continue
    }
    let timer = (timers[key] ?? 0) + dt
    while (timer >= graceSeconds - EPS) {
      const victim = s.crew.find((a) => a.alive)
      if (!victim) break
      s = kill(s, victim.id, key)
      timer -= deathEverySeconds
    }
    timers[key] = timer
  }
  return { ...s, dangerTimers: timers }
}

/** Death: the job goes back to the queue and the log records the cause. */
function kill(state: GameState, astronautId: string, cause: string): GameState {
  const victim = state.crew.find((a) => a.id === astronautId)
  if (!victim?.alive) return state
  const { cycle, season, elapsed } = state.time
  return {
    ...state,
    crew: state.crew.map((a) => (a.id === astronautId ? { ...a, alive: false, jobId: null } : a)),
    jobs: requeue(state.jobs, victim.jobId),
    log: [...state.log, { at: elapsed, cycle, season, kind: 'death', ref: astronautId, cause }],
  }
}
