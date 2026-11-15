// @vitest-environment jsdom
// US4 (T029): accessibility and language switching across the UI kit and the HUD.
// The title screen is not covered here (T028/T030 come later).
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../app/store'
import { config } from '../config/loadConfig'
import { Hud } from '../features/hud/Hud'
import { Modal } from './Modal'
import { useLang } from './i18n'

const resource = (id: string) => config.resources.find((r) => r.id === id)!

function setStock(patch: Record<string, number>) {
  act(() => {
    const g = useGameStore.getState().game!
    useGameStore.setState({ game: { ...g, stock: { ...g.stock, ...patch } } })
  })
}

describe('Modal accessibility', () => {
  afterEach(cleanup)
  beforeEach(() => useLang.setState({ lang: 'en' }))

  function Harness() {
    return (
      <>
        <button type="button">Opener</button>
        <Modal isOpen title="Hello" onClose={() => {}} footer={<button type="button">Go</button>}>
          <p>Body</p>
        </Modal>
      </>
    )
  }

  it('moves keyboard focus into the dialog when it opens', () => {
    render(<Harness />)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('keeps Tab inside the dialog (focus trap)', async () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 6; i++) {
      await userEvent.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 6; i++) {
      await userEvent.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('gives focus back to what opened it when it closes', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(
      <Modal isOpen title="Hello" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    )
    expect(document.activeElement).not.toBe(opener)
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('has a close button in the current language', () => {
    const { rerender } = render(
      <Modal isOpen title="Hello" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeDefined()
    act(() => useLang.setState({ lang: 'pt' }))
    rerender(
      <Modal isOpen title="Hello" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Fechar janela' })).toBeDefined()
  })
})

describe('HUD accessibility and language', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('switches every HUD label to Portuguese without remounting, and back', () => {
    render(<Hud />)
    expect(screen.getByRole('group', { name: 'Game speed controls' })).toBeDefined()
    act(() => useLang.setState({ lang: 'pt' }))
    expect(screen.getByRole('group', { name: 'Controles de velocidade' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Velocidade 2x' })).toBeDefined()
    expect(screen.queryByRole('group', { name: 'Game speed controls' })).toBeNull()
    act(() => useLang.setState({ lang: 'en' }))
    expect(screen.getByRole('button', { name: '2x speed' })).toBeDefined()
  })

  it('names each vital bar with the translated resource name', () => {
    render(<Hud />)
    expect(screen.getByRole('progressbar', { name: resource('oxygen').name.en })).toBeDefined()
    act(() => useLang.setState({ lang: 'pt' }))
    expect(screen.getByRole('progressbar', { name: resource('oxygen').name.pt! })).toBeDefined()
  })

  it('has no English-only hints when the language is Portuguese', () => {
    setStock({ oxygen: 1 })
    useLang.setState({ lang: 'pt' })
    const { container } = render(<Hud />)
    const labels = [...container.querySelectorAll('[aria-label], [title]')].map(
      (el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''}`,
    )
    expect(labels.join(' | ')).not.toMatch(/speed|reserve|warning!/i)
  })

  it('announces a low reserve in a polite live region, and stays quiet otherwise', () => {
    render(<Hud />)
    const region = screen.getByRole('status')
    expect(region.textContent?.trim()).toBe('')

    setStock({ oxygen: 1 })
    expect(within(screen.getByRole('status')).getByText(/Oxygen/)).toBeDefined()
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite')
  })

  it('announces a power deficit and an astronaut at the radiation warning', () => {
    render(<Hud />)
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          power: { ...g.power, balanceKw: -4 },
          crew: g.crew.map((a, i) => (i === 0 ? { ...a, exposure: 0.8 } : a)),
        },
      })
    })
    const text = screen.getByRole('status').textContent ?? ''
    expect(text).toMatch(/power/i)
    expect(text).toMatch(new RegExp(useGameStore.getState().game!.crew[0]!.name.split(' ')[0]!))
  })
})
