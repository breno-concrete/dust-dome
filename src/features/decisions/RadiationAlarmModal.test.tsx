// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { useLang } from '../../ui-kit/i18n'
import { RadiationAlarmModal } from './RadiationAlarmModal'

const DONKI_URL = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/'

function setStorm(storm: ReturnType<typeof makeStorm> | null, elapsed = 100) {
  act(() => {
    const g = useGameStore.getState().game!
    useGameStore.setState({
      game: { ...g, time: { ...g.time, elapsed }, radiationStorm: storm, briefing: null },
    })
  })
}
function makeStorm(phase: 'warning' | 'active', phaseEndsAt: number) {
  return { phase, phaseEndsAt, basedOn: { date: '2024-05-10', url: DONKI_URL } }
}

describe('RadiationAlarmModal', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  const original = useGameStore.getState().bringAllInside
  afterEach(() => {
    cleanup()
    act(() => useGameStore.setState({ bringAllInside: original }))
  })

  it('stays hidden when there is no storm', () => {
    setStorm(null)
    render(<RadiationAlarmModal />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('counts down the seconds left of the warning (10 s)', () => {
    setStorm(makeStorm('warning', 110), 100)
    render(<RadiationAlarmModal />)
    expect(screen.getByTestId('storm-countdown').textContent).toContain('10')

    setStorm(makeStorm('warning', 110), 104.2)
    expect(screen.getByTestId('storm-countdown').textContent).toContain('6')
  })

  it('never shows a negative countdown', () => {
    setStorm(makeStorm('warning', 110), 125)
    render(<RadiationAlarmModal />)
    expect(screen.getByTestId('storm-countdown').textContent).not.toContain('-')
  })

  it('names the real NASA DONKI event and links to it', () => {
    setStorm(makeStorm('warning', 110))
    render(<RadiationAlarmModal />)
    const link = screen.getByRole('link', { name: /DONKI/ })
    expect(link.getAttribute('href')).toBe(DONKI_URL)
    expect(screen.getByText(/2024-05-10/)).toBeDefined()
  })

  it('still shows when the event has no DONKI reference, without a link', () => {
    act(() => setStorm({ phase: 'warning', phaseEndsAt: 110, basedOn: null } as never))
    render(<RadiationAlarmModal />)
    expect(screen.getByRole('button', { name: 'Take shelter' })).toBeDefined()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('sends the whole crew to shelter with one click', async () => {
    const bringAllInside = vi.fn()
    act(() => useGameStore.setState({ bringAllInside }))
    setStorm(makeStorm('warning', 110))
    render(<RadiationAlarmModal />)
    await userEvent.click(screen.getByRole('button', { name: 'Take shelter' }))
    expect(bringAllInside).toHaveBeenCalledTimes(1)
  })

  it('announces the emergency to screen readers', () => {
    setStorm(makeStorm('warning', 110))
    render(<RadiationAlarmModal />)
    expect(screen.getByRole('alertdialog')).toBeDefined()
  })

  it('is in Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    setStorm(makeStorm('warning', 110))
    render(<RadiationAlarmModal />)
    expect(screen.getByRole('button', { name: 'Abrigar tripulação' })).toBeDefined()
  })

  it('goes away when the storm is over', () => {
    setStorm(makeStorm('active', 120))
    const { rerender } = render(<RadiationAlarmModal />)
    expect(screen.getByRole('alertdialog')).toBeDefined()
    setStorm(null)
    rerender(<RadiationAlarmModal />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('shows Commander Vega in her helmet alert portrait', () => {
    setStorm(makeStorm('warning', 110))
    render(<RadiationAlarmModal />)
    const portrait = screen.getByRole('img', { name: /Commander Vega/i })
    expect(portrait.getAttribute('src')).toMatch(/vega-alert/)
  })

  // Playtest 2026-11-15: the alarm said "keep everyone inside", but a habitat without a radiation
  // shelter protects nobody (constitution II.2).
  // Playtest 2026-11-15: the alarm covered the clock and the crew panel, Enter opened the NASA
  // link instead of sheltering, and "Take shelter" stayed on screen after the storm had hit.
  describe('acting during the alarm', () => {
    it('puts the keyboard focus on Take shelter, not on the NASA link', () => {
      setStorm(makeStorm('warning', 110))
      render(<RadiationAlarmModal />)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Take shelter' }))
    })

    it('does not lock the rest of the screen: the clock and the crew panel stay usable', () => {
      setStorm(makeStorm('warning', 110))
      render(<RadiationAlarmModal />)
      expect(screen.getByRole('alertdialog').getAttribute('aria-modal')).toBe('false')
    })

    it('once the storm hits, offers no Take shelter and counts the seconds until it passes', () => {
      setStorm(makeStorm('active', 120), 105)
      render(<RadiationAlarmModal />)
      expect(screen.queryByRole('button', { name: 'Take shelter' })).toBeNull()
      expect(screen.getByTestId('storm-passing').textContent).toContain('15')
    })

    it('shows the day of the real event without the clock time', () => {
      act(() =>
        setStorm({
          phase: 'warning',
          phaseEndsAt: 110,
          basedOn: { date: '2024-05-10T13:02Z', url: DONKI_URL },
        }),
      )
      render(<RadiationAlarmModal />)
      const dialog = screen.getByRole('alertdialog')
      expect(dialog.textContent).toContain('2024-05-10')
      expect(dialog.textContent).not.toContain('T13:02Z')
    })
  })

  describe('who is safe', () => {
    const shelter = config.upgrades.find((u) => u.effect === 'radiation_shelter')!
    function withShelter() {
      act(() => {
        const g = useGameStore.getState().game!
        useGameStore.setState({
          game: {
            ...g,
            structures: g.structures.map((s) =>
              s.type === 'habitat' ? { ...s, upgrades: [...s.upgrades, shelter.id] } : s,
            ),
          },
        })
      })
    }

    it('says only a radiation shelter keeps astronauts safe, not just being inside', () => {
      for (const phase of ['warning', 'active'] as const) {
        setStorm(makeStorm(phase, 110))
        render(<RadiationAlarmModal />)
        const dialog = screen.getByRole('alertdialog')
        expect(dialog.textContent).toMatch(/radiation shelter/i)
        expect(dialog.textContent).not.toMatch(/keep everyone inside/i)
        cleanup()
      }
    })

    it('warns that even the astronauts inside are in danger when no habitat has a shelter', () => {
      setStorm(makeStorm('warning', 110))
      render(<RadiationAlarmModal />)
      expect(screen.getByTestId('shelter-danger').textContent).toMatch(/even inside/i)
    })

    it('does not warn when the shelters have room for the whole crew', () => {
      withShelter()
      setStorm(makeStorm('warning', 110))
      render(<RadiationAlarmModal />)
      expect(screen.queryByTestId('shelter-danger')).toBeNull()
    })
  })
})
