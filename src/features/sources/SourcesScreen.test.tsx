// @vitest-environment jsdom
// US4 (Dev A), T021: the sources screen, with the real store.
// Contract: specs/002-events-data/contracts/debrief-sources.md.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { DataSource } from '../../config/schema'
import type { LogEntry } from '../../engine/types'
import { useLang } from '../../ui-kit/i18n'
import { SourcesScreen } from './SourcesScreen'

/** A real record of src/data/snapshots/2024-05.json. */
const DONKI_URL = 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1'
const DONKI_ID = '30609'
const EVENT_NAME = /NASA DONKI solar event \(archived\)/
const donkiSource = config.mission.radiationStorm.source

/** Player-facing names of the four classifications (English). */
const KIND_TEXT: Record<DataSource['kind'], string> = {
  real: 'real value',
  scaled: 'real value, scaled to game time',
  simplification: 'game simplification',
  game_value: 'game value',
}

const allSources: DataSource[] = [
  config.seasons.source,
  donkiSource,
  ...config.structures.flatMap((s) => (s.source ? [s.source] : [])),
  ...config.upgrades.flatMap((u) => (u.source ? [u.source] : [])),
  ...config.events.map((e) => e.source),
]

function storm(ref: string): LogEntry {
  const season = config.seasons.seasons[0].id
  return { at: 30, cycle: 2, season, kind: 'radiation_storm', ref, cause: 'radiation_storm' }
}
function withLog(log: LogEntry[]) {
  act(() => {
    const g = useGameStore.getState().game!
    useGameStore.setState({ game: { ...g, log }, screen: 'sources' })
  })
}
function rowOf(url: string): HTMLElement {
  const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === url)
  expect(link, `link to ${url}`).toBeDefined()
  return link!.closest('li')!
}

describe('SourcesScreen', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  describe('config sources (scenario 3)', () => {
    it('links every source URL exactly once', () => {
      render(<SourcesScreen />)
      const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
      for (const url of new Set(allSources.map((s) => s.url)))
        expect(
          hrefs.filter((h) => h === url),
          url,
        ).toHaveLength(1)
    })

    it('labels each source with its classification in plain English', () => {
      render(<SourcesScreen />)
      for (const s of allSources) expect(rowOf(s.url).textContent).toContain(KIND_TEXT[s.kind])
    })

    it('keeps the back button to the title screen', async () => {
      render(<SourcesScreen />)
      await userEvent.click(screen.getByRole('button', { name: 'Back' }))
      expect(useGameStore.getState().screen).toBe('title')
    })
  })

  describe('archived DONKI data (scenario 4)', () => {
    it('without a mission, marks the DONKI source as an archived snapshot', () => {
      act(() => useGameStore.setState({ game: null, screen: 'sources' }))
      render(<SourcesScreen />)
      expect(rowOf(donkiSource.url).textContent).toMatch(/archived snapshot/)
      expect(screen.queryByRole('link', { name: EVENT_NAME })).toBeNull()
    })

    it('names the DONKI event cited in the mission, with its link and id', () => {
      withLog([storm(DONKI_URL)])
      render(<SourcesScreen />)
      const link = screen.getByRole('link', { name: EVENT_NAME })
      expect(link.getAttribute('href')).toBe(DONKI_URL)
      expect(link.textContent).toContain(DONKI_ID)
    })

    it('shows an event cited by two storms only once', () => {
      withLog([storm(DONKI_URL), storm(DONKI_URL)])
      render(<SourcesScreen />)
      expect(screen.getAllByRole('link', { name: EVENT_NAME })).toHaveLength(1)
    })

    it('never turns a storm without a DONKI event into a citation', () => {
      withLog([storm('radiation_storm')])
      render(<SourcesScreen />)
      expect(rowOf(donkiSource.url).textContent).toMatch(/archived snapshot/)
      expect(screen.queryByRole('link', { name: EVENT_NAME })).toBeNull()
      expect(document.querySelector('a[href="radiation_storm"]')).toBeNull()
    })

    it('never presents NASA data as live or current', () => {
      withLog([storm(DONKI_URL)])
      render(<SourcesScreen />)
      expect(screen.getAllByText(/archived/).length).toBeGreaterThan(0)
      expect(screen.queryByText(/\blive\b|real-time|today/i)).toBeNull()
    })
  })
})
