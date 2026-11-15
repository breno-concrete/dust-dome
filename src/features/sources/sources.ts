// Owner: Dev A. Pure helpers for the sources screen (constitution II, II.13).
// Rules: specs/002-events-data/contracts/debrief-sources.md.
import type { DataSource, GameConfig } from '../../config/schema'

/** One line of the sources screen: a URL shown once, with every label and classification. */
export interface SourceRow {
  url: string
  labels: string[]
  kinds: DataSource['kind'][]
}

/** Every DataSource in the config (seasons, radiation storm, structures, upgrades, events). */
export function configSources(config: GameConfig): DataSource[] {
  return [
    config.seasons.source,
    config.mission.radiationStorm.source,
    ...config.structures.flatMap((s) => (s.source ? [s.source] : [])),
    ...config.upgrades.flatMap((u) => (u.source ? [u.source] : [])),
    ...config.events.map((e) => e.source),
  ]
}

/** Groups sources by URL, in order of first appearance, without repeating labels or kinds. */
export function groupSources(sources: readonly DataSource[]): SourceRow[] {
  const rows = new Map<string, SourceRow>()
  for (const s of sources) {
    let row = rows.get(s.url)
    if (!row) {
      row = { url: s.url, labels: [], kinds: [] }
      rows.set(s.url, row)
    }
    if (!row.labels.includes(s.label)) row.labels.push(s.label)
    if (!row.kinds.includes(s.kind)) row.kinds.push(s.kind)
  }
  return [...rows.values()]
}
