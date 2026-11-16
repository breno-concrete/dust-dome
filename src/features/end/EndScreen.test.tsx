// @vitest-environment jsdom
// US4 (Dev A), T020: the end screen and its debrief, with the real store.
// Contract: specs/002-events-data/contracts/debrief-sources.md. Texts come from the config.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { LOSS_CAUSES, type SeasonId } from '../../config/schema'
import type { GameState, LogEntry, StructureInstance } from '../../engine/types'
import { useLang } from '../../ui-kit/i18n'
import { EndScreen } from './EndScreen'

/** A real record of src/data/snapshots/2024-05.json. */
const DONKI_URL = 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1'
const DONKI_ID = '30609'

const SEASONS = config.seasons.seasons
const FIRST = SEASONS[0]
const SECOND = SEASONS[1]
const { causes, targetsNotMet } = config.narrator.debrief
const dustDevil = config.events.find((r) => r.kind === 'dust_devil')!
const solar = config.structures.find((s) => s.power.kind === 'solar')!

function seasonStart(cycle: number, season: SeasonId, at = 0): LogEntry {
  return { at, cycle, season, kind: 'season_start', ref: season }
}
function death(cause: string, ref = 'a1', cycle = 1, season: SeasonId = FIRST.id): LogEntry {
  return { at: 10, cycle, season, kind: 'death', ref, cause }
}
function storm(ref: string, cycle = 1, season: SeasonId = FIRST.id): LogEntry {
  return { at: 30, cycle, season, kind: 'radiation_storm', ref, cause: 'radiation_storm' }
}
function panel(id: string): StructureInstance {
  return { id, type: solar.id, tile: [0, 0], status: 'damaged', upgrades: [] }
}

/** Ends the mission of the real store with the given final state. */
function endWith(partial: Partial<GameState>) {
  act(() => {
    const g = useGameStore.getState().game!
    useGameStore.setState({ game: { ...g, status: 'lost', ...partial }, screen: 'end' })
  })
}

function section(cycle: number, seasonName: string) {
  return screen.getByRole('region', { name: new RegExp(`Cycle ${cycle}\\b.*${seasonName}`) })
}

describe('EndScreen', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  describe('mission result', () => {
    it('shows nothing when there is no game', () => {
      act(() => useGameStore.setState({ game: null }))
      const { container } = render(<EndScreen />)
      expect(container.innerHTML).toBe('')
    })

    it("a won mission opens with the commander's victory text", () => {
      endWith({ status: 'won', lostReason: null, log: [seasonStart(1, FIRST.id)] })
      render(<EndScreen />)
      expect(screen.getByText(config.narrator.victory.en)).toBeDefined()
    })

    it('a mission lost on targets explains it in plain words, never with the raw key', () => {
      endWith({ lostReason: 'targets_missed', log: [seasonStart(1, FIRST.id)] })
      render(<EndScreen />)
      expect(screen.getByText(targetsNotMet.en)).toBeDefined()
      expect(screen.queryByText(/targets_missed/)).toBeNull()
    })

    it('a mission lost with the crew explains the deaths from the log, never the raw key', () => {
      endWith({ lostReason: 'crew_lost', log: [seasonStart(1, FIRST.id), death('empty_oxygen')] })
      render(<EndScreen />)
      expect(screen.getByText(causes.empty_oxygen.en)).toBeDefined()
      expect(screen.queryByText(/crew_lost/)).toBeNull()
    })

    it('an unknown lost reason never shows as a raw key', () => {
      endWith({ lostReason: 'some_new_reason', log: [seasonStart(1, FIRST.id)] })
      render(<EndScreen />)
      expect(screen.getByRole('region', { name: /Cycle 1/ })).toBeDefined()
      expect(screen.queryByText(/some_new_reason/)).toBeNull()
    })
  })

  describe('debrief by cycle and season', () => {
    it('has one section per season reached, named by cycle and season, in order', () => {
      endWith({
        log: [
          seasonStart(1, FIRST.id),
          seasonStart(1, SECOND.id, 100),
          seasonStart(2, FIRST.id, 200),
        ],
      })
      render(<EndScreen />)
      expect(screen.getAllByRole('region')).toEqual([
        section(1, FIRST.name.en),
        section(1, SECOND.name.en),
        section(2, FIRST.name.en),
      ])
    })

    it('shows a death inside the section of its own cycle and season', () => {
      endWith({
        log: [
          seasonStart(1, FIRST.id),
          seasonStart(1, SECOND.id, 100),
          death('cold', 'a1', 1, SECOND.id),
        ],
      })
      render(<EndScreen />)
      expect(within(section(1, SECOND.name.en)).getByText(causes.cold.en)).toBeDefined()
      expect(within(section(1, FIRST.name.en)).queryByText(causes.cold.en)).toBeNull()
    })

    it('explains every recorded loss cause with its debrief text', () => {
      for (const cause of LOSS_CAUSES) {
        endWith({ log: [seasonStart(1, FIRST.id), death(cause)] })
        render(<EndScreen />)
        expect(screen.getByText(causes[cause].en)).toBeDefined()
        cleanup()
      }
    })

    it('counts deaths with the same cause in one line: "3 astronauts"', () => {
      endWith({
        log: [
          seasonStart(1, FIRST.id),
          death('radiation_storm', 'a1'),
          death('radiation_storm', 'a2'),
          death('radiation_storm', 'a3'),
        ],
      })
      render(<EndScreen />)
      expect(screen.getAllByText(/\b3 astronauts\b/)).toHaveLength(1)
    })

    it('uses the singular for a single death: "1 astronaut"', () => {
      endWith({ log: [seasonStart(1, FIRST.id), death('empty_water')] })
      render(<EndScreen />)
      expect(screen.getByText(/\b1 astronaut\b/)).toBeDefined()
      expect(screen.queryByText(/\b1 astronauts\b/)).toBeNull()
    })

    it('shows structure hits as "<type name> × <count>" with the rule explanation', () => {
      endWith({
        structures: [panel('s7'), panel('s8')],
        log: [
          seasonStart(1, FIRST.id),
          { at: 20, cycle: 1, season: FIRST.id, kind: 'damaged', ref: 's7', cause: dustDevil.id },
          { at: 21, cycle: 1, season: FIRST.id, kind: 'damaged', ref: 's8', cause: dustDevil.id },
        ],
      })
      render(<EndScreen />)
      const s = section(1, FIRST.name.en)
      expect(within(s).getByText(new RegExp(`${solar.name.en} × 2`))).toBeDefined()
      expect(within(s).getAllByText(dustDevil.explain.en).length).toBeGreaterThan(0)
    })

    it('names a structure that no longer exists "structure"', () => {
      endWith({
        structures: [],
        log: [
          seasonStart(1, FIRST.id),
          { at: 20, cycle: 1, season: FIRST.id, kind: 'damaged', ref: 's99', cause: dustDevil.id },
        ],
      })
      render(<EndScreen />)
      expect(screen.getByText(/structure × 1/i)).toBeDefined()
    })

    it('labels a hit whose rule is unknown as a game simplification, without crashing', () => {
      endWith({
        structures: [panel('s1')],
        log: [
          seasonStart(1, FIRST.id),
          { at: 20, cycle: 1, season: FIRST.id, kind: 'damaged', ref: 's1', cause: 'no_such_rule' },
        ],
      })
      render(<EndScreen />)
      expect(within(section(1, FIRST.name.en)).getByText(/game simplification/i)).toBeDefined()
    })

    it('never invents losses from the final state when the log has none', () => {
      const g = useGameStore.getState().game!
      endWith({
        crew: g.crew.map((a) => ({ ...a, alive: false })),
        structures: [panel('s1')],
        stock: Object.fromEntries(Object.keys(g.stock).map((k) => [k, 0])),
        log: [seasonStart(1, FIRST.id)],
      })
      render(<EndScreen />)
      expect(section(1, FIRST.name.en)).toBeDefined()
      expect(screen.queryByText(/astronaut/)).toBeNull()
      expect(screen.queryByText(/×/)).toBeNull()
    })

    it('keeps the losses of a mission that ended during a radiation storm', () => {
      endWith({
        radiationStorm: { phase: 'active', phaseEndsAt: 999, basedOn: null },
        log: [seasonStart(1, FIRST.id), storm(DONKI_URL), death('radiation_storm', 'a1')],
      })
      render(<EndScreen />)
      expect(screen.getByText(causes.radiation_storm.en)).toBeDefined()
      expect(screen.getByText(/\b1 astronaut\b/)).toBeDefined()
    })
  })

  describe('a debrief without losses (scenario 2)', () => {
    const cycle = 1
    const reached = SEASONS.slice(0, 2)
    const log = reached.map((s, i) => seasonStart(cycle, s.id, i * 100))
    const reachedRules = config.events.filter(
      (r) => r.cycles.includes(cycle) && reached.some((s) => s.id === r.season),
    )
    const reachedTexts = new Set(reachedRules.map((r) => r.explain.en))
    const unreached = config.events.filter(
      (r) => !r.cycles.includes(cycle) && !reachedTexts.has(r.explain.en),
    )

    it('describes the weather of each season reached, from the events.json rules', () => {
      expect(reachedRules.length).toBeGreaterThan(0)
      endWith({ status: 'won', lostReason: null, log })
      render(<EndScreen />)
      for (const rule of reachedRules)
        expect(screen.getAllByText(rule.explain.en).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/weather this season/i).length).toBeGreaterThan(0)
    })

    it('never describes seasons the mission did not reach, and shows no loss', () => {
      expect(unreached.length).toBeGreaterThan(0)
      endWith({ status: 'won', lostReason: null, log })
      render(<EndScreen />)
      expect(screen.getAllByRole('region')).toHaveLength(reached.length)
      for (const rule of unreached) expect(screen.queryByText(rule.explain.en)).toBeNull()
      expect(screen.queryByText(/astronaut/)).toBeNull()
    })
  })

  describe('radiation storm in the debrief', () => {
    it('cites the archived DONKI event with its link and id', () => {
      endWith({ log: [seasonStart(1, FIRST.id), storm(DONKI_URL)] })
      render(<EndScreen />)
      const link = screen.getByRole('link', { name: /NASA DONKI solar event \(archived\)/ })
      expect(link.getAttribute('href')).toBe(DONKI_URL)
      expect(link.textContent).toContain(DONKI_ID)
    })

    it('shows a storm without a DONKI event as an event, with no invented citation', () => {
      endWith({ log: [seasonStart(1, FIRST.id), storm('radiation_storm')] })
      render(<EndScreen />)
      const s = section(1, FIRST.name.en)
      expect(within(s).getByText(/radiation storm/i)).toBeDefined()
      expect(screen.queryByRole('link', { name: /DONKI/ })).toBeNull()
      expect(document.querySelector('a[href="radiation_storm"]')).toBeNull()
    })

    it('a storm without deaths is an event, not a loss', () => {
      endWith({
        status: 'won',
        lostReason: null,
        log: [seasonStart(1, FIRST.id), storm(DONKI_URL)],
      })
      render(<EndScreen />)
      expect(
        screen.getByRole('link', { name: /NASA DONKI solar event \(archived\)/ }),
      ).toBeDefined()
      expect(screen.queryByText(/astronaut/)).toBeNull()
    })

    it('never presents the archived event as live or current data', () => {
      endWith({ log: [seasonStart(1, FIRST.id), storm(DONKI_URL)] })
      render(<EndScreen />)
      expect(screen.getByText(/archived/)).toBeDefined()
      expect(screen.queryByText(/\blive\b|real-time|today/i)).toBeNull()
    })
  })

  describe("Commander Vega's advice (issue #63)", () => {
    it('a lost mission shows her tips for the next try, with at least one item', () => {
      endWith({ lostReason: 'crew_lost', log: [seasonStart(1, FIRST.id), death('cold')] })
      render(<EndScreen />)
      const advice = screen.getByRole('complementary', { name: 'Commander Vega' })
      expect(within(advice).getAllByRole('listitem').length).toBeGreaterThanOrEqual(1)
    })

    it('comes right after the commander banner, before the restart button and the debrief', () => {
      endWith({ lostReason: 'crew_lost', log: [seasonStart(1, FIRST.id), death('cold')] })
      render(<EndScreen />)
      const advice = screen.getByRole('complementary', { name: 'Commander Vega' })
      const restart = screen.getByRole('button', { name: 'Try another strategy' })
      expect(
        advice.compareDocumentPosition(restart) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })

    it('a won mission has no advice', () => {
      endWith({ status: 'won', lostReason: null, log: [seasonStart(1, FIRST.id)] })
      render(<EndScreen />)
      expect(screen.queryByRole('complementary', { name: 'Commander Vega' })).toBeNull()
    })

    it('speaks Portuguese when the language is switched', () => {
      useLang.setState({ lang: 'pt' })
      endWith({ lostReason: 'crew_lost', log: [seasonStart(1, FIRST.id), death('cold')] })
      render(<EndScreen />)
      expect(screen.getByRole('complementary', { name: 'Comandante Vega' })).toBeDefined()
    })
  })

  describe('language and restart', () => {
    it('shows the Portuguese debrief text when Portuguese is chosen', () => {
      useLang.setState({ lang: 'pt' })
      endWith({ log: [seasonStart(1, FIRST.id), death('cold')] })
      render(<EndScreen />)
      expect(screen.getByText(causes.cold.pt!)).toBeDefined()
    })

    it('restarts with one click: a new running mission, straight to the game', async () => {
      endWith({ lostReason: 'crew_lost', log: [seasonStart(1, FIRST.id), death('cold')] })
      const ended = useGameStore.getState().game
      render(<EndScreen />)
      await userEvent.click(screen.getByRole('button', { name: 'Try another strategy' }))
      const { screen: current, game } = useGameStore.getState()
      expect(current).toBe('game')
      expect(game).not.toBe(ended)
      expect(game!.status).toBe('running')
      expect(game!.log).toEqual([seasonStart(1, FIRST.id)])
    })
  })
})
