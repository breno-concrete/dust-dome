// @vitest-environment jsdom
// Example UI test (Dev B): render with the real store, act like the player, assert.
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
  })

  it('the pause and speed buttons change the game speed', async () => {
    render(<Hud />)
    await userEvent.click(screen.getByRole('button', { name: '4×' }))
    expect(useGameStore.getState().speed).toBe(4)
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(useGameStore.getState().speed).toBe(0)
  })

  // US2 (Dev B) — constitution II.2, II.7, principle VII
  it.todo('a vital bar flashes when it holds less than one season of crew needs')
  it.todo('the power meter turns red when the balance is negative')
  it.todo('the wallet shows hematite, regolith, iron, steel and repair parts')
  it.todo('the crew panel shows each astronaut and warns at 75% exposure')
})
