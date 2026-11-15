// Owner: Dev A. Pure helpers for the end-of-mission debrief (constitution II.12, VII).
// Everything comes from GameState.log and the config: nothing is inferred from the final stock
// or the final structure list. Rules: specs/002-events-data/contracts/debrief-sources.md.
// TODO(Dev A, US4 T023): skeleton only; the tests in debrief.test.ts describe the behavior.
import type { EventRule, GameConfig, LocalizedText, SeasonId } from '../../config/schema'
import type { LogEntry, StructureInstance } from '../../engine/types'

/** An archived NASA DONKI event cited by a radiation storm. */
export interface DonkiCitation {
  url: string
  /** Event id taken from the end of the URL, e.g. "30609" in .../SEP/30609/-1. */
  id: string
}

export type StructureHitStatus = 'damaged' | 'clogged' | 'short_circuit'

/** Something that really happened, read from the log. */
export type DebriefLine =
  | {
      kind: 'death'
      cause: string
      /** Deaths with this cause in this cycle and season. */
      count: number
      /** narrator.debrief.causes[cause]; null for an unknown cause. */
      explain: LocalizedText | null
    }
  | {
      kind: 'structure'
      status: StructureHitStatus
      ruleId: string
      /** Structure type id from game.structures; null when the structure no longer exists. */
      structureType: string | null
      count: number
      /** The events.json rule named by LogEntry.cause; null when no rule matches. */
      rule: EventRule | null
    }
  | {
      /** An event, never a loss. */
      kind: 'radiation_storm'
      citation: DonkiCitation | null
    }

export interface DebriefSection {
  cycle: number
  season: SeasonId
  /** What happened, from the log. */
  lines: DebriefLine[]
  /** What this season brings (events.json rules for this cycle and season), not what happened. */
  weather: EventRule[]
}

/** The DONKI citation in a radiation_storm ref, or null when the ref is not an https link. */
export function donkiCitation(_ref: string): DonkiCitation | null {
  return null
}

/** One section per season reached (season_start), in mission order. */
export function buildDebrief(
  _log: readonly LogEntry[],
  _structures: readonly StructureInstance[],
  _config: GameConfig,
): DebriefSection[] {
  return []
}

/** Crew deaths counted in the debrief (SC-005). Events are never losses. */
export function lossCount(_sections: readonly DebriefSection[]): number {
  return 0
}
