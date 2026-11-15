import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { applyProduction } from './economy'
import { gameAt, onlyStructures, withCrew, withStock, type StructureSpec } from './testState'
import type { GameState, PowerMode, StructureStatus, StructureTypeId } from './types'

const season = config.seasons.seasons[0]
const duration = season.durationSeconds
const { damage, needs, brownoutOrder } = config.mission

function def(type: StructureTypeId) {
  return config.structures.find((s) => s.id === type)!
}

/** A running mission at the start of the first season with only these structures. */
function base(specs: StructureSpec[], modes: Record<string, PowerMode> = {}): GameState {
  const s = onlyStructures(gameAt(config, 1, season.id), config, specs)
  return { ...s, powerModes: { ...s.powerModes, ...modes } }
}

function one(type: StructureTypeId, status: StructureStatus = 'active'): StructureSpec[] {
  return [{ type, tile: [0, 0], status }]
}

/** Applies production in `steps` steps of `dt` seconds. */
function run(state: GameState, steps: number, dt = 1): GameState {
  let s = state
  for (let i = 0; i < steps; i++) s = applyProduction(s, config, dt)
  return s
}

function gained(before: GameState, after: GameState, resource: string): number {
  return (after.stock[resource] ?? 0) - (before.stock[resource] ?? 0)
}

/** Within 1 % of the expected amount (SC-003). */
function expectNear(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 0.01 + 1e-9)
}

// US2 (Breno) — constitution II.4–II.6, II.8. Per-season amounts are spread evenly over the season.
describe('applyProduction', () => {
  // T026 — FR-006
  it('produces each structure output per second = per-season amount / season duration', () => {
    const before = base(one('mine'), { mine: 'min' })
    const after = run(before, duration)
    for (const [r, n] of Object.entries(def('mine').outputs!.min)) {
      expectNear(gained(before, after, r), n)
    }
  })

  // T027 — FR-007
  it('uses the min or max amounts from the power mode of the structure type', () => {
    const before = base(one('mine'), { mine: 'max' })
    const after = run(before, duration)
    for (const [r, n] of Object.entries(def('mine').outputs!.max)) {
      expectNear(gained(before, after, r), n)
    }
  })

  // T028 — FR-007
  it('produces nothing when the type is off or shed by the brownout', () => {
    const off = base(one('mine'), { mine: 'off' })
    const minShed = base(one('mine'), { mine: 'min' })
    const shed = { ...minShed, power: { ...minShed.power, shed: ['mine'] } }
    for (const before of [off, shed]) {
      const after = applyProduction(before, config, duration)
      for (const r of Object.keys(def('mine').outputs!.min)) {
        expect(gained(before, after, r)).toBe(0)
      }
    }
  })

  // T029 — FR-008
  it('consumes inputs and stops producing when an input runs out', () => {
    const refinery = def('iron_refinery')
    const [input, perSeasonIn] = Object.entries(refinery.inputs!.min)[0]
    const [output, perSeasonOut] = Object.entries(refinery.outputs!.min)[0]
    const needPerStep = perSeasonIn / duration
    const before = withStock(base(one('iron_refinery'), { iron_refinery: 'min' }), {
      [input]: needPerStep / 2,
      [output]: 0,
    })

    const after = applyProduction(before, config, 1)
    expect(after.stock[input]).toBe(0)
    // Half of the input it needed -> half of its output.
    expect(gained(before, after, output)).toBeCloseTo(perSeasonOut / duration / 2, 9)

    const later = applyProduction(after, config, 1)
    expect(gained(after, later, output)).toBe(0)
    for (const n of Object.values(later.stock)) expect(n).toBeGreaterThanOrEqual(0)
  })

  // T030 — FR-007, R4
  it.each([
    ['damaged', damage.damagedFactor],
    ['clogged', damage.cloggedFactor],
    ['short_circuit', 0],
  ] as const)(
    'applies damaged x damagedFactor, clogged x cloggedFactor, short_circuit x 0 (%s)',
    (status, factor) => {
      const before = base(one('mine', status), { mine: 'min' })
      const after = applyProduction(before, config, duration)
      for (const [r, n] of Object.entries(def('mine').outputs!.min)) {
        expectNear(gained(before, after, r), n * factor)
      }
    },
  )

  // T030 — R4: the condition also scales a converter's inputs
  it('a clogged converter uses less input, not the same input for less output', () => {
    const refinery = def('iron_refinery')
    const [input, perSeasonIn] = Object.entries(refinery.inputs!.min)[0]
    const [output, perSeasonOut] = Object.entries(refinery.outputs!.min)[0]
    const before = withStock(base(one('iron_refinery', 'clogged'), { iron_refinery: 'min' }), {
      [input]: perSeasonIn * 10,
      [output]: 0,
    })
    const after = applyProduction(before, config, duration)
    expectNear(-gained(before, after, input), perSeasonIn * damage.cloggedFactor)
    expectNear(gained(before, after, output), perSeasonOut * damage.cloggedFactor)
  })

  // T031 — FR-009
  it('ignores structures that are still being built', () => {
    const before = withStock(
      base(
        [
          { type: 'mine', tile: [0, 0], status: 'building' },
          { type: 'iron_refinery', tile: [4, 0], status: 'building' },
        ],
        { mine: 'max', iron_refinery: 'max' },
      ),
      { hematite: 1000, iron: 0 },
    )
    const after = applyProduction(before, config, duration)
    for (const r of ['hematite', 'regolith', 'iron']) expect(gained(before, after, r)).toBe(0)
  })

  // T032 — FR-010, constitution II.8
  it('living astronauts consume oxygen, water and food per season', () => {
    const full = { oxygen: 1000, water: 1000, food: 1000 }
    const before = withStock(base([]), full)
    const living = before.crew.filter((a) => a.alive).length
    const after = run(before, duration)
    for (const [r, n] of Object.entries(needs)) expectNear(-gained(before, after, r), n * living)

    // A dead astronaut consumes nothing.
    const oneDead = withCrew(before, [{ alive: false }])
    const afterDead = run(oneDead, duration)
    for (const [r, n] of Object.entries(needs)) {
      expectNear(-gained(oneDead, afterDead, r), n * (living - 1))
    }

    // Reserves never go below zero.
    const empty = withStock(base([]), { oxygen: 0, water: 0, food: 0 })
    const afterEmpty = applyProduction(empty, config, duration)
    for (const r of Object.keys(needs)) expect(afterEmpty.stock[r]).toBe(0)
  })

  // T033 — R4, edge case "several converters need the same input"
  it('converters that share an input are served in reverse brownout order', () => {
    const types = ['repair_workshop', 'steel_factory']
    const [first, second] = [...types].sort(
      (a, b) => brownoutOrder.indexOf(b) - brownoutOrder.indexOf(a),
    )
    const needFirst = def(first).inputs!.min.iron / duration
    const before = withStock(
      base(
        [
          { type: second, tile: [0, 0] },
          { type: first, tile: [4, 0] },
        ],
        { [first]: 'min', [second]: 'min' },
      ),
      { iron: needFirst, repair_parts: 0, steel: 0 },
    )

    const after = applyProduction(before, config, 1)
    for (const [r, n] of Object.entries(def(first).outputs!.min)) {
      expect(gained(before, after, r)).toBeCloseTo(n / duration, 9)
    }
    for (const r of Object.keys(def(second).outputs!.min)) {
      expect(gained(before, after, r)).toBe(0)
    }
    expect(after.stock.iron).toBe(0)
  })

  // Bug seen on screen: oxygen made = oxygen breathed, but the HUD showed 7 instead of 8
  // because 8 + x - x drifted to 7.99999999999995 over many frame-sized steps.
  it('a stock where production equals consumption stays on its whole number', () => {
    const made = def('oxygen_generator').outputs!.min.oxygen
    const before = withStock(base(one('oxygen_generator'), { oxygen_generator: 'min' }), {
      oxygen: 8,
    })
    const living = before.crew.filter((a) => a.alive).length
    const balanced = {
      ...config,
      mission: { ...config.mission, needs: { ...needs, oxygen: made / living } },
    }
    let s = before
    // Uneven steps, like real frames at different speeds.
    for (let i = 0; i < 3000; i++) s = applyProduction(s, balanced, 0.01 + (i % 7) * 0.037)
    expect(s.stock.oxygen).toBe(8)
  })
})
