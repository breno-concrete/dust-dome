import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { winTargets } from './game'
import { checkOutcome } from './outcome'
import { gameAt, withCrew, withStock, withStructures, type StructureSpec } from './testState'
import type { GameState } from './types'

// US5 (Breno) — constitution II.2

const seasons = config.seasons.seasons
const winter = seasons[seasons.length - 1]
const targets = winTargets(config)
const habitatDef = config.structures.find((d) => d.id === 'habitat')!

/** Extra habitats so that, with the starting one, capacity reaches the target. */
function extraHabitats(status: StructureSpec['status'] = 'active'): StructureSpec[] {
  const needed = Math.ceil(targets.habitatCapacity / (habitatDef.capacity ?? 1)) - 1
  return Array.from({ length: needed }, (_, i) => ({
    type: 'habitat',
    tile: [i * 2, 10] as const,
    status,
  }))
}

/** The moment winter of the last cycle ends, with every win target met. */
function readyAtTheEnd(): GameState {
  const end = gameAt(config, config.seasons.cycles, winter.id, winter.durationSeconds)
  return withStock(withStructures(end, config, extraHabitats()), targets.reserves)
}

describe('checkOutcome', () => {
  it('lost when every astronaut is dead', () => {
    const s = withCrew(gameAt(config, 2, 'summer', 30), [
      { alive: false },
      { alive: false },
      { alive: false },
      { alive: false },
    ])
    expect(checkOutcome(s, config)).toMatchObject({ status: 'lost', lostReason: 'crew_lost' })
  })

  it('keeps running while someone is alive and the mission time is not over', () => {
    const s = withCrew(gameAt(config, 2, 'summer', 30), [{ alive: false }])
    expect(checkOutcome(s, config)).toBe(s)
  })

  it('won when the last winter ends with the reserve and habitat capacity targets met', () => {
    const s = withCrew(readyAtTheEnd(), [{ alive: false }, { alive: false }, { alive: false }])
    expect(checkOutcome(s, config)).toMatchObject({ status: 'won', lostReason: null })
  })

  it('power is not a target: a base in deficit at that moment still wins', () => {
    const ready = readyAtTheEnd()
    const s: GameState = {
      ...ready,
      batteryEu: 0,
      power: { productionKw: 0, demandKw: 40, balanceKw: -40, shed: ['mine'], unheated: false },
    }
    expect(checkOutcome(s, config).status).toBe('won')
  })

  it('lost with reason "targets_missed" when the last winter ends without the targets', () => {
    const ready = readyAtTheEnd()
    for (const res of ['oxygen', 'water', 'food'] as const) {
      const short = withStock(ready, { [res]: targets.reserves[res] - 1 })
      expect(checkOutcome(short, config)).toMatchObject({
        status: 'lost',
        lostReason: 'targets_missed',
      })
    }

    const end = gameAt(config, config.seasons.cycles, winter.id, winter.durationSeconds)
    const fewHabitats = withStock(end, targets.reserves)
    expect(checkOutcome(fewHabitats, config).lostReason).toBe('targets_missed')

    // A habitat under construction houses nobody yet.
    const unfinished = withStock(
      withStructures(end, config, extraHabitats('building')),
      targets.reserves,
    )
    expect(checkOutcome(unfinished, config).lostReason).toBe('targets_missed')
  })

  it('a crew that died out at the end is lost for that reason, not for the targets', () => {
    const s = withCrew(readyAtTheEnd(), [
      { alive: false },
      { alive: false },
      { alive: false },
      { alive: false },
    ])
    expect(checkOutcome(s, config).lostReason).toBe('crew_lost')
  })
})
