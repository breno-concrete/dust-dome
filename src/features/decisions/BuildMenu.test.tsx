// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { BuildMenu } from './BuildMenu'

describe('BuildMenu', () => {
  beforeEach(() => act(() => useGameStore.getState().start(42)))
  afterEach(cleanup)

  it('clicking a structure starts placing it', async () => {
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: /Solar panel/ }))
    expect(useGameStore.getState().placing).toBe('solar_panel')
  })

  // US1–US3 (Dev B) — constitution II.6, II.12
  it.todo('structures the player cannot afford are disabled and say what is missing')
  it.todo('shows the fact sheet (explain) before building')
  it.todo('groups structures by level 1, 2, 3')
  it.todo('the upgrades menu lists only the upgrades of the selected structure')
})
