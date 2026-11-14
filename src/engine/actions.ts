// Owner: Breno. Player actions. Each returns an ActionResult and never throws.
// TODO(Breno, US4/US5): implement with TDD from actions.test.ts.
import type {
  ActionResult,
  GameConfig,
  GameState,
  PowerMode,
  StructureTypeId,
  Tile,
  UpgradeId,
} from './types'

const notYet = (state: GameState): ActionResult => ({ ok: false, reason: 'not_implemented', state })

export function build(
  state: GameState,
  _config: GameConfig,
  _type: StructureTypeId,
  _tile: Tile,
): ActionResult {
  return notYet(state)
}

export function installUpgrade(
  state: GameState,
  _config: GameConfig,
  _structureId: string,
  _upgradeId: UpgradeId,
): ActionResult {
  return notYet(state)
}

export function setPowerMode(
  state: GameState,
  _config: GameConfig,
  _type: StructureTypeId,
  _mode: PowerMode,
): ActionResult {
  return notYet(state)
}

/** Called after the repair QTE: success queues the repair job; failure loses the parts. */
export function startRepair(
  state: GameState,
  _config: GameConfig,
  _structureId: string,
  _qteSuccess: boolean,
): ActionResult {
  return notYet(state)
}

export function clean(state: GameState, _config: GameConfig, _structureId: string): ActionResult {
  return notYet(state)
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
  return notYet(state)
}

/**
 * Everyone inside ("Take shelter" during the radiation alarm): astronauts outside move into
 * habitats with a radiation shelter, up to their capacity; their jobs pause until the storm ends.
 */
export function bringAllInside(state: GameState, _config: GameConfig): ActionResult {
  return notYet(state)
}

/**
 * Queues a demolish job (mission.jobs.demolishSeconds, one astronaut outside) for a structure,
 * or cancels one under construction. When the job ends the structure is removed and
 * demolishRefundShare of its cost and installed upgrades returns to the stock. Refuses
 * last_habitat, no_room_for_crew, not_connected and external_jobs_blocked.
 */
export function demolish(
  state: GameState,
  _config: GameConfig,
  _structureId: string,
): ActionResult {
  return notYet(state)
}

export function dismissBriefing(state: GameState): ActionResult {
  return { ok: true, state: { ...state, briefing: null } }
}
