// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { useLang } from '../../ui-kit/i18n'
import { BriefingDialog } from './BriefingDialog'

function openBriefing(cycle: number, season: 'spring' | 'summer' | 'autumn' | 'winter') {
  act(() => {
    const g = useGameStore.getState().game!
    // The game has already started (elapsed > 0): a brand new game opens with the tutorial first.
    useGameStore.setState({
      game: { ...g, time: { ...g.time, elapsed: 1 }, briefing: { cycle, season } },
    })
  })
}

describe('BriefingDialog', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('shows nothing when there is no briefing', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({ game: { ...g, briefing: null } })
    })
    render(<BriefingDialog />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the commander and the text written for that cycle and season', () => {
    openBriefing(2, 'summer')
    render(<BriefingDialog />)
    expect(screen.getByText('Commander Vega')).toBeDefined()
    expect(screen.getByText(config.narrator.briefings['2']!.summer.text.en)).toBeDefined()
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toMatch(/Year 2/)
  })

  it('shows different text for different seasons', () => {
    openBriefing(1, 'spring')
    render(<BriefingDialog />)
    expect(screen.getByText(config.narrator.briefings['1']!.spring.text.en)).toBeDefined()
    expect(screen.queryByText(config.narrator.briefings['1']!.winter.text.en)).toBeNull()
  })

  it('speaks Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    openBriefing(1, 'spring')
    render(<BriefingDialog />)
    expect(screen.getByText('Comandante Vega')).toBeDefined()
    expect(screen.getByText(config.narrator.briefings['1']!.spring.text.pt!)).toBeDefined()
  })

  it('warns about the cold of year 3 and the thermal insulation, highlighted', () => {
    openBriefing(3, 'spring')
    render(<BriefingDialog />)
    const warning = screen.getByText(config.narrator.briefings['3']!.spring.warning!.en)
    expect(warning).toBeDefined()
    expect(warning.closest('[role="alert"], [data-testid="briefing-warning"]')).not.toBeNull()
  })

  it('has no warning block when the briefing has none', () => {
    openBriefing(1, 'spring')
    render(<BriefingDialog />)
    expect(screen.queryByTestId('briefing-warning')).toBeNull()
  })

  it('closes with the button and the game can go on', async () => {
    openBriefing(1, 'spring')
    render(<BriefingDialog />)
    await userEvent.click(screen.getByRole('button', { name: 'Start the season' }))
    expect(useGameStore.getState().game!.briefing).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders Commander Vega portrait matching the briefing mood and steps through intro frames', () => {
    vi.useFakeTimers()
    openBriefing(1, 'spring')
    render(<BriefingDialog />)

    const portrait = screen.getByRole('img', { name: /Commander Vega/i })
    const initialSrc = portrait.getAttribute('src')
    expect(initialSrc).toMatch(/\/narrator\/vega-/)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(portrait.getAttribute('src')).toMatch(/vega-welcome\.(png|webp)$/)
  })

  it('uses the helmet alert portrait during global storm briefings', () => {
    vi.useFakeTimers()
    openBriefing(3, 'summer')
    render(<BriefingDialog />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    const portrait = screen.getByRole('img', { name: /Commander Vega/i })
    expect(portrait.getAttribute('src')).toMatch(/vega-alert\.(png|webp)$/)
  })
})
