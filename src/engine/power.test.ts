import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { batteryCapacity, computePower, demandAtSwitches, structurePower } from './power'
import { gameAt, onlyStructures, withEvents, withStructures, type StructureSpec } from './testState'
import type { GameState, PowerMode, SeasonId, StructureDef } from './types'

// US3 (Breno) — constitution II.7, research R5–R7

const seasons = config.seasons.seasons.map((s) => s.id)
const order = config.mission.brownoutOrder
const restoreShare = config.mission.batteryRestoreShare

function defOf(id: string): StructureDef {
  const def = config.structures.find((d) => d.id === id)
  if (!def) throw new Error(`no structure ${id}`)
  return def
}

function defByKind(kind: StructureDef['power']['kind']): StructureDef {
  const def = config.structures.find((d) => d.power.kind === kind)
  if (!def) throw new Error(`no structure with power kind ${kind}`)
  return def
}

const panel = defByKind('solar')
const reactor = defByKind('constant')
const bank = defByKind('storage')
const habitat = defOf('habitat')

function solarKw(season: SeasonId): number {
  if (panel.power.kind !== 'solar') throw new Error('not solar')
  return panel.power.kwBySeason[season]
}

function reactorKw(): number {
  if (reactor.power.kind !== 'constant') throw new Error('not constant')
  return reactor.power.kw
}

function bankEu(): number {
  if (bank.power.kind !== 'storage') throw new Error('not storage')
  return bank.power.capacityEu
}

function consumer(def: StructureDef) {
  if (def.power.kind !== 'consumer') throw new Error(`${def.id} is not a consumer`)
  return def.power
}

function heating(def: StructureDef, cycle: number, season: SeasonId, insulated = false): number {
  const table = insulated ? def.insulatedHeatingKw : def.heatingKw
  if (!table) throw new Error(`${def.id} has no heating table`)
  return table[String(cycle) as '1' | '2' | '3' | '4'][season]
}

/** Base draw of a type in cycle 1 spring, no insulation. */
function baseDraw(id: string, cycle = 1, season: SeasonId = 'spring'): number {
  const def = defOf(id)
  return def.heatingKw ? heating(def, cycle, season) : consumer(def).minKw
}

/** One structure per spec, each on its own 2-tile-wide spot so tiles never overlap. */
function base(cycle: number, season: SeasonId, types: (string | Omit<StructureSpec, 'tile'>)[]) {
  const specs = types.map((t, i): StructureSpec => {
    const spec = typeof t === 'string' ? { type: t } : t
    return { ...spec, tile: [(i % 6) * 2, Math.floor(i / 6) * 2] }
  })
  return onlyStructures(gameAt(config, cycle, season), config, specs)
}

function withModes(state: GameState, modes: Record<string, PowerMode>): GameState {
  return { ...state, powerModes: { ...state.powerModes, ...modes } }
}

/** Adds solar panels and one event so the panels produce exactly `kw` (not in winter darkness). */
function withProduction(state: GameState, kw: number): GameState {
  const perPanel = solarKw(state.time.season)
  const panels = Math.ceil(kw / perPanel) + 1
  const extra = Array.from({ length: panels }, (_, i): StructureSpec => ({
    type: panel.id,
    tile: [i % 12, 11 - Math.floor(i / 12)],
  }))
  const withPanels = withStructures(state, config, extra)
  return withEvents(withPanels, [{ kind: 'dust_storm', solarFactor: kw / (panels * perPanel) }])
}

const powerLogs = (s: GameState) => s.log.filter((e) => e.kind === 'power_shed')

describe('computePower', () => {
  it('solar panels produce kwBySeason x the active events solarFactor', () => {
    for (const season of seasons) {
      const two = base(1, season, [panel.id, panel.id])
      expect(computePower(two, config, 1).power.productionKw).toBeCloseTo(2 * solarKw(season))
    }
    const stormy = withEvents(base(1, 'summer', [panel.id]), [
      { kind: 'dust_storm', solarFactor: 0.6 },
      { kind: 'dust_devil', solarFactor: 0.5 },
    ])
    expect(computePower(stormy, config, 1).power.productionKw).toBeCloseTo(
      solarKw('summer') * 0.6 * 0.5,
    )
  })

  it('solar panels produce 0 in winter from seasons.winterDarknessFromCycle', () => {
    const dark = base(config.seasons.winterDarknessFromCycle, 'winter', [panel.id])
    expect(computePower(dark, config, 1).power.productionKw).toBe(0)
    const firstWinter = base(1, 'winter', [panel.id])
    expect(computePower(firstWinter, config, 1).power.productionKw).toBeCloseTo(solarKw('winter'))
  })

  it('a damaged panel produces x damagedFactor', () => {
    const s = base(1, 'spring', [{ type: panel.id, status: 'damaged' }])
    expect(computePower(s, config, 1).power.productionKw).toBeCloseTo(
      solarKw('spring') * config.mission.damage.damagedFactor,
    )
  })

  it('the reactor produces its constant kW in every season and event', () => {
    for (const season of seasons) {
      const s = withEvents(base(3, season, [reactor.id]), [
        { kind: 'darkness', solarFactor: 0 },
        { kind: 'global_dust_storm', solarFactor: 0.2 },
      ])
      expect(computePower(s, config, 1).power.productionKw).toBeCloseTo(reactorKw())
    }
  })

  it('consumers draw 0 (off), minKw (min) or maxKw (max)', () => {
    const plain = config.structures.filter(
      (d) => d.switchable && d.power.kind === 'consumer' && !d.heatingKw,
    )
    expect(plain.length).toBeGreaterThan(0)
    for (const def of plain) {
      const s = base(1, 'spring', [def.id])
      const { minKw, maxKw } = consumer(def)
      expect(demandAtSwitches(withModes(s, { [def.id]: 'off' }), config)).toBe(0)
      expect(demandAtSwitches(withModes(s, { [def.id]: 'min' }), config)).toBeCloseTo(minKw)
      expect(demandAtSwitches(withModes(s, { [def.id]: 'max' }), config)).toBeCloseTo(maxKw)
    }
  })

  it('structures under construction and short-circuited structures draw nothing', () => {
    const mine = defOf('mine')
    const idle = base(1, 'spring', [
      { type: mine.id, status: 'building' },
      { type: mine.id, status: 'short_circuit' },
    ])
    expect(demandAtSwitches(idle, config)).toBe(0)
    const dirty = base(1, 'spring', [
      { type: mine.id, status: 'clogged' },
      { type: mine.id, status: 'damaged' },
    ])
    expect(demandAtSwitches(dirty, config)).toBeCloseTo(2 * consumer(mine).minKw)
  })

  it('heatingKw by cycle and season replaces minKw; max adds maxKw - minKw', () => {
    const heated = config.structures.filter((d) => d.heatingKw)
    expect(heated.map((d) => d.id)).toEqual(
      expect.arrayContaining([habitat.id, 'greenhouse', 'ice_melter']),
    )
    for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
      for (const season of seasons) {
        for (const def of heated) {
          const s = base(cycle, season, [def.id])
          const table = heating(def, cycle, season)
          const { minKw, maxKw } = consumer(def)
          expect(demandAtSwitches(withModes(s, { [def.id]: 'min' }), config)).toBeCloseTo(table)
          const atMax = demandAtSwitches(withModes(s, { [def.id]: 'max' }), config)
          // The habitat has no switch: it always draws its Base heating.
          expect(atMax).toBeCloseTo(def.switchable ? table + maxKw - minKw : table)
        }
      }
    }
  })

  it('an insulated habitat uses insulatedHeatingKw', () => {
    const insulation = config.upgrades.find((u) => u.effect === 'insulation')
    const other = config.upgrades.find((u) => u.effect !== 'insulation')
    if (!insulation || !other) throw new Error('missing upgrades')
    const insulable = config.structures.filter((d) => d.insulatedHeatingKw)
    expect(insulable.map((d) => d.id)).toContain(habitat.id)
    for (const def of insulable) {
      for (const season of seasons) {
        const warm = base(3, season, [{ type: def.id, upgrades: [insulation.id] }])
        expect(demandAtSwitches(warm, config)).toBeCloseTo(heating(def, 3, season, true))
        const notWarm = base(3, season, [{ type: def.id, upgrades: [other.id] }])
        expect(demandAtSwitches(notWarm, config)).toBeCloseTo(heating(def, 3, season))
      }
    }
  })

  it('surplus charges batteries up to their capacity; deficit drains them', () => {
    const cap = bankEu()
    const charging = base(1, 'spring', [reactor.id, bank.id])
    expect(batteryCapacity(charging, config)).toBe(cap)
    expect(computePower(charging, config, 1).batteryEu).toBeCloseTo(reactorKw())
    expect(computePower(charging, config, 2).batteryEu).toBeCloseTo(2 * reactorKw())
    expect(computePower({ ...charging, batteryEu: cap - 1 }, config, 1).batteryEu).toBe(cap)

    const two = base(1, 'spring', [reactor.id, bank.id, bank.id])
    expect(batteryCapacity(two, config)).toBe(2 * cap)
    expect(computePower({ ...two, batteryEu: cap }, config, 1).batteryEu).toBeCloseTo(
      cap + reactorKw(),
    )

    const halfBuilt = base(1, 'spring', [
      reactor.id,
      bank.id,
      { type: bank.id, status: 'building' },
    ])
    expect(batteryCapacity(halfBuilt, config)).toBe(cap)
    expect(computePower({ ...halfBuilt, batteryEu: cap }, config, 1).batteryEu).toBe(cap)

    const draw = baseDraw('mine')
    const draining = { ...base(1, 'spring', ['mine', bank.id]), batteryEu: 10 * draw }
    const after = computePower(draining, config, 1)
    expect(after.batteryEu).toBeCloseTo(9 * draw)
    expect(after.power.balanceKw).toBeCloseTo(-draw)
    expect(after.power.shed).toEqual([])
    expect(computePower({ ...draining, batteryEu: draw / 2 }, config, 1).batteryEu).toBe(0)
  })

  it('with batteries empty, sheds types in mission.brownoutOrder until demand fits', () => {
    const all = base(1, 'spring', [habitat.id, ...order])
    const total = demandAtSwitches(all, config)
    const [first, second] = order
    const s = withProduction(all, total - baseDraw(first) - baseDraw(second) / 2)
    const after = computePower(s, config, 1)
    expect(after.power.shed).toEqual([first, second])
    expect(after.power.demandKw).toBeCloseTo(total - baseDraw(first) - baseDraw(second))
    expect(after.power.productionKw).toBeGreaterThanOrEqual(after.power.demandKw)
    expect(after.power.unheated).toBe(false)
    expect(after.batteryEu).toBe(0)
  })

  it('never sheds habitats and flags unheated when even their heating cannot be met', () => {
    const cold = base(1, 'winter', [habitat.id, ...order])
    const habitatHeat = heating(habitat, 1, 'winter')
    const after = computePower(withProduction(cold, habitatHeat / 2), config, 1)
    expect(after.power.shed).not.toContain(habitat.id)
    expect(after.power.shed).toEqual(expect.arrayContaining(order))
    expect(after.power.demandKw).toBeCloseTo(habitatHeat)
    expect(after.power.unheated).toBe(true)

    const warm = computePower(withProduction(cold, habitatHeat), config, 1)
    expect(warm.power.unheated).toBe(false)
  })

  it('a shed type comes back when production alone covers it', () => {
    const s = base(1, 'spring', [habitat.id, 'mine', bank.id])
    const both = demandAtSwitches(s, config)
    // Some charge, but below the restore share: only production can bring the mine back.
    const low = (bankEu() * restoreShare) / 2
    const shedMine = { ...s, batteryEu: low, power: { ...s.power, shed: ['mine'] } }

    const covered = computePower(withProduction(shedMine, both), config, 1)
    expect(covered.power.shed).toEqual([])

    const short = computePower(withProduction(shedMine, both - baseDraw('mine') / 2), config, 1)
    expect(short.power.shed).toEqual(['mine'])
  })

  // Issue #45: a less vital type that fits comes back even when a more vital one does not.
  describe('a less vital type that fits comes back (issue #45)', () => {
    const [lessVital, moreVital] = ['mine', 'ice_melter']
    const s = base(1, 'spring', [habitat.id, lessVital, moreVital])
    const total = demandAtSwitches(s, config)
    // Production misses exactly the more vital type's draw: the less vital one still fits.
    const short = (state: GameState) => withProduction(state, total - baseDraw(moreVital))

    it('the setup: less vital first in the brownout order and drawing less', () => {
      expect(order.indexOf(lessVital)).toBeLessThan(order.indexOf(moreVital))
      expect(baseDraw(lessVital)).toBeLessThan(baseDraw(moreVital))
    })

    it('restoring skips a type that does not fit and tries the next one', () => {
      const bothShed = { ...s, power: { ...s.power, shed: [lessVital, moreVital] } }
      const after = computePower(short(bothShed), config, 1)
      expect(after.power.shed).toEqual([moreVital])
      expect(after.power.productionKw).toBeGreaterThanOrEqual(after.power.demandKw)
    })

    it('shedding in brownout order brings back a type the later shed made room for', () => {
      const after = computePower(short(s), config, 1)
      expect(after.power.shed).toEqual([moreVital])
      expect(after.power.demandKw).toBeCloseTo(total - baseDraw(moreVital))
      expect(powerLogs(after).at(-1)).toMatchObject({ kind: 'power_shed' })

      // Stable: the next step changes nothing and logs nothing.
      const again = computePower(after, config, 1)
      expect(again.power.shed).toEqual([moreVital])
      expect(powerLogs(again)).toHaveLength(powerLogs(after).length)
    })
  })

  it('every shed type comes back when the batteries are full', () => {
    const s = base(1, 'spring', [habitat.id, ...order, bank.id])
    const full = { ...s, batteryEu: bankEu(), power: { ...s.power, shed: [...order] } }
    const after = computePower(full, config, 1)
    expect(after.power.shed).toEqual([])
    expect(after.power.demandKw).toBeCloseTo(demandAtSwitches(s, config))
    expect(after.batteryEu).toBeLessThan(bankEu())
  })

  // Playtest 2026-11-15: waiting for full batteries kept the machines off for more than a season.
  describe('batteries bring shed types back at batteryRestoreShare', () => {
    const s = base(1, 'spring', [habitat.id, ...order, bank.id])
    const shedAll = (batteryEu: number) => ({
      ...s,
      batteryEu,
      power: { ...s.power, shed: [...order] },
    })

    it('the setup: the restore share is a part of the capacity, not all of it', () => {
      expect(restoreShare).toBeGreaterThan(0)
      expect(restoreShare).toBeLessThan(1)
    })

    it('every shed type comes back once the batteries hold the restore share', () => {
      const after = computePower(shedAll(bankEu() * restoreShare), config, 1)
      expect(after.power.shed).toEqual([])
      expect(after.power.demandKw).toBeCloseTo(demandAtSwitches(s, config))
    })

    it('just below the restore share the shed types stay off and the batteries keep charging', () => {
      const below = bankEu() * restoreShare - 1
      const after = computePower(
        withProduction(shedAll(below), baseDraw(habitat.id) + 1),
        config,
        1,
      )
      expect(after.power.shed).toEqual(expect.arrayContaining(order))
      expect(after.batteryEu).toBeGreaterThan(below)
    })

    it('the share counts every finished battery bank', () => {
      const two = withStructures(s, config, [{ type: bank.id, tile: [10, 10] }])
      const half = {
        ...two,
        batteryEu: bankEu() * restoreShare,
        power: { ...two.power, shed: [...order] },
      }
      expect(computePower(half, config, 1).power.shed).toEqual(expect.arrayContaining(order))
      const enough = { ...half, batteryEu: 2 * bankEu() * restoreShare }
      expect(computePower(enough, config, 1).power.shed).toEqual([])
    })
  })

  it('a step with batteries above empty does not shed', () => {
    const s = { ...base(1, 'spring', [habitat.id, ...order, bank.id]), batteryEu: 1000 }
    const after = computePower(s, config, 1)
    expect(after.power.shed).toEqual([])
    expect(after.power.unheated).toBe(false)
    expect(after.batteryEu).toBeCloseTo(1000 - demandAtSwitches(s, config))
  })

  it('logs power_shed only when the shed set changes', () => {
    const s = base(1, 'spring', [habitat.id, 'mine'])
    const short = withProduction(s, baseDraw(habitat.id))
    const before = powerLogs(short).length

    const shed = computePower(short, config, 1)
    expect(shed.power.shed).toEqual(['mine'])
    expect(powerLogs(shed)).toHaveLength(before + 1)
    expect(powerLogs(shed)[before]).toMatchObject({
      kind: 'power_shed',
      cycle: 1,
      season: 'spring',
      at: short.time.elapsed,
    })

    const again = computePower(shed, config, 1)
    expect(powerLogs(again)).toHaveLength(before + 1)

    const enough = withProduction(
      { ...s, power: again.power, log: again.log },
      demandAtSwitches(s, config),
    )
    const restored = computePower(enough, config, 1)
    expect(restored.power.shed).toEqual([])
    expect(powerLogs(restored)).toHaveLength(before + 2)
  })
})

// Playtest 2026-11-15: the panel of a machine showed the season's table value, not what it really
// makes or draws right now (a solar panel "made 4 kW" in the dark winter).
describe('structurePower', () => {
  it('a solar panel makes nothing in the dark winter and its season value otherwise', () => {
    const dark = base(config.seasons.winterDarknessFromCycle, 'winter', [panel.id])
    expect(structurePower(dark, config, dark.structures[0])).toEqual({ makesKw: 0, usesKw: 0 })
    const spring = base(1, 'spring', [panel.id])
    expect(structurePower(spring, config, spring.structures[0]).makesKw).toBeCloseTo(
      solarKw('spring'),
    )
  })

  it('a consumer uses what its switch asks for, and nothing while the brownout has it off', () => {
    const consumer = config.structures.find((d) => d.switchable && !d.heatingKw)!
    if (consumer.power.kind !== 'consumer') throw new Error('not a consumer')
    const s = base(1, 'spring', [consumer.id])
    const [machine] = s.structures
    expect(structurePower(s, config, machine)).toEqual({ makesKw: 0, usesKw: consumer.power.minKw })
    const off = { ...s, power: { ...s.power, shed: [consumer.id] } }
    expect(structurePower(off, config, machine).usesKw).toBe(0)
  })
})
