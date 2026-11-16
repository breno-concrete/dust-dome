// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { useLang } from '../../ui-kit/i18n'
import { GameOverFeedback } from './GameOverFeedback'

function lose(cause: string) {
  act(() => {
    const g = useGameStore.getState().game!
    useGameStore.setState({
      game: {
        ...g,
        status: 'lost',
        lostReason: 'crew_lost',
        log: [{ at: 10, cycle: 3, season: 'winter', kind: 'death', ref: 'a1', cause }],
      },
    })
  })
}

describe('GameOverFeedback', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('shows nothing while the game is running', () => {
    render(<GameOverFeedback />)
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('Vega gives advice after a loss: a title and a short list of things to try', () => {
    lose('cold')
    render(<GameOverFeedback />)
    const region = screen.getByRole('complementary', { name: /Commander Vega/ })
    const items = within(region).getAllByRole('listitem')
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.length).toBeLessThanOrEqual(3)
    expect(within(region).getByRole('heading')).toBeDefined()
  })

  it('advises about what really happened', () => {
    lose('cold')
    render(<GameOverFeedback />)
    expect(screen.getByText(/Thermal insulation/)).toBeDefined()
  })

  it('speaks Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    lose('cold')
    render(<GameOverFeedback />)
    expect(screen.getByRole('complementary', { name: /Comandante Vega/ })).toBeDefined()
    expect(screen.getByText(/Isolamento térmico/)).toBeDefined()
  })
})
