import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { dismissBriefing } from './actions'
import { createGame } from './game'

// US4 (Breno) — constitution II.6, II.9, II.10
describe('build', () => {
  it.todo('rejects with not_enough_resources when the stock does not cover the cost')
  it.todo('rejects with the placementError of the tile (out_of_bounds, tile_blocked)')
  it.todo('rejects with external_jobs_blocked during winter darkness')
  it.todo('deducts the cost, adds the structure as "building" and queues a build job')
})

describe('installUpgrade', () => {
  it.todo('only allows upgrades listed in the structure definition')
  it.todo('deducts the cost and queues an upgrade job')
})

describe('setPowerMode', () => {
  it.todo('changes the mode of a switchable type')
  it.todo('rejects with not_allowed for habitats, panels, batteries and the reactor')
})

describe('startRepair', () => {
  it.todo('rejects without enough repair parts')
  it.todo('a failed QTE spends the parts and changes nothing else')
  it.todo('a successful QTE spends the parts and queues a repair job')
})

describe('clean', () => {
  it.todo('queues a clean job for a clogged structure')
  it.todo('rejects with not_allowed during an active dust storm')
})

// US5 (Breno)
describe('shelterAll', () => {
  it.todo('moves every astronaut outside into a habitat with a radiation shelter')
  it.todo('pauses active jobs, which resume after the storm')
})

describe('dismissBriefing', () => {
  it('clears the briefing so the clock runs again', () => {
    const r = dismissBriefing(createGame(config, 1))
    expect(r.ok && r.state.briefing).toBeNull()
  })
})
