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
  it.todo('rejects with not_connected a habitat that shares no side with an existing habitat')
})

describe('installUpgrade', () => {
  it.todo('only allows upgrades listed in the structure definition')
  it.todo('deducts the cost and queues an upgrade job')
  it.todo(
    'rejects with not_allowed an upgrade already installed or queued, or a structure still building',
  )
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

// US5 (Breno) — constitution II.9, II.11
describe('bringInside', () => {
  it.todo(
    'brings one astronaut inside at once; their job goes back to the queue with its remaining time',
  )
  it.todo('a recalled astronaut rests (takes no job) until their exposure is back to 0')
  it.todo('during a radiation storm, goes into a sheltered habitat with room')
  it.todo('rejects with not_allowed for an unknown, dead or already-inside astronaut')
})

describe('bringAllInside', () => {
  it.todo('moves every astronaut outside into a habitat with a radiation shelter')
  it.todo('pauses active jobs, which resume after the storm')
  it.todo('brings every astronaut outside inside at once')
  it.todo('rejects with not_allowed when nobody is outside')
})

describe('any action', () => {
  it.todo('is refused with not_allowed after the mission ended')
})

// US4 (Breno) — constitution II.6 Demolition
describe('demolish', () => {
  it.todo('queues a demolish job that takes demolishSeconds with one astronaut outside')
  it.todo('rejects with external_jobs_blocked during winter darkness')
  it.todo('rejects with last_habitat for the last habitat module')
  it.todo('rejects with no_room_for_crew when the occupants do not fit in the other habitats')
  it.todo('rejects with not_connected when another habitat would lose its shared side')
  it.todo('cancels a structure under construction, with the same refund')
})

describe('dismissBriefing', () => {
  it('clears the briefing so the clock runs again', () => {
    const r = dismissBriefing(createGame(config, 1))
    expect(r.ok && r.state.briefing).toBeNull()
  })
})
