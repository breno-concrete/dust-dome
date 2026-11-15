// Owner: Dev A. Pure helpers for the end-of-mission debrief (constitution II.12, VII).
// Everything comes from GameState.log and the config: nothing is inferred from the final stock
// or the final structure list. Rules: specs/002-events-data/contracts/debrief-sources.md.
import {
  LOSS_CAUSES,
  type EventRule,
  type GameConfig,
  type LocalizedText,
  type LossCause,
  type SeasonId,
} from '../../config/schema'
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

const HIT_KINDS: ReadonlySet<string> = new Set<StructureHitStatus>([
  'damaged',
  'clogged',
  'short_circuit',
])

function isLossCause(cause: string): cause is LossCause {
  return (LOSS_CAUSES as readonly string[]).includes(cause)
}

/** The DONKI citation in a radiation_storm ref, or null when the ref is not an https link. */
export function donkiCitation(ref: string): DonkiCitation | null {
  let url: URL
  try {
    url = new URL(ref)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  // DONKI links end in ".../<id>/-1": the id is the last all-digit segment of the path.
  const segments = url.pathname.split('/').filter(Boolean)
  const id = [...segments].reverse().find((s) => /^\d+$/.test(s)) ?? segments.at(-1) ?? ''
  return { url: ref, id }
}

/**
 * The grouping key of a log entry inside its section, or null when it is not shown
 * (built, repaired, power_shed...). Structure hits group by type, not by structure id.
 */
function lineKey(entry: LogEntry, structureType: string | null): string | null {
  const cause = entry.cause ?? ''
  if (entry.kind === 'death') return JSON.stringify(['death', cause])
  if (HIT_KINDS.has(entry.kind)) return JSON.stringify(['hit', entry.kind, cause, structureType])
  if (entry.kind === 'radiation_storm') return JSON.stringify(['storm', entry.ref])
  return null
}

function newLine(entry: LogEntry, structureType: string | null, config: GameConfig): DebriefLine {
  const cause = entry.cause ?? ''
  if (entry.kind === 'death')
    return {
      kind: 'death',
      cause,
      count: 0,
      explain: isLossCause(cause) ? config.narrator.debrief.causes[cause] : null,
    }
  if (entry.kind === 'radiation_storm')
    return { kind: 'radiation_storm', citation: donkiCitation(entry.ref) }
  return {
    kind: 'structure',
    status: entry.kind as StructureHitStatus,
    ruleId: cause,
    structureType,
    count: 0,
    rule: config.events.find((r) => r.id === cause) ?? null,
  }
}

/** One section per season reached (season_start), in mission order. */
export function buildDebrief(
  log: readonly LogEntry[],
  structures: readonly StructureInstance[],
  config: GameConfig,
): DebriefSection[] {
  const sections: DebriefSection[] = []
  const bySeason = new Map<string, { section: DebriefSection; lines: Map<string, DebriefLine> }>()

  for (const entry of log) {
    const seasonKey = `${entry.cycle}:${entry.season}`
    if (entry.kind === 'season_start') {
      if (bySeason.has(seasonKey)) continue
      const section: DebriefSection = {
        cycle: entry.cycle,
        season: entry.season,
        lines: [],
        weather: config.events.filter(
          (r) => r.cycles.includes(entry.cycle) && r.season === entry.season,
        ),
      }
      sections.push(section)
      bySeason.set(seasonKey, { section, lines: new Map() })
      continue
    }

    // Entries of a season the log never started are not shown (no section to hold them).
    const target = bySeason.get(seasonKey)
    if (!target) continue
    const structureType = HIT_KINDS.has(entry.kind)
      ? (structures.find((s) => s.id === entry.ref)?.type ?? null)
      : null
    const key = lineKey(entry, structureType)
    if (key === null) continue

    let line = target.lines.get(key)
    if (!line) {
      line = newLine(entry, structureType, config)
      target.lines.set(key, line)
      target.section.lines.push(line)
    }
    if (line.kind !== 'radiation_storm') line.count += 1
  }
  return sections
}

/** Crew deaths counted in the debrief (SC-005). Events are never losses. */
export function lossCount(sections: readonly DebriefSection[]): number {
  return sections
    .flatMap((s) => s.lines)
    .reduce((sum, l) => sum + (l.kind === 'death' ? l.count : 0), 0)
}
