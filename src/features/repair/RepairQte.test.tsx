// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { RepairQte } from './RepairQte'

describe('RepairQte', () => {
  beforeEach(() => act(() => useGameStore.getState().start(42)))
  afterEach(cleanup)

  it('clicking every bolt finishes the QTE', async () => {
    act(() => useGameStore.getState().openQte('s1'))
    render(<RepairQte />)
    for (let i = 0; i < config.mission.repair.qteBolts; i++) {
      await userEvent.click(screen.getByRole('button', { name: /Bolt/ }))
    }
    expect(useGameStore.getState().qteFor).toBeNull()
  })

  // US3 (Dev C) — constitution II.10
  it.todo('fails when qteSeconds run out before every bolt is clicked')
  it.todo('shows one bolt at a time at a random spot on the structure')
})
