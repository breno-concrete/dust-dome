// Owner: Breno. Player actions. Each returns an ActionResult and never throws.
// Validation order and refusals: research R9. bringInside / bringAllInside: US5 (R12).
import { isHousing, occupantsOf, roomIn } from './habitats'
import { dustStormActive, externalJobsBlocked, jobSeconds } from './jobs'
import { placementError, sideGroups } from './placement'
import type {
  ActionError,
  ActionResult,
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
const notYet = (state: GameState): ActionResult => refuse(state, 'not_implemented')
const over = (state: GameState) => state.status !== 'running'

const defOf = (config: GameConfig, type: StructureTypeId) =>
  config.structures.find((d) => d.id === type)
const structureOf = (state: GameState, id: string) => state.structures.find((s) => s.id === id)
const hasJob = (state: GameState, structureId: string, test: (j: Job) => boolean) =>
  state.jobs.some((j) => j.structureId === structureId && test(j))
const beingDemolished = (state: GameState, structureId: string) =>
  hasJob(state, structureId, (j) => j.kind === 'demolish')

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

/**
 * The player brings one astronaut inside: their job goes back to the queue with its remaining
 * time and they rest (no job) until their exposure is back to 0.
 */
export function bringInside(
  state: GameState,
  _config: GameConfig,
  _astronautId: string,
): ActionResult {
  if (over(state)) return refuse(state, 'not_allowed')
  return notYet(state)
}

/**
 * Everyone inside ("Take shelter" during the radiation alarm): astronauts outside move into
 * habitats with a radiation shelter, up to their capacity; their jobs pause until the storm ends.
 */
export function bringAllInside(state: GameState, _config: GameConfig): ActionResult {
  if (over(state)) return refuse(state, 'not_allowed')
  return notYet(state)
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
  return ok(queueJob(state, config, 'demolish', target))
}

export function dismissBriefing(state: GameState): ActionResult {
  return { ok: true, state: { ...state, briefing: null } }
}
