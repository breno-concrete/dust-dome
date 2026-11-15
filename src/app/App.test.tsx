// @vitest-environment jsdom
// The app shell mounts the radiation alarm itself, so it shows on top of any panel or briefing.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLang } from '../ui-kit/i18n'
import App from './App'
import { useGameStore } from './store'

// three.js does not run in jsdom, and the real loop would keep ticking between tests.
vi.mock('../features/scene/Scene', () => ({ default: () => null }))
vi.mock('./loop', () => ({ startLoop: () => () => {} }))

const DONKI_URL = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/'

function warningStorm(briefingOpen: boolean) {
  act(() => {
    const g = useGameStore.getState().game!
    useGameStore.setState({
      game: {
        ...g,
        time: { ...g.time, elapsed: 100 },
        radiationStorm: {
          phase: 'warning',
          phaseEndsAt: 110,
          basedOn: { date: '2024-05-10', url: DONKI_URL },
        },
        briefing: briefingOpen ? { cycle: 2, season: 'spring' } : null,
      },
    })
  })
}

describe('App shell: radiation alarm', () => {
  const original = useGameStore.getState().shelterAll
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(() => {
    cleanup()
    act(() => useGameStore.setState({ shelterAll: original }))
  })

  it('shows the alarm with its countdown even while a briefing is open', () => {
    warningStorm(true)
    render(<App />)
    expect(screen.getByRole('alertdialog', { name: /radiation storm/i })).toBeTruthy()
    expect(screen.getByTestId('storm-countdown').textContent).toContain('10')
  })

  it('"Take shelter" shelters the whole crew', async () => {
    const shelterAll = vi.fn()
    act(() => useGameStore.setState({ shelterAll }))
    warningStorm(true)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Take shelter' }))
    expect(shelterAll).toHaveBeenCalledTimes(1)
  })
})
