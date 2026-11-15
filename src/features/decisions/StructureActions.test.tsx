// @vitest-environment jsdom
// Issue #36: Repair, Clean and Demolish buttons for the selected structure.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { StructureStatus } from '../../engine/types'
import { useLang } from '../../ui-kit/i18n'
import { UpgradePanel } from './UpgradePanel'

const PARTS = config.mission.repair.parts

/** Selects the first structure of a type, sets its status and the spare parts in stock. */
function select(type: string, status: StructureStatus, parts = PARTS) {
  act(() => {
    const g = useGameStore.getState().game!
    const target = g.structures.find((s) => s.type === type)!
    useGameStore.setState({
      selectedStructureId: target.id,
      game: {
        ...g,
        stock: { ...g.stock, repair_parts: parts },
        structures: g.structures.map((s) => (s.id === target.id ? { ...s, status } : s)),
      },
    })
  })
  return useGameStore.getState().game!.structures.find((s) => s.type === type)!
}

describe('UpgradePanel: structure actions', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('a damaged structure offers Repair, which opens the repair game for it', async () => {
    const target = select('habitat', 'damaged')
    render(<UpgradePanel />)
    await userEvent.click(screen.getByRole('button', { name: /Repair/ }))
    expect(useGameStore.getState().qteFor).toBe(target.id)
  })

  it('a short-circuited structure also offers Repair', () => {
    select('habitat', 'short_circuit')
    render(<UpgradePanel />)
    expect(screen.getByRole('button', { name: /Repair/ })).toBeDefined()
  })

  it('Repair is disabled and says how many parts are missing', async () => {
    select('habitat', 'damaged', 1)
    render(<UpgradePanel />)
    const button = screen.getByRole('button', { name: /Repair/ }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText(`Missing ${PARTS - 1} repair parts`)).toBeDefined()
    await userEvent.click(button)
    expect(useGameStore.getState().qteFor).toBeNull()
  })

  it('a healthy structure offers neither Repair nor Clean', () => {
    select('habitat', 'active')
    render(<UpgradePanel />)
    expect(screen.queryByRole('button', { name: /Repair/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Clean/ })).toBeNull()
  })

  it('a clogged structure offers Clean, which queues the outdoor job', async () => {
    const target = select('habitat', 'clogged')
    render(<UpgradePanel />)
    await userEvent.click(screen.getByRole('button', { name: /Clean/ }))
    const jobs = useGameStore.getState().game!.jobs
    expect(jobs.some((j) => j.kind === 'clean' && j.structureId === target.id)).toBe(true)
  })

  it('Demolish on the last habitat shows the refusal in plain words', async () => {
    select('habitat', 'active')
    render(<UpgradePanel />)
    await userEvent.click(screen.getByRole('button', { name: /Demolish/ }))
    expect(screen.getByRole('alert').textContent).toMatch(/last habitat/i)
  })

  it('Demolish is offered for structures without upgrades too', () => {
    const withoutUpgrades = config.structures.find((s) => s.upgrades.length === 0)
    if (!withoutUpgrades) return
    const g = useGameStore.getState().game!
    const present = g.structures.find((s) => s.type === withoutUpgrades.id)
    if (!present) return
    select(withoutUpgrades.id, 'active')
    render(<UpgradePanel />)
    expect(screen.getByRole('button', { name: /Demolish/ })).toBeDefined()
  })

  it('is in Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    select('habitat', 'damaged', 0)
    render(<UpgradePanel />)
    expect(screen.getByRole('button', { name: /Reparar/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Demolir/ })).toBeDefined()
  })
})
