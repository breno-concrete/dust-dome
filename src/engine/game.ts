// Owner: Breno. Entry points of the engine. Pure functions only:
// (state, config, input) -> new state. No React, no fetch, no Math.random, no timers.
import { updateEvents } from './events/events'
import { updateCrew } from './crew'
import { applyProduction } from './economy'
import { updateJobs } from './jobs'
import { checkOutcome } from './outcome'
import { computePower } from './power'
import { seedToRng } from './rng'
import { advanceTime, isMissionTimeOver } from './time'
import type { Astronaut, GameConfig, GameState, StructureInstance, WinTargets } from './types'

const CREW_NAMES = ['Ari', 'Bia', 'Caio', 'Lia', 'Noa', 'Rui']

export function createGame(config: GameConfig, seed: number): GameState {
  let nextId = 1
  const id = (prefix: string) => `${prefix}${nextId++}`

  const structures: StructureInstance[] = config.mission.startingStructures.map((s) => ({
    id: id('s'),
    type: s.type,
    tile: s.tile,
    status: 'active',
    upgrades: [],
  }))
  const firstSeason = config.seasons.seasons[0].id
  const firstHabitat = structures.find((s) => s.type === 'habitat')?.id ?? null

  const crew: Astronaut[] = Array.from({ length: config.mission.crew }, (_, i) => ({
    id: id('a'),
    name: CREW_NAMES[i % CREW_NAMES.length],
    alive: true,
    location: 'inside',
    habitatId: firstHabitat,
    exposure: 0,
    jobId: null,
    resting: false,
  }))

  return {
    seed,
    rng: seedToRng(seed),
    time: { cycle: 1, season: config.seasons.seasons[0].id, secondsIntoSeason: 0, elapsed: 0 },
    stock: Object.fromEntries(config.resources.map((r) => [r.id, r.start])),
    batteryEu: 0,
    structures,
    powerModes: Object.fromEntries(
      config.structures.filter((s) => s.switchable).map((s) => [s.id, 'min' as const]),
    ),
    power: { productionKw: 0, demandKw: 0, balanceKw: 0, shed: [], unheated: false },
    crew,
    jobs: [],
    activeEvents: [],
    nextEventAt: {},
    radiationStorm: null,
    briefing: { cycle: 1, season: firstSeason },
    dangerTimers: {},
    log: [{ at: 0, cycle: 1, season: firstSeason, kind: 'season_start', ref: firstSeason }],
    status: 'running',
    lostReason: null,
    nextId,
  }
}

/**
 * Advances the simulation by dt game seconds. Order is part of the contract:
 * time -> events (Dev A) -> power -> production -> jobs -> crew -> outcome.
 */
export function tick(state: GameState, config: GameConfig, dt: number): GameState {
  if (state.status !== 'running' || state.briefing || isMissionTimeOver(state, config)) {
    return state
  }
  let s = advanceTime(state, config, dt)
  s = updateEvents(s, config, dt)
  s = computePower(s, config)
  s = applyProduction(s, config, dt)
  s = updateJobs(s, config, dt)
  s = updateCrew(s, config, dt)
  s = checkOutcome(s, config)
  return s
}

export function winTargets(config: GameConfig): WinTargets {
  const people = config.mission.colonists + config.mission.crew
  const { needs } = config.mission
  return {
    people,
    reserves: {
      oxygen: needs.oxygen * people,
      water: needs.water * people,
      food: needs.food * people,
    },
    habitatCapacity: people,
  }
}
