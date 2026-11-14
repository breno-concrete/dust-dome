// Owner: Breno. Power balance, batteries, heating and brownout (constitution II.7).
// Research R5 (production and demand), R6 (brownout without flicker), R7 (battery charge).
import { conditionFactor } from './economy'
import type {
  GameConfig,
  GameState,
  StructureDef,
  StructureInstance,
  StructureTypeId,
} from './types'

const EPS = 1e-9

type CycleKey = '1' | '2' | '3' | '4'

function defOf(config: GameConfig, type: StructureTypeId): StructureDef | undefined {
  return config.structures.find((d) => d.id === type)
}

function isInsulated(s: StructureInstance, config: GameConfig): boolean {
  return s.upgrades.some((id) => config.upgrades.find((u) => u.id === id)?.effect === 'insulation')
}

function productionOf(s: StructureInstance, state: GameState, config: GameConfig): number {
  const def = defOf(config, s.type)
  if (!def || s.status === 'building') return 0
  if (def.power.kind === 'constant') return def.power.kw
  if (def.power.kind !== 'solar') return 0
  const { cycle, season } = state.time
  if (season === 'winter' && cycle >= config.seasons.winterDarknessFromCycle) return 0
  const solarFactor = state.activeEvents.reduce((f, e) => f * e.solarFactor, 1)
  return (
    def.power.kwBySeason[season] * solarFactor * conditionFactor(s.status, config.mission.damage)
  )
}

/** Draw of one structure at its type's switch, before any brownout. */
function drawOf(s: StructureInstance, state: GameState, config: GameConfig): number {
  const def = defOf(config, s.type)
  if (!def || def.power.kind !== 'consumer') return 0
  if (s.status === 'building' || s.status === 'short_circuit') return 0
  // Structures without a switch (the habitat) always draw their Base value.
  const mode = def.switchable ? (state.powerModes[s.type] ?? 'min') : 'min'
  if (mode === 'off') return 0
  const table =
    isInsulated(s, config) && def.insulatedHeatingKw ? def.insulatedHeatingKw : def.heatingKw
  const { minKw, maxKw } = def.power
  const cycle = String(Math.min(state.time.cycle, 4)) as CycleKey
  const baseKw = table ? table[cycle][state.time.season] : minKw
  return mode === 'max' ? baseKw + maxKw - minKw : baseKw
}

function demandOf(
  state: GameState,
  config: GameConfig,
  shed: readonly StructureTypeId[] = [],
): number {
  return state.structures
    .filter((s) => !shed.includes(s.type))
    .reduce((sum, s) => sum + drawOf(s, state, config), 0)
}

/** Demand of every structure at its switch, before any brownout (also used by the win check). */
export function demandAtSwitches(state: GameState, config: GameConfig): number {
  return demandOf(state, config)
}

/** Sum of the finished battery banks' capacity. */
export function batteryCapacity(state: GameState, config: GameConfig): number {
  return state.structures.reduce((sum, s) => {
    const def = defOf(config, s.type)
    return def?.power.kind === 'storage' && s.status !== 'building'
      ? sum + def.power.capacityEu
      : sum
  }, 0)
}

/** Next brownout set, starting from the previous step's (R6). */
function nextShed(
  state: GameState,
  config: GameConfig,
  productionKw: number,
  capacity: number,
): StructureTypeId[] {
  const order = config.mission.brownoutOrder
  const empty = state.batteryEu <= EPS
  const full = capacity > 0 && state.batteryEu >= capacity - EPS
  const fits = (shed: StructureTypeId[]) => productionKw >= demandOf(state, config, shed) - EPS

  // 1. Full batteries bring everything back; otherwise restore the most vital types first while
  //    production alone covers them.
  let shed = full ? [] : order.filter((t) => state.power.shed.includes(t))
  for (const type of [...shed].reverse()) {
    const without = shed.filter((t) => t !== type)
    if (fits(without)) shed = without
    else break
  }

  // 2. Empty batteries: switch types off in brownout order until demand fits. Types that draw
  //    nothing right now are skipped: switching them off would change nothing.
  if (empty) {
    for (const type of order) {
      if (fits(shed)) break
      if (shed.includes(type)) continue
      const draws = state.structures.some((s) => s.type === type && drawOf(s, state, config) > 0)
      if (draws) shed = [...shed, type]
    }
  }
  return shed
}

export function computePower(state: GameState, config: GameConfig, dt: number): GameState {
  const productionKw = state.structures.reduce((sum, s) => sum + productionOf(s, state, config), 0)
  const capacity = batteryCapacity(state, config)
  const shed = nextShed(state, config, productionKw, capacity)
  const demandKw = demandOf(state, config, shed)
  const balanceKw = productionKw - demandKw
  // Every switchable type is off and production still misses: only the habitats are left.
  const unheated = state.batteryEu <= EPS && balanceKw < -EPS
  const batteryEu = Math.min(capacity, Math.max(0, state.batteryEu + balanceKw * dt))

  const changed =
    shed.length !== state.power.shed.length || shed.some((t) => !state.power.shed.includes(t))
  const log = changed
    ? [
        ...state.log,
        {
          at: state.time.elapsed,
          cycle: state.time.cycle,
          season: state.time.season,
          kind: 'power_shed' as const,
          ref: shed.join(','),
        },
      ]
    : state.log

  return {
    ...state,
    batteryEu,
    power: { productionKw, demandKw, balanceKw, shed, unheated },
    log,
  }
}
