// Owner: Breno. Player actions. Each returns an ActionResult and never throws.
// Validation order and refusals: research R9. bringInside / bringAllInside / resumeJobs: R12.
import { isHousing, occupantsOf, protects, roomIn } from './habitats'
import { beingDemolished, dustStormActive, externalJobsBlocked, jobSeconds } from './jobs'
import { placementError, sideGroups } from './placement'
import type {
  ActionError,
  ActionResult,
  Astronaut,
  GameConfig,
  GameState,
  Job,
  JobKind,
  PowerMode,
  StructureInstance,
  StructureTypeId,
  Tile,
  UpgradeId,
} from './types'

const EPS = 1e-9
const REPAIR_PARTS = 'repair_parts'

const ok = (state: GameState): ActionResult => ({ ok: true, state })
const refuse = (state: GameState, reason: ActionError): ActionResult => ({
  ok: false,
  reason,
  state,
})
const over = (state: GameState) => state.status !== 'running'

const defOf = (config: GameConfig, type: StructureTypeId) =>
  config.structures.find((d) => d.id === type)
const structureOf = (state: GameState, id: string) => state.structures.find((s) => s.id === id)
const hasJob = (state: GameState, structureId: string, test: (j: Job) => boolean) =>
  state.jobs.some((j) => j.structureId === structureId && test(j))

function canAfford(state: GameState, cost: Record<string, number>): boolean {
  return Object.entries(cost).every(([res, amount]) => (state.stock[res] ?? 0) >= amount - EPS)
}

function pay(state: GameState, cost: Record<string, number>): GameState {
  const stock = { ...state.stock }
  for (const [res, amount] of Object.entries(cost)) {
    stock[res] = Math.max(0, (stock[res] ?? 0) - amount)
  }
  return { ...state, stock }
}

function queueJob(
  state: GameState,
  config: GameConfig,
  kind: JobKind,
  target: StructureInstance,
  upgradeId?: UpgradeId,
): GameState {
  const job: Job = {
    id: `j${state.nextId}`,
    kind,
    structureId: target.id,
    ...(upgradeId ? { upgradeId } : {}),
    astronautId: null,
    remainingSeconds: jobSeconds(config, kind, target.type),
    status: 'queued',
  }
  return { ...state, jobs: [...state.jobs, job], nextId: state.nextId + 1 }
}

export function build(
  state: GameState,
  config: GameConfig,
  type: StructureTypeId,
  tile: Tile,
): ActionResult {
  const def = defOf(config, type)
  if (over(state) || !def) return refuse(state, 'not_allowed')
  if (externalJobsBlocked(state)) return refuse(state, 'external_jobs_blocked')
  const placement = placementError(state, config, type, tile)
  if (placement) return refuse(state, placement)
  if (!canAfford(state, def.cost)) return refuse(state, 'not_enough_resources')

  const site: StructureInstance = {
    id: `s${state.nextId}`,
    type,
    tile,
    status: 'building',
    upgrades: [],
  }
  const paid = pay(state, def.cost)
  const placed = { ...paid, structures: [...paid.structures, site], nextId: paid.nextId + 1 }
  return ok(queueJob(placed, config, 'build', site))
}

export function installUpgrade(
  state: GameState,
  config: GameConfig,
  structureId: string,
  upgradeId: UpgradeId,
): ActionResult {
  const target = structureOf(state, structureId)
  const upgrade = config.upgrades.find((u) => u.id === upgradeId)
  const allowed =
    !over(state) &&
    target &&
    upgrade &&
    target.status !== 'building' &&
    defOf(config, target.type)?.upgrades.includes(upgradeId) &&
    !target.upgrades.includes(upgradeId) &&
    !hasJob(state, structureId, (j) => j.kind === 'upgrade' && j.upgradeId === upgradeId) &&
    !beingDemolished(state, structureId)
  if (!allowed) return refuse(state, 'not_allowed')
  if (externalJobsBlocked(state)) return refuse(state, 'external_jobs_blocked')
  if (!canAfford(state, upgrade.cost)) return refuse(state, 'not_enough_resources')
  return ok(queueJob(pay(state, upgrade.cost), config, 'upgrade', target, upgradeId))
}

export function setPowerMode(
  state: GameState,
  config: GameConfig,
  type: StructureTypeId,
  mode: PowerMode,
): ActionResult {
  if (over(state) || !defOf(config, type)?.switchable) return refuse(state, 'not_allowed')
  return ok({ ...state, powerModes: { ...state.powerModes, [type]: mode } })
}

/** Called after the repair QTE: success queues the repair job; failure loses the parts. */
export function startRepair(
  state: GameState,
  config: GameConfig,
  structureId: string,
  qteSuccess: boolean,
): ActionResult {
  const target = structureOf(state, structureId)
  const allowed =
    !over(state) &&
    target &&
    (target.status === 'damaged' || target.status === 'short_circuit') &&
    !hasJob(state, structureId, (j) => j.kind === 'repair') &&
    !beingDemolished(state, structureId)
  if (!allowed) return refuse(state, 'not_allowed')
  if (externalJobsBlocked(state)) return refuse(state, 'external_jobs_blocked')
  const parts = { [REPAIR_PARTS]: config.mission.repair.parts }
  if (!canAfford(state, parts)) return refuse(state, 'not_enough_resources')
  const paid = pay(state, parts)
  return ok(qteSuccess ? queueJob(paid, config, 'repair', target) : paid)
}

export function clean(state: GameState, config: GameConfig, structureId: string): ActionResult {
  const target = structureOf(state, structureId)
  const allowed =
    !over(state) &&
    target &&
    target.status === 'clogged' &&
    !dustStormActive(state) &&
    !hasJob(state, structureId, (j) => j.kind === 'clean') &&
    !beingDemolished(state, structureId)
  if (!allowed) return refuse(state, 'not_allowed')
  if (externalJobsBlocked(state)) return refuse(state, 'external_jobs_blocked')
  return ok(queueJob(state, config, 'clean', target))
}

const isOutside = (a: Astronaut) => a.alive && a.location === 'outside'

/** A sheltered habitat with room for one more, during a radiation storm (R12). */
function shelterWithRoom(state: GameState, config: GameConfig): StructureInstance | undefined {
  return state.structures.find(
    (x) => protects(config, x, 'radiation_shelter') && roomIn(state, config, x) > 0,
  )
}

/**
 * R12: the astronaut goes inside at once. No radiation storm: into their habitat, resting until
 * exposure is 0, and their job is held with its remaining time until the player resumes it.
 * Storm (warning or active): into `home`, a sheltered habitat; the job goes back to the queue and
 * waits for the storm to end (jobs.ts).
 */
function recall(state: GameState, astronautId: string, home: string | null): GameState {
  const a = state.crew.find((x) => x.id === astronautId)
  if (!a) return state
  const storm = state.radiationStorm !== null
  return {
    ...state,
    crew: state.crew.map((x): Astronaut =>
      x.id === a.id
        ? {
            ...x,
            location: 'inside',
            jobId: null,
            habitatId: storm ? (home ?? x.habitatId) : x.habitatId,
            resting: !storm,
          }
        : x,
    ),
    jobs: state.jobs.map((j): Job =>
      j.id === a.jobId ? { ...j, status: storm ? 'queued' : 'held', astronautId: null } : j,
    ),
  }
}

/**
 * The player brings one astronaut inside: their job is held with its remaining time (nobody takes
 * it until resumeJobs) and they rest (no job) until their exposure is back to 0. During a
 * radiation storm they go into a habitat with a radiation shelter instead, and are refused if none
 * has room; their job then resumes by itself after the storm.
 */
export function bringInside(
  state: GameState,
  config: GameConfig,
  astronautId: string,
): ActionResult {
  const a = state.crew.find((x) => x.id === astronautId)
  if (over(state) || !a || !isOutside(a)) return refuse(state, 'not_allowed')
  if (!state.radiationStorm) return ok(recall(state, a.id, null))
  const shelter = shelterWithRoom(state, config)
  if (!shelter) return refuse(state, 'not_allowed')
  return ok(recall(state, a.id, shelter.id))
}

/**
 * Everyone inside ("Take shelter" during the radiation alarm): astronauts outside move into
 * habitats with a radiation shelter, up to their capacity (the rest go to their own habitat);
 * their jobs pause until the storm ends. Without a storm, everyone outside comes in to rest.
 */
export function bringAllInside(state: GameState, config: GameConfig): ActionResult {
  const outside = state.crew.filter(isOutside)
  if (over(state) || outside.length === 0) return refuse(state, 'not_allowed')
  let s = state
  for (const a of outside) {
    const home = s.radiationStorm ? (shelterWithRoom(s, config)?.id ?? null) : null
    s = recall(s, a.id, home)
  }
  return ok(s)
}

/**
 * Queues a demolish job (mission.jobs.demolishSeconds, one astronaut outside) for a structure,
 * or cancels one under construction. When the job ends the structure is removed and
 * demolishRefundShare of its cost and installed upgrades returns to the stock (jobs.ts).
 * Structures already queued for demolition count as gone for the habitat rules.
 */
export function demolish(state: GameState, config: GameConfig, structureId: string): ActionResult {
  const target = structureOf(state, structureId)
  const def = target && defOf(config, target.type)
  if (over(state) || !target || !def || beingDemolished(state, structureId)) {
    return refuse(state, 'not_allowed')
  }
  if (externalJobsBlocked(state)) return refuse(state, 'external_jobs_blocked')

  const staying = state.structures.filter((s) => !beingDemolished(state, s.id))
  const rest = staying.filter((s) => s.id !== target.id)
  if (isHousing(config, target)) {
    const otherHomes = rest.filter((s) => isHousing(config, s))
    if (otherHomes.length === 0) return refuse(state, 'last_habitat')
    const room = otherHomes.reduce((sum, s) => sum + roomIn(state, config, s), 0)
    if (occupantsOf(state, target.id) > room) return refuse(state, 'no_room_for_crew')
  }
  if (def.connectsTo.length > 0) {
    const linked = (list: StructureInstance[]) =>
      sideGroups(
        config,
        list.filter((s) => def.connectsTo.includes(s.type)),
      )
    if (linked(rest) > linked(staying)) return refuse(state, 'not_connected')
  }
  // Cancelling a construction: the build stops now, so only one astronaut goes outside.
  const buildJob = state.jobs.find((j) => j.structureId === target.id && j.kind === 'build')
  const stopped: GameState = buildJob
    ? {
        ...state,
        jobs: state.jobs.filter((j) => j.id !== buildJob.id),
        crew: state.crew.map((a) =>
          a.jobId === buildJob.id ? { ...a, location: 'inside', jobId: null } : a,
        ),
      }
    : state
  return ok(queueJob(stopped, config, 'demolish', target))
}

/**
 * "Resume" on a structure: the jobs held by bringInside / bringAllInside go back to the queue
 * with their remaining time, and the least exposed free astronaut takes them (jobs.ts). In winter
 * darkness they wait in the queue until spring.
 */
export function resumeJobs(
  state: GameState,
  _config: GameConfig,
  structureId: string,
): ActionResult {
  if (over(state) || !hasJob(state, structureId, (j) => j.status === 'held')) {
    return refuse(state, 'not_allowed')
  }
  return ok({
    ...state,
    jobs: state.jobs.map((j): Job =>
      j.structureId === structureId && j.status === 'held' ? { ...j, status: 'queued' } : j,
    ),
  })
}

export function dismissBriefing(state: GameState): ActionResult {
  return { ok: true, state: { ...state, briefing: null } }
}
