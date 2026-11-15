// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { useLang } from '../../ui-kit/i18n'
import { PowerPanel } from './PowerPanel'

describe('PowerPanel', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  const originalSetPowerMode = useGameStore.getState().setPowerMode
  afterEach(() => {
    cleanup()
    act(() => useGameStore.setState({ setPowerMode: originalSetPowerMode }))
  })

  it('opens and closes from the dock button', async () => {
    render(<PowerPanel />)
    expect(screen.queryByRole('complementary')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))
    expect(screen.getByRole('complementary')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('offers Off / Min / Max for every switchable structure type and applies the choice', async () => {
    // The engine action is still a stub (engine/ area), so check the store call.
    const setPowerMode = vi.fn()
    act(() => useGameStore.setState({ setPowerMode }))
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))

    const switchable = config.structures.filter((s) => s.switchable)
    expect(switchable.length).toBeGreaterThan(0)
    for (const s of switchable) {
      const group = screen.getByTestId(`power-switch-${s.id}`)
      expect(within(group).getAllByRole('button')).toHaveLength(3)
    }

    const first = switchable[0]!
    const group = screen.getByTestId(`power-switch-${first.id}`)
    await userEvent.click(within(group).getByRole('button', { name: 'Off' }))
    expect(setPowerMode).toHaveBeenCalledWith(first.id, 'off')
  })

  it('shows a negative balance with a warning when power is short', async () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({ game: { ...g, power: { ...g.power, balanceKw: -5 } } })
    })
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))
    expect(screen.getByTestId('power-balance').textContent).toContain('-5')
    expect(screen.getByRole('alert')).toBeDefined()
  })
})
