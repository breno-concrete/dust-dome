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

  it('marks the active mode of each switch and moves it when the player picks another', async () => {
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))

    const first = config.structures.find((s) => s.switchable)!
    const group = screen.getByTestId(`power-switch-${first.id}`)
    const current = useGameStore.getState().game!.powerModes[first.id]
    const pressed = within(group)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)

    const other = current === 'max' ? 'Min' : 'Max'
    await userEvent.click(within(group).getByRole('button', { name: other }))
    expect(within(group).getByRole('button', { name: other }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(useGameStore.getState().game!.powerModes[first.id]).toBe(other.toLowerCase())
  })

  it('shows a positive balance without the warning when there is surplus', async () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({ game: { ...g, power: { ...g.power, balanceKw: 7 } } })
    })
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))
    expect(screen.getByTestId('power-balance').textContent).toContain('+7')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // Playtest 2026-11-15: a type the brownout switched off must look off in its switch.
  it('a type switched off for lack of power shows Off lit and says it comes back by itself', async () => {
    const first = config.structures.find((s) => s.switchable)!
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          powerModes: { ...g.powerModes, [first.id]: 'max' },
          power: { ...g.power, shed: [first.id] },
        },
      })
    })
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))

    const group = screen.getByTestId(`power-switch-${first.id}`)
    expect(within(group).getByRole('button', { name: 'Off' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(within(group).getByRole('button', { name: 'Max' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    const note = screen.getByTestId(`power-shed-${first.id}`)
    expect(note.textContent).toContain('No power')
    expect(note.textContent).toContain('Max')
  })

  it('types that have power show no no-power note', async () => {
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))
    for (const s of config.structures.filter((d) => d.switchable)) {
      expect(screen.queryByTestId(`power-shed-${s.id}`)).toBeNull()
    }
  })

  // Playtest 2026-11-15: the player could not tell whether the battery was storing energy.
  it('shows how much energy the batteries hold', async () => {
    const bank = config.structures.find((s) => s.power.kind === 'storage')!
    if (bank.power.kind !== 'storage') throw new Error('not storage')
    const capacity = bank.power.capacityEu
    act(() => {
      const g = useGameStore.getState().game!
      const site = { id: 'b1', type: bank.id, tile: [10, 10] as [number, number] }
      useGameStore.setState({
        game: {
          ...g,
          batteryEu: capacity / 2,
          structures: [...g.structures, { ...site, status: 'active', upgrades: [] }],
        },
      })
    })
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))
    const battery = screen.getByTestId('power-battery')
    expect(battery.textContent).toContain(`${capacity / 2} / ${capacity} EU`)
    expect(battery.textContent).toContain('50%')
  })

  it('says the base has no battery yet when there is no battery bank', async () => {
    render(<PowerPanel />)
    await userEvent.click(screen.getByRole('button', { name: /Power switches/ }))
    expect(screen.getByTestId('power-battery').textContent).toContain('No battery')
  })
})
