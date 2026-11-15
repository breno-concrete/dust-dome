// US4 (Dev A), T021: pure helpers of the sources screen.
// Contract: specs/002-events-data/contracts/debrief-sources.md. The bad cases are synthetic.
import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import type { DataSource } from '../../config/schema'
import { configSources, groupSources } from './sources'

/** Every DataSource written in the config, wherever it is. */
function expectedSources(): DataSource[] {
  return [
    config.seasons.source,
    config.mission.radiationStorm.source,
    ...config.structures.flatMap((s) => (s.source ? [s.source] : [])),
    ...config.upgrades.flatMap((u) => (u.source ? [u.source] : [])),
    ...config.events.map((e) => e.source),
  ]
}

const A = 'https://example.org/a' // synthetic
const B = 'https://example.org/b' // synthetic

describe('configSources', () => {
  it('collects every source of the config (seasons, radiation, structures, upgrades, events)', () => {
    const got = configSources(config)
    expect(got).toHaveLength(expectedSources().length)
    expect(new Set(got.map((s) => s.url))).toEqual(new Set(expectedSources().map((s) => s.url)))
  })
})

describe('groupSources', () => {
  it('shows each URL once, with every classification it has, in order', () => {
    const rows = groupSources([
      { label: 'Mars facts', url: A, kind: 'real' },
      { label: 'Mars facts', url: A, kind: 'simplification' },
    ])
    expect(rows).toEqual([{ url: A, labels: ['Mars facts'], kinds: ['real', 'simplification'] }])
  })

  it('does not repeat a label or a classification', () => {
    const rows = groupSources([
      { label: 'One', url: A, kind: 'scaled' },
      { label: 'Two', url: A, kind: 'scaled' },
      { label: 'One', url: A, kind: 'scaled' },
    ])
    expect(rows).toEqual([{ url: A, labels: ['One', 'Two'], kinds: ['scaled'] }])
  })

  it('keeps the order of first appearance', () => {
    const rows = groupSources([
      { label: 'b', url: B, kind: 'game_value' },
      { label: 'a', url: A, kind: 'real' },
      { label: 'b', url: B, kind: 'real' },
    ])
    expect(rows.map((r) => r.url)).toEqual([B, A])
    expect(rows[0].kinds).toEqual(['game_value', 'real'])
  })

  it('returns an empty list for no sources', () => {
    expect(groupSources([])).toEqual([])
  })

  it('does not mutate the list it reads', () => {
    const list = Object.freeze([Object.freeze({ label: 'a', url: A, kind: 'real' as const })])
    expect(() => groupSources(list)).not.toThrow()
    expect(groupSources(list)).toHaveLength(1)
  })

  it('gives the real config one row per distinct URL', () => {
    const urls = expectedSources().map((s) => s.url)
    const rows = groupSources(configSources(config))
    expect(rows.map((r) => r.url)).toEqual([...new Set(urls)])
  })
})
