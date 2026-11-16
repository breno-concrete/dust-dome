// @vitest-environment jsdom
// Issue #36: Repair, Clean and Demolish buttons for the selected structure.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { JobKind, StructureStatus } from '../../engine/types'
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
    // Demolish asks first (playtest 2026-11-15); the refusal comes after the "yes".
    await userEvent.click(screen.getByRole('button', { name: 'Yes, demolish' }))
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

  // Playtest 2026-11-15: one click demolished a machine, with no way back, and after "Resume"
  // the Demolish button jumped to where the cursor was.
  describe('Demolish asks first and stays away from the other buttons', () => {
    const demolitions = () =>
      useGameStore.getState().game!.jobs.filter((j) => j.kind === 'demolish')

    it('one click on Demolish demolishes nothing: it asks', async () => {
      select('mine', 'active')
      render(<UpgradePanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Demolish' }))
      expect(demolitions()).toHaveLength(0)
      expect(screen.getByRole('button', { name: 'Yes, demolish' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Keep it' })).toBeDefined()
    })

    it('"Keep it" changes nothing and offers Demolish again', async () => {
      select('mine', 'active')
      render(<UpgradePanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Demolish' }))
      await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
      expect(demolitions()).toHaveLength(0)
      expect(screen.getByRole('button', { name: 'Demolish' })).toBeDefined()
    })

    it('"Yes, demolish" queues the demolition', async () => {
      const target = select('mine', 'active')
      render(<UpgradePanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Demolish' }))
      await userEvent.click(screen.getByRole('button', { name: 'Yes, demolish' }))
      expect(demolitions().map((j) => j.structureId)).toEqual([target.id])
    })

    it('is the last button of the panel, below the repair and the upgrades', () => {
      select('mine', 'damaged')
      render(<UpgradePanel />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[buttons.length - 1]!.textContent).toMatch(/Demolish/)
    })
  })

  describe('work that is already on the way', () => {
    function withJob(type: string, status: StructureStatus, kind: JobKind, upgradeId?: string) {
      const target = select(type, status)
      act(() => {
        const g = useGameStore.getState().game!
        const job = { id: 'j-test', kind, structureId: target.id, astronautId: null }
        useGameStore.setState({
          game: {
            ...g,
            jobs: [
              {
                ...job,
                remainingSeconds: 5,
                status: 'queued',
                ...(upgradeId ? { upgradeId } : {}),
              },
            ],
          },
        })
      })
      return target
    }

    it('a structure being repaired says so and offers no second Repair', () => {
      withJob('mine', 'damaged', 'repair')
      render(<UpgradePanel />)
      expect(screen.queryByRole('button', { name: /Repair/ })).toBeNull()
      expect(screen.getByTestId('structure-actions').textContent).toMatch(/repair is on the way/i)
    })

    it('a structure being cleaned says so and offers no second Clean', () => {
      withJob('mine', 'clogged', 'clean')
      render(<UpgradePanel />)
      expect(screen.queryByRole('button', { name: /Clean/ })).toBeNull()
      expect(screen.getByTestId('structure-actions').textContent).toMatch(/cleaning is on the way/i)
    })

    it('a structure being demolished says so and offers no second Demolish', () => {
      withJob('mine', 'active', 'demolish')
      render(<UpgradePanel />)
      expect(screen.queryByRole('button', { name: /Demolish/ })).toBeNull()
      expect(screen.getByTestId('panel-demolish').textContent).toMatch(/will be demolished/i)
    })

    it('an upgrade being installed says so instead of offering Install again', () => {
      const upgrade = config.structures.find((d) => d.id === 'habitat')!.upgrades[0]!
      withJob('habitat', 'active', 'upgrade', upgrade)
      render(<UpgradePanel />)
      const button = screen.getByTestId(`install-${upgrade}`) as HTMLButtonElement
      expect(button.disabled).toBe(true)
      expect(button.textContent).toMatch(/Installing/)
    })

    it('Clean waits for the dust storm to pass, and says so', () => {
      select('mine', 'clogged')
      act(() => {
        const g = useGameStore.getState().game!
        const storm = { id: 'e1', ruleId: 'test', kind: 'dust_storm' as const, endsAt: 999 }
        useGameStore.setState({
          game: { ...g, activeEvents: [{ ...storm, solarFactor: 0.6, blocksExternalJobs: false }] },
        })
      })
      render(<UpgradePanel />)
      const button = screen.getByRole('button', { name: /Clean/ }) as HTMLButtonElement
      expect(button.disabled).toBe(true)
      expect(screen.getByTestId('structure-actions').textContent).toMatch(/storm/i)
    })

    it('a lost bolt game says the repair parts were lost', () => {
      const target = select('mine', 'damaged')
      act(() => {
        useGameStore.getState().openQte(target.id)
        useGameStore.getState().finishQte(false)
      })
      render(<UpgradePanel />)
      expect(screen.getByRole('alert').textContent).toMatch(/parts were lost/i)
    })
  })

  it('the hints take the repair cost and the cleaning time from the mission config', () => {
    select('mine', 'damaged')
    const { unmount } = render(<UpgradePanel />)
    expect(screen.getByTestId('structure-actions').textContent).toContain(`${PARTS} repair parts`)
    unmount()
    select('mine', 'clogged')
    render(<UpgradePanel />)
    expect(screen.getByTestId('structure-actions').textContent).toContain(
      `${config.mission.jobs.cleanSeconds} seconds`,
    )
  })
})
