// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store'
import { useLang } from '../../ui-kit/i18n'
import { canPlay3d, prefersReducedMotion } from './motion'
import { TitleScreen } from './TitleScreen'
import { TRANSITION_SECONDS } from './transition'

// jsdom has no WebGL: each test says if the device can play the 3D menu or not.
vi.mock('./motion', () => ({
  canPlay3d: vi.fn(() => false),
  prefersReducedMotion: vi.fn(() => false),
}))

// The real scene needs WebGL. This stand-in lets a test say "the planet is drawn" and
// "the rocket has landed".
vi.mock('./MenuScene', () => ({
  default: ({
    launching,
    onReady,
    onLanded,
  }: {
    launching: boolean
    onReady: () => void
    onLanded: () => void
  }) => (
    <>
      <button type="button" onClick={onReady}>
        fake planet drawn
      </button>
      <button type="button" data-launching={String(launching)} onClick={onLanded}>
        fake rocket landed
      </button>
    </>
  ),
}))

const store = () => useGameStore.getState()

describe('TitleScreen', () => {
  beforeEach(() => {
    vi.mocked(canPlay3d).mockReturnValue(false)
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
    act(() => useGameStore.setState({ screen: 'title', game: null }))
    useLang.setState({ lang: 'en' })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('welcomes the player with the game logo, readable by a screen reader', () => {
    render(<TitleScreen />)
    const logo = screen.getByRole('img', { name: 'Dust & Dome: Mars Survival Simulator' })
    expect(screen.getByRole('heading', { level: 1 }).contains(logo)).toBe(true)
  })

  it('uses words, not emoji, on every button', () => {
    render(<TitleScreen />)
    for (const button of screen.getAllByRole('button')) {
      expect(button.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('opens the science sources screen', async () => {
    render(<TitleScreen />)
    await userEvent.click(screen.getByRole('button', { name: 'Where does the science come from?' }))
    expect(store().screen).toBe('sources')
  })

  it('the language button shows the language the menu is in', async () => {
    render(<TitleScreen />)
    expect(screen.getByRole('button', { name: 'English' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Português' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('button', { name: 'Português' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'English' })).toBeNull()
  })

  it('switches every text to Portuguese and back without leaving the screen', async () => {
    render(<TitleScreen />)
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('button', { name: 'Jogar' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'De onde vem a ciência?' })).toBeDefined()
    expect(store().screen).toBe('title')

    await userEvent.click(screen.getByRole('button', { name: 'Português' }))
    expect(screen.getByRole('button', { name: 'Play game' })).toBeDefined()
  })

  describe('when the device cannot show the 3D menu', () => {
    it('starts the mission right away', async () => {
      render(<TitleScreen />)
      expect(screen.queryByText('fake rocket landed')).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'Play game' }))
      expect(store().screen).toBe('game')
      expect(store().game).not.toBeNull()
    })
  })

  describe('when the player asked the device for less motion', () => {
    it('skips the landing animation', async () => {
      vi.mocked(canPlay3d).mockReturnValue(true)
      vi.mocked(prefersReducedMotion).mockReturnValue(true)
      render(<TitleScreen />)
      await userEvent.click(screen.getByRole('button', { name: 'Play game' }))
      expect(store().screen).toBe('game')
    })
  })

  describe('when the device can show the 3D menu', () => {
    beforeEach(() => vi.mocked(canPlay3d).mockReturnValue(true))

    it('shows a planet right away and hands over to the 3D one once it is drawn', async () => {
      render(<TitleScreen />)
      const placeholder = screen.getByTestId('planet-placeholder')
      expect(placeholder.getAttribute('data-hidden')).toBe('false')

      await userEvent.click(await screen.findByText('fake planet drawn'))
      expect(placeholder.getAttribute('data-hidden')).toBe('true')
    })

    it('plays the landing first and starts the mission when the rocket lands', async () => {
      render(<TitleScreen />)
      const scene = await screen.findByText('fake rocket landed')
      expect(scene.getAttribute('data-launching')).toBe('false')

      await userEvent.click(screen.getByRole('button', { name: 'Play game' }))
      expect(store().screen).toBe('title')
      expect(store().game).toBeNull()
      expect(scene.getAttribute('data-launching')).toBe('true')
      expect(screen.getByRole('status').textContent).toMatch(/Landing on Mars/)
      expect(screen.queryByRole('button', { name: 'Play game' })).toBeNull()

      await userEvent.click(scene)
      expect(store().screen).toBe('game')
      expect(store().game).not.toBeNull()
    })

    it('lets the player skip the landing', async () => {
      render(<TitleScreen />)
      await userEvent.click(screen.getByRole('button', { name: 'Play game' }))
      await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
      expect(store().screen).toBe('game')
    })

    it('still starts the mission if the animation never finishes', () => {
      vi.useFakeTimers()
      render(<TitleScreen />)
      fireEvent.click(screen.getByRole('button', { name: 'Play game' }))
      act(() => {
        vi.advanceTimersByTime(TRANSITION_SECONDS * 1000)
      })
      expect(store().screen).toBe('title')
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(store().screen).toBe('game')
    })
  })
})
