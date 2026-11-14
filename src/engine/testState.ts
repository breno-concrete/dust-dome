// Owner: Breno. Test-only builders for hand-made mission states (research R19).
// Import only from *.test.ts files. Every builder returns a new state.
import { createGame } from './game'
import type {
  ActiveEvent,
  Astronaut,
  GameConfig,
  GameState,
  Job,
  JobKind,
  SeasonId,
  Stock,
  StructureInstance,
  StructureStatus,
  StructureTypeId,
  Tile,
  UpgradeId,
} from './types'

export interface StructureSpec {
  type: StructureTypeId
  tile: Tile
  status?: StructureStatus
  upgrades?: UpgradeId[]
}

/** A running mission at a given cycle, season and time into the season, briefing closed. */
export function gameAt(
  config: GameConfig,
  cycle: number,
  season: SeasonId,
  secondsIntoSeason = 0,
): GameState {
  const seasons = config.seasons.seasons
  const cycleSeconds = seasons.reduce((sum, s) => sum + s.durationSeconds, 0)
  const before = seasons.slice(
    0,
    seasons.findIndex((s) => s.id === season),
  )
  const elapsed =
    (cycle - 1) * cycleSeconds +
    before.reduce((sum, s) => sum + s.durationSeconds, 0) +
    secondsIntoSeason
  return {
    ...createGame(config, 1),
    briefing: null,
    time: { cycle, season, secondsIntoSeason, elapsed },
  }
}

/** Adds structures (active and without upgrades unless the spec says otherwise). */
export function withStructures(
  state: GameState,
  _config: GameConfig,
  specs: StructureSpec[],
): GameState {
  let nextId = state.nextId
  const added: StructureInstance[] = specs.map((spec) => ({
    id: `s${nextId++}`,
    type: spec.type,
    tile: spec.tile,
    status: spec.status ?? 'active',
    upgrades: spec.upgrades ?? [],
  }))
  return { ...state, structures: [...state.structures, ...added], nextId }
}

/** Replaces the starting base with these structures. */
export function onlyStructures(
  state: GameState,
  config: GameConfig,
  specs: StructureSpec[],
): GameState {
  return withStructures({ ...state, structures: [] }, config, specs)
}

export function withStock(state: GameState, stock: Partial<Stock>): GameState {
  return { ...state, stock: { ...state.stock, ...stock } as Stock }
}

/** Adds active events; only the kind is required, the rest has neutral defaults. */
export function withEvents(
  state: GameState,
  events: (Partial<ActiveEvent> & Pick<ActiveEvent, 'kind'>)[],
): GameState {
  const added: ActiveEvent[] = events.map((e, i) => ({
    id: `test-event-${state.activeEvents.length + i}`,
    ruleId: 'test',
    endsAt: null,
    solarFactor: 1,
    blocksExternalJobs: false,
    ...e,
  }))
  return { ...state, activeEvents: [...state.activeEvents, ...added] }
}

export interface JobSpec {
  kind: JobKind
  structureId: string
  upgradeId?: UpgradeId
  status?: Job['status']
  /** The astronaut doing an active job; they are put outside with this job. */
  astronautId?: string | null
  /** Defaults to the configured time of the job (the structure's build time for a build). */
  remainingSeconds?: number
}

function configuredSeconds(state: GameState, config: GameConfig, spec: JobSpec): number {
  const { jobs } = config.mission
  switch (spec.kind) {
    case 'build': {
      const type = state.structures.find((s) => s.id === spec.structureId)?.type
      const def = config.structures.find((d) => d.id === type)
      if (!def) throw new Error(`no structure ${spec.structureId}`)
      return def.buildSeconds
    }
    case 'upgrade':
      return jobs.upgradeSeconds
    case 'repair':
      return jobs.repairSeconds
    case 'clean':
      return jobs.cleanSeconds
    case 'demolish':
      return jobs.demolishSeconds
  }
}

/** Adds jobs at the end of the queue (queued unless the spec says otherwise). */
export function withJobs(state: GameState, config: GameConfig, specs: JobSpec[]): GameState {
  let nextId = state.nextId
  let crew = state.crew
  const added: Job[] = specs.map((spec) => {
    const job: Job = {
      id: `j${nextId++}`,
      kind: spec.kind,
      structureId: spec.structureId,
      ...(spec.upgradeId ? { upgradeId: spec.upgradeId } : {}),
      astronautId: spec.astronautId ?? null,
      remainingSeconds: spec.remainingSeconds ?? configuredSeconds(state, config, spec),
      status: spec.status ?? 'queued',
    }
    if (job.astronautId) {
      crew = crew.map((a) =>
        a.id === job.astronautId ? { ...a, location: 'outside', jobId: job.id } : a,
      )
    }
    return job
  })
  return { ...state, crew, jobs: [...state.jobs, ...added], nextId }
}

/** Patches astronauts by index in crew order. */
export function withCrew(state: GameState, patches: Partial<Astronaut>[]): GameState {
  return {
    ...state,
    crew: state.crew.map((a, i) => (patches[i] ? { ...a, ...patches[i] } : a)),
  }
}
