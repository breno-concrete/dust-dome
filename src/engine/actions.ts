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

/** Radiation alarm: every astronaut outside goes into a sheltered habitat; jobs pause. */
export function shelterAll(state: GameState, _config: GameConfig): ActionResult {
  return notYet(state)
}

export function dismissBriefing(state: GameState): ActionResult {
  return { ok: true, state: { ...state, briefing: null } }
}
