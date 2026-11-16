import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { createGame } from '../engine/game'
import { gameAt, withEvents, withStructures } from '../engine/testState'
import {
  batteryCapacityEu,
  outdoorJobsBlocked,
  radiationShelterPlaces,
  structurePowerKw,
} from './selectors'

// Playtest 2026-11-15: the HUD shows the battery charge and the alarm says who is safe.

const bank = config.structures.find((d) => d.power.kind === 'storage')!
const habitat = config.structures.find((d) => d.id === 'habitat')!
const shelter = config.upgrades.find((u) => u.effect === 'radiation_shelter')!

describe('batteryCapacityEu', () => {
  it('is 0 without a game or without battery banks', () => {
    expect(batteryCapacityEu({ game: null })).toBe(0)
    expect(batteryCapacityEu({ game: createGame(config, 1) })).toBe(0)
  })

  it('adds up the finished battery banks only', () => {
    if (bank.power.kind !== 'storage') throw new Error('not storage')
    const game = withStructures(createGame(config, 1), config, [
      { type: bank.id, tile: [10, 10] },
      { type: bank.id, tile: [11, 10] },
      { type: bank.id, tile: [10, 11], status: 'building' },
    ])
    expect(batteryCapacityEu({ game })).toBe(2 * bank.power.capacityEu)
  })
})

describe('radiationShelterPlaces', () => {
  it('is 0 when no habitat has a radiation shelter', () => {
    expect(radiationShelterPlaces({ game: null })).toBe(0)
    expect(radiationShelterPlaces({ game: createGame(config, 1) })).toBe(0)
  })

  it('counts the places of finished habitats with the shelter', () => {
    const game = withStructures(createGame(config, 1), config, [
      { type: 'habitat', tile: [5, 7], upgrades: [shelter.id] },
      { type: 'habitat', tile: [7, 7], status: 'building', upgrades: [shelter.id] },
    ])
    expect(radiationShelterPlaces({ game })).toBe(habitat.capacity)
  })
})

// Playtest 2026-11-15: the build menu let the player pick a structure in the dark winter, and
// the machine panel showed power numbers the engine was not using.
describe('outdoorJobsBlocked', () => {
  it('is true only while an event keeps the astronauts inside', () => {
    const game = gameAt(config, 1, 'spring')
    expect(outdoorJobsBlocked({ game: null })).toBe(false)
    expect(outdoorJobsBlocked({ game })).toBe(false)
    const dark = withEvents(game, [{ kind: 'darkness', blocksExternalJobs: true }])
    expect(outdoorJobsBlocked({ game: dark })).toBe(true)
  })
})

describe('structurePowerKw', () => {
  it('gives what a structure makes and uses right now, and null for an unknown one', () => {
    const game = gameAt(config, config.seasons.winterDarknessFromCycle, 'winter')
    const solar = game.structures.find((s) => s.type === 'solar_panel')!
    expect(structurePowerKw({ game }, solar.id)).toEqual({ makesKw: 0, usesKw: 0 })
    const habitatNow = structurePowerKw(
      { game },
      game.structures.find((s) => s.type === 'habitat')!.id,
    )
    expect(habitatNow!.usesKw).toBeGreaterThan(0)
    expect(structurePowerKw({ game }, 'no-such-structure')).toBeNull()
    expect(structurePowerKw({ game: null }, solar.id)).toBeNull()
  })
})
