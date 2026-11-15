// Owner: Dev A. Pure helpers for the sources screen (constitution II, II.13).
// Rules: specs/002-events-data/contracts/debrief-sources.md.
// TODO(Dev A, US4 T025): skeleton only; the tests in sources.test.ts describe the behavior.
import type { DataSource, GameConfig } from '../../config/schema'

/** One line of the sources screen: a URL shown once, with every label and classification. */
export interface SourceRow {
  url: string
  labels: string[]
  kinds: DataSource['kind'][]
}

/** Every DataSource in the config (seasons, radiation storm, structures, upgrades, events). */
export function configSources(_config: GameConfig): DataSource[] {
  return []
}

/** Groups sources by URL, in order of first appearance, without repeating labels or kinds. */
export function groupSources(_sources: readonly DataSource[]): SourceRow[] {
  return []
}
