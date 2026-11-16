// CONTRACT FILE. Owner: Breno (backup: Dev A).
// Everyone codes against these types from minute one. To change them: announce in
// the group, open a shared/ PR that ONLY touches contract files, merge fast,
// everybody rebases. See CONTRIBUTING.md.
import type { SeasonId } from '../config/schema'

export type {
  DataSource,
  EventRule,
  GameConfig,
  LocalizedText,
  MissionConfig,
  ResourceDef,
  SeasonDef,
  SeasonId,
  StructureDef,
  UpgradeDef,
} from '../config/schema'

export type ResourceId = string
export type StructureTypeId = string
export type UpgradeId = string
export type Tile = readonly [x: number, y: number]
export type Stock = Record<ResourceId, number>

export type PowerMode = 'off' | 'min' | 'max'

export type StructureStatus =
  | 'building' // waiting for / under construction
  | 'active'
  | 'damaged' // dust devil: output x damagedFactor until repaired
  | 'clogged' // dust: output x cloggedFactor until cleaned
  | 'short_circuit' // global storm: output 0 until repaired

export interface StructureInstance {
  id: string
  type: StructureTypeId
  /** Top-left tile; the structure covers size x size tiles. */
  tile: Tile
  status: StructureStatus
  upgrades: UpgradeId[]
}

export interface Astronaut {
  id: string
  name: string
  alive: boolean
  location: 'inside' | 'outside'
  /** Habitat the astronaut lives in. */
  habitatId: string | null
  /**
   * 0..1. At mission.exposure.warnAt the astronaut stops working and comes back inside; a new job
   * starts only at or below resumeAt. Never lethal (constitution 3.0.0, II.9).
   */
  exposure: number
  jobId: string | null
  /** Brought inside by the player: takes no job until exposure is back to 0. */
  resting: boolean
}

/** demolish: removes the structure (or cancels its construction) and refunds what was paid. */
export type JobKind = 'build' | 'upgrade' | 'repair' | 'clean' | 'demolish'

export interface Job {
  id: string
  kind: JobKind
  /** Structure instance the job acts on. */
  structureId: string
  upgradeId?: UpgradeId
  astronautId: string | null
  remainingSeconds: number
  /**
   * queued: waits for a free astronaut. active: an astronaut is on it. paused: blocked by an
   * event (winter, dust storm), resumes by itself. held: the player brought its astronaut
   * inside; nobody takes it until resumeJobs (constitution II.9).
   */
  status: 'queued' | 'active' | 'paused' | 'held'
}

/** An event occurrence that is currently affecting the base (Dev A writes these). */
export interface ActiveEvent {
  id: string
  ruleId: string
  kind: 'dust_devil' | 'dust_storm' | 'global_dust_storm' | 'cold' | 'darkness'
  /** Game time (state.time.elapsed) when it stops; null = until the season ends. */
  endsAt: number | null
  solarFactor: number
  blocksExternalJobs: boolean
}

export interface RadiationStorm {
  phase: 'warning' | 'active'
  /** Game time when the current phase ends. */
  phaseEndsAt: number
  /** Real DONKI event the alert is modeled on. */
  basedOn: { date: string; url: string } | null
}

export interface PowerReport {
  productionKw: number
  demandKw: number
  /** production - demand; negative = drawing from batteries. */
  balanceKw: number
  /** Structure types switched off by the brownout this tick. */
  shed: StructureTypeId[]
  /** True when not even the habitats can be heated. */
  unheated: boolean
}

export type LogKind =
  | 'season_start'
  | 'built'
  | 'upgrade_installed'
  | 'damaged'
  | 'clogged'
  | 'short_circuit'
  | 'repaired'
  | 'cleaned'
  | 'demolished'
  | 'death'
  | 'exposure_return' // an astronaut reached exposure.warnAt and came back inside (ref: astronaut)
  | 'radiation_storm'
  | 'power_shed'

export interface LogEntry {
  at: number
  cycle: number
  season: SeasonId
  kind: LogKind
  /** Structure, astronaut or event id the entry is about. */
  ref: string
  /** Cause key for the debrief texts: "radiation_storm", "cold", "empty_oxygen", "empty_water", "empty_food". */
  cause?: string
}

export interface GameTime {
  cycle: number
  season: SeasonId
  secondsIntoSeason: number
  /** Total game seconds since the start (speed-independent). */
  elapsed: number
}

export interface GameState {
  seed: number
  /** Internal state of the seeded generator (see rng.ts). */
  rng: number
  time: GameTime
  stock: Stock
  batteryEu: number
  structures: StructureInstance[]
  powerModes: Record<StructureTypeId, PowerMode>
  power: PowerReport
  crew: Astronaut[]
  jobs: Job[]
  activeEvents: ActiveEvent[]
  /** Next game time each event rule fires (Dev A). */
  nextEventAt: Record<string, number>
  radiationStorm: RadiationStorm | null
  /** Season briefing waiting to be dismissed; the store pauses while it is set. */
  briefing: { cycle: number; season: SeasonId } | null
  /** Seconds each death condition has been true (empty reserves, no heat). */
  dangerTimers: Record<string, number>
  log: LogEntry[]
  status: 'running' | 'won' | 'lost'
  lostReason: string | null
  nextId: number
}

/** Every player action returns this: never throws for an invalid action. */
export type ActionResult =
  { ok: true; state: GameState } | { ok: false; reason: ActionError; state: GameState }

export type ActionError =
  | 'not_enough_resources'
  | 'tile_blocked'
  | 'out_of_bounds'
  | 'not_connected' // a habitat module must share a side with another (build and demolish)
  | 'last_habitat' // the last habitat module cannot be demolished
  | 'no_room_for_crew' // demolishing this habitat leaves its occupants without room
  | 'external_jobs_blocked'
  | 'repair_failed' // the repair game was lost: the parts are gone (set by the store)
  | 'not_allowed'
  | 'not_implemented'

export interface WinTargets {
  people: number
  reserves: Record<'oxygen' | 'water' | 'food', number>
  habitatCapacity: number
}
