// @vitest-environment jsdom
// UI tests for US1 (Dev B): real store, assertions on HUD elements, TDD test-first.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { targets } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { Hud } from './Hud'

describe('Hud', () => {
  beforeEach(() => act(() => useGameStore.getState().start(42)))
  afterEach(cleanup)

  it('shows each vital reserve against its win target', () => {
    render(<Hud />)
    expect(screen.getByTestId('vital-oxygen').textContent).toContain(`/ ${targets.reserves.oxygen}`)
    expect(screen.getByTestId('vital-water').textContent).toContain(`/ ${targets.reserves.water}`)
    expect(screen.getByTestId('vital-food').textContent).toContain(`/ ${targets.reserves.food}`)
  })

  it('the pause and speed buttons change the game speed', async () => {
    render(<Hud />)
    await userEvent.click(screen.getByRole('button', { name: '4x speed' }))
    expect(useGameStore.getState().speed).toBe(4)
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(useGameStore.getState().speed).toBe(0)
  })

  // US1 (Dev B) — constitution II.2, II.8, principle VII (T010)
  it('a vital bar flashes when it holds less than one season of crew needs', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          stock: {
            ...g.stock,
            oxygen: 2, // Less than 4 U (1 season need for 4 crew)
          },
        },
      })
    })

    render(<Hud />)
    const oxygenBar = screen.getByTestId('vital-oxygen')
    expect(oxygenBar.className).toContain('low')
  })

  // US1 (Dev B) — constitution II.7, principle VII (T011)
  it('the power meter turns red when the balance is negative', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          power: {
            ...g.power,
            productionKw: 10,
            demandKw: 16,
            balanceKw: -6,
          },
        },
      })
    })

    render(<Hud />)
    const power = screen.getByTestId('power')
    expect(power.textContent).toContain('-6 kW')
    expect(power.className).toContain('deficit')
  })

  // US1 (Dev B) — constitution II.4 (T012)
  it('the wallet shows hematite, regolith, iron, steel and repair parts', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          stock: {
            ...g.stock,
            hematite: 50,
            regolith: 35,
            iron: 12,
            steel: 4,
            repair_parts: 8,
          },
        },
      })
    })

    render(<Hud />)
    const wallet = screen.getByTestId('wallet')
    expect(wallet.textContent).toContain('50')
    expect(wallet.textContent).toContain('35')
    expect(wallet.textContent).toContain('12')
    expect(wallet.textContent).toContain('4')
    expect(wallet.textContent).toContain('8')
  })

  // US1 (Dev B) — constitution II.9, principle VII (T013)
  it('the crew panel shows each astronaut and warns at 75% exposure', () => {
    act(() => {
      const g = useGameStore.getState().game!
      const updatedCrew = g.crew.map((a, i) =>
        i === 0 ? { ...a, exposure: 0.8, location: 'outside' as const } : a,
      )
      useGameStore.setState({
        game: {
          ...g,
          crew: updatedCrew,
        },
      })
    })

    render(<Hud />)
    const crewPanel = screen.getByTestId('crew-panel')
    expect(crewPanel).toBeDefined()
    // Should display all 4 astronauts
    const members = screen.getAllByTestId(/^crew-member-/)
    expect(members).toHaveLength(4)

    // The astronaut with 0.8 exposure should have warning indicator
    const exposedAstronaut = screen.getByTestId(
      `crew-member-${useGameStore.getState().game!.crew[0].id}`,
    )
    expect(exposedAstronaut.className).toContain('warning')
  })
})
