// @vitest-environment jsdom
// Issue #50: "Bring inside" pauses the job; the selected structure offers Resume.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import type { Job } from '../../engine/types'
import { useLang } from '../../ui-kit/i18n'
import { UpgradePanel } from './UpgradePanel'

/** Selects the first habitat and gives it one upgrade job with this status. */
function selectHabitatWithJob(status: Job['status']) {
  act(() => {
    const g = useGameStore.getState().game!
    const habitat = g.structures.find((s) => s.type === 'habitat')!
    useGameStore.setState({
      selectedStructureId: habitat.id,
      game: {
        ...g,
        jobs: [
          {
            id: 'j99',
            kind: 'upgrade',
            structureId: habitat.id,
            upgradeId: 'thermal_insulation',
            astronautId: null,
            remainingSeconds: 5,
            status,
          },
        ],
      },
    })
  })
}

describe('UpgradePanel: resume a paused job', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('a job paused by "Bring inside" offers Resume, which puts it back in the queue', async () => {
    selectHabitatWithJob('held')
    render(<UpgradePanel />)
    expect(screen.getByText(/The work here is paused/)).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: /Resume/ }))
    expect(useGameStore.getState().game!.jobs[0].status).toBe('queued')
    expect(screen.queryByRole('button', { name: /Resume/ })).toBeNull()
  })

  it('a job that is waiting or running offers no Resume', () => {
    for (const status of ['queued', 'active', 'paused'] as const) {
      selectHabitatWithJob(status)
      render(<UpgradePanel />)
      expect(screen.queryByRole('button', { name: /Resume/ })).toBeNull()
      cleanup()
    }
  })

  it('is in Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    selectHabitatWithJob('held')
    render(<UpgradePanel />)
    expect(screen.getByRole('button', { name: /Retomar/ })).toBeDefined()
  })
})
