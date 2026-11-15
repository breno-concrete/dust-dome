// @vitest-environment jsdom
// Issue #37: bring one astronaut, or everyone, back inside from the crew panel.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { useLang } from '../../ui-kit/i18n'
import { Hud } from './Hud'

function sendOutside(count: number) {
  act(() => {
    const g = useGameStore.getState().game!
    const crew = g.crew.map((a, i) => (i < count ? { ...a, location: 'outside' as const } : a))
    useGameStore.setState({ game: { ...g, crew } })
  })
}
const locations = () => useGameStore.getState().game!.crew.map((a) => a.location)

describe('Hud crew panel: bring inside', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('offers "Bring inside" only for astronauts who are outside', () => {
    sendOutside(1)
    render(<Hud />)
    const [first, second] = useGameStore.getState().game!.crew
    expect(
      within(screen.getByTestId(`crew-member-${first!.id}`)).getByRole('button', {
        name: /Bring .* inside/,
      }),
    ).toBeDefined()
    expect(within(screen.getByTestId(`crew-member-${second!.id}`)).queryByRole('button')).toBeNull()
  })

  it('bringing one astronaut inside changes only their location', async () => {
    sendOutside(2)
    render(<Hud />)
    const first = useGameStore.getState().game!.crew[0]!
    await userEvent.click(
      within(screen.getByTestId(`crew-member-${first.id}`)).getByRole('button', {
        name: /Bring .* inside/,
      }),
    )
    expect(locations()).toEqual(['inside', 'outside', 'inside', 'inside'])
  })

  it('"All inside" is disabled when nobody is outside', () => {
    render(<Hud />)
    const button = screen.getByRole('button', { name: 'All inside' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('"All inside" brings everyone in', async () => {
    sendOutside(2)
    render(<Hud />)
    await userEvent.click(screen.getByRole('button', { name: 'All inside' }))
    expect(locations().every((l) => l === 'inside')).toBe(true)
  })

  it('is in Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    sendOutside(1)
    render(<Hud />)
    expect(screen.getByRole('button', { name: 'Todos para dentro' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Trazer .* para dentro/ })).toHaveLength(1)
  })
})
