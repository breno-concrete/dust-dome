// Owner: Breno. Production, conversion and consumption (constitution II.4–II.6, II.8).
// Research R3 (per-second rates) and R4 (partial input, competition order).
import { seasonDuration } from './time'
import type {
  GameConfig,
  GameState,
  MissionConfig,
  Stock,
  StructureStatus,
  StructureTypeId,
} from './types'

type Amounts = Record<string, number>

interface Process {
  type: StructureTypeId
  inputs: Amounts
  outputs: Amounts
  /** Condition factor × dt / season duration: turns per-season amounts into this step's. */
  scale: number
}

/** How much of its normal output a structure gives in this condition. */
function conditionFactor(status: StructureStatus, damage: MissionConfig['damage']): number {
  switch (status) {
    case 'active':
      return 1
    case 'damaged':
      return damage.damagedFactor
    case 'clogged':
      return damage.cloggedFactor
    case 'short_circuit':
    case 'building':
      return 0
  }
}

/** Runs one process at the fraction its scarcest input allows; never leaves a stock below 0. */
function runProcess(stock: Stock, p: Process) {
  const inputs = Object.entries(p.inputs)
  const ratios = inputs.map(([r, n]) => (stock[r] ?? 0) / (n * p.scale))
  const f = Math.min(1, ...ratios)
  if (f <= 0) return
  inputs.forEach(([r, n], i) => {
    // The scarcest input is used up exactly, so it lands on 0 instead of a rounding crumb.
    stock[r] = ratios[i] <= f ? 0 : (stock[r] ?? 0) - f * n * p.scale
  })
  for (const [r, n] of Object.entries(p.outputs)) {
    stock[r] = (stock[r] ?? 0) + f * n * p.scale
  }
}

export function applyProduction(state: GameState, config: GameConfig, dt: number): GameState {
  const perSeason = dt / seasonDuration(config, state.time.season)
  const { damage, brownoutOrder, needs } = config.mission

  const processes: Process[] = []
  for (const s of state.structures) {
    const def = config.structures.find((d) => d.id === s.type)
    const mode = state.powerModes[s.type] ?? 'min'
    if (!def?.outputs || mode === 'off' || state.power.shed.includes(s.type)) continue
    const scale = conditionFactor(s.status, damage) * perSeason
    if (scale <= 0) continue
    processes.push({
      type: s.type,
      inputs: def.inputs?.[mode] ?? {},
      outputs: def.outputs[mode],
      scale,
    })
  }

  // Producers without inputs first, then converters with the most vital type first
  // (reverse brownout order), then creation order (sort is stable).
  const vital = (type: StructureTypeId) => {
    const i = brownoutOrder.indexOf(type)
    return i === -1 ? brownoutOrder.length : i
  }
  const isConverter = (p: Process) => Object.keys(p.inputs).length > 0
  const ordered = [
    ...processes.filter((p) => !isConverter(p)),
    ...processes.filter(isConverter).sort((a, b) => vital(b.type) - vital(a.type)),
  ]

  const stock: Stock = { ...state.stock }
  for (const p of ordered) runProcess(stock, p)

  const living = state.crew.filter((a) => a.alive).length
  for (const [r, n] of Object.entries(needs)) {
    stock[r] = Math.max(0, (stock[r] ?? 0) - n * living * perSeason)
  }

  return { ...state, stock }
}
