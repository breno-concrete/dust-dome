// Game-design rules from the constitution, enforced by CI.
// If a PO edits a JSON and breaks one of these, the PR goes red.
import { describe, expect, it } from 'vitest'
import { createGame } from '../engine/game'
import { placementError } from '../engine/placement'
import { config } from './loadConfig'
import { LOSS_CAUSES, SEASONS } from './schema'

const resourceIds = new Set(config.resources.map((r) => r.id))
const structureIds = new Set(config.structures.map((s) => s.id))
const upgradeIds = new Set(config.upgrades.map((u) => u.id))

function unique(ids: string[]) {
  expect(new Set(ids).size, `duplicate ids: ${ids.join(', ')}`).toBe(ids.length)
}

describe('config rules', () => {
  it('has exactly three vital reserves: oxygen, water, food (principle I)', () => {
    const vital = config.resources.filter((r) => r.kind === 'vital').map((r) => r.id)
    expect(vital.sort()).toEqual(['food', 'oxygen', 'water'])
  })

  it('has unique ids everywhere', () => {
    unique(config.resources.map((r) => r.id))
    unique(config.structures.map((s) => s.id))
    unique(config.upgrades.map((u) => u.id))
    unique(config.events.map((e) => e.id))
  })

  it('only references resources that exist', () => {
    const amounts = [
      ...config.structures.flatMap((s) => [
        s.cost,
        s.inputs?.min,
        s.inputs?.max,
        s.outputs?.min,
        s.outputs?.max,
      ]),
      ...config.upgrades.map((u) => u.cost),
    ].filter(Boolean) as Record<string, number>[]
    for (const a of amounts) {
      for (const id of Object.keys(a))
        expect(resourceIds.has(id), `unknown resource "${id}"`).toBe(true)
    }
  })

  it('has no free choice: every structure and upgrade costs something', () => {
    for (const s of [...config.structures, ...config.upgrades]) {
      const total = Object.values(s.cost).reduce((a, b) => a + b, 0)
      expect(total, `"${s.id}" is free`).toBeGreaterThan(0)
    }
  })

  it('every consumer draws power, and max draws more than min', () => {
    for (const s of config.structures) {
      if (s.power.kind !== 'consumer') continue
      expect(s.power.minKw, `"${s.id}" minKw`).toBeGreaterThan(0)
      expect(s.power.maxKw, `"${s.id}" maxKw`).toBeGreaterThan(s.power.minKw)
    }
  })

  it('structures only list upgrades that exist', () => {
    for (const s of config.structures) {
      for (const u of s.upgrades) expect(upgradeIds.has(u), `"${s.id}" -> "${u}"`).toBe(true)
    }
  })

  it('every structure takes time to build (II.6)', () => {
    for (const s of config.structures)
      expect(s.buildSeconds, `"${s.id}" buildSeconds`).toBeGreaterThan(0)
  })

  it('connectsTo only lists structure types that exist (principle V)', () => {
    for (const s of config.structures) {
      for (const t of s.connectsTo) expect(structureIds.has(t), `"${s.id}" -> "${t}"`).toBe(true)
    }
  })

  it('a tired astronaut rests below the level that sent them inside (II.9)', () => {
    const { warnAt, resumeAt } = config.mission.exposure
    expect(resumeAt).toBeLessThan(warnAt)
  })

  it('season lengths follow the real sols (principle II)', () => {
    const { seasons } = config.seasons
    expect(seasons.map((s) => s.id)).toEqual([...SEASONS])
    const sols = seasons.reduce((a, s) => a + s.sols, 0)
    const total = seasons.reduce((a, s) => a + s.durationSeconds, 0)
    for (const s of seasons) {
      expect(Math.abs(s.durationSeconds - (s.sols / sols) * total), s.id).toBeLessThan(1.5)
    }
  })

  it('every season of every cycle has at least one event', () => {
    for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
      for (const season of SEASONS) {
        const found = config.events.some((e) => e.cycles.includes(cycle) && e.season === season)
        expect(found, `cycle ${cycle} ${season}`).toBe(true)
      }
    }
  })

  it('events only target structure types that exist, with valid intervals', () => {
    for (const e of config.events) {
      for (const id of [...(e.effects.clog ?? []), ...(e.effects.shortCircuit ?? [])]) {
        expect(structureIds.has(id), `"${e.id}" -> "${id}"`).toBe(true)
      }
      if (e.intervalSeconds) expect(e.intervalSeconds[0]).toBeLessThanOrEqual(e.intervalSeconds[1])
    }
  })

  it('the brownout order only lists switchable structure types', () => {
    const switchable = new Set(config.structures.filter((s) => s.switchable).map((s) => s.id))
    for (const id of config.mission.brownoutOrder) expect(switchable.has(id), id).toBe(true)
  })

  it('the starting base fits on the grid without overlaps', () => {
    let game = {
      ...createGame(config, 1),
      structures: [] as ReturnType<typeof createGame>['structures'],
    }
    for (const s of config.mission.startingStructures) {
      expect(structureIds.has(s.type), s.type).toBe(true)
      expect(placementError(game, config, s.type, s.tile), `${s.type} at ${s.tile}`).toBeNull()
      game = {
        ...game,
        structures: [
          ...game.structures,
          { id: s.type + s.tile, type: s.type, tile: s.tile, status: 'active', upgrades: [] },
        ],
      }
    }
  })
})

// Commander Vega's texts (narrator.json) — constitution II.12 and VII.
describe('narrator texts', () => {
  const { narrator } = config

  it('has a briefing for every season of every cycle (II.12)', () => {
    for (let cycle = 1; cycle <= config.seasons.cycles; cycle++) {
      for (const season of SEASONS) {
        expect(
          narrator.briefings[String(cycle)]?.[season]?.text.en,
          `cycle ${cycle} ${season}`,
        ).toBeTruthy()
      }
    }
  })

  it('warns about the cold inside the spring briefing of the cycle that needs insulation (II.12)', () => {
    const cycle = String(config.mission.insulationRequiredFromCycle)
    expect(narrator.briefings[cycle]?.spring.warning?.en).toBeTruthy()
  })

  it('explains every way to lose an astronaut, when it happens and in the debrief (VII)', () => {
    for (const cause of LOSS_CAUSES) {
      expect(narrator.lossMessages[cause].en, cause).toBeTruthy()
      expect(narrator.debrief.causes[cause].en, cause).toBeTruthy()
    }
  })

  it('says why an astronaut comes back inside at the exposure warning (VII, II.9)', () => {
    expect(narrator.exposureWarning.en).toBeTruthy()
  })

  it('has a victory text, a "targets not met" text and tutorial steps with unique ids', () => {
    expect(narrator.victory.en).toBeTruthy()
    expect(narrator.debrief.targetsNotMet.en).toBeTruthy()
    expect(narrator.tutorial.length).toBeGreaterThan(0)
    unique(narrator.tutorial.map((s) => s.id))
  })
})
