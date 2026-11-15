// @vitest-environment jsdom
// Selected machine: its name, its state and a production bar for what it makes.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { PowerMode, StructureStatus } from '../../engine/types'
import { useLang } from '../../ui-kit/i18n'
import { UpgradePanel } from './UpgradePanel'

const def = (id: string) => config.structures.find((s) => s.id === id)!

function select(
  type: string,
  opts: { status?: StructureStatus; mode?: PowerMode; shed?: boolean } = {},
) {
  act(() => {
    const g = useGameStore.getState().game!
    const target = g.structures.find((s) => s.type === type)!
    useGameStore.setState({
      selectedStructureId: target.id,
      game: {
        ...g,
        powerModes: { ...g.powerModes, ...(opts.mode ? { [type]: opts.mode } : {}) },
        power: { ...g.power, shed: opts.shed ? [type] : [] },
        structures: g.structures.map((s) =>
          s.id === target.id ? { ...s, status: opts.status ?? 'active' } : s,
        ),
      },
    })
  })
}
const bar = (name: string) => screen.getByRole('progressbar', { name })

describe('UpgradePanel: machine name, state and production bars', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('shows the name of the selected machine as the panel heading', () => {
    select('oxygen_generator')
    render(<UpgradePanel />)
    expect(
      screen.getByRole('heading', { level: 2, name: def('oxygen_generator').name.en }),
    ).toBeDefined()
  })

  it('shows the name in Portuguese when the language is switched', () => {
    select('oxygen_generator')
    useLang.setState({ lang: 'pt' })
    render(<UpgradePanel />)
    expect(
      screen.getByRole('heading', { level: 2, name: def('oxygen_generator').name.pt! }),
    ).toBeDefined()
  })

  it('names the machine even when it has no upgrades', () => {
    const plain = config.structures.find(
      (s) =>
        s.upgrades.length === 0 &&
        useGameStore.getState().game!.structures.some((x) => x.type === s.id),
    )
    if (!plain) return
    select(plain.id)
    render(<UpgradePanel />)
    expect(screen.getByRole('heading', { level: 2, name: plain.name.en })).toBeDefined()
  })

  it('shows what the machine makes as a bar of its current output against its best output', () => {
    select('oxygen_generator', { mode: 'min' })
    render(<UpgradePanel />)
    const oxygen = bar('Oxygen')
    expect(oxygen.getAttribute('aria-valuenow')).toBe(
      String(def('oxygen_generator').outputs!.min.oxygen),
    )
    expect(oxygen.getAttribute('aria-valuemax')).toBe(
      String(def('oxygen_generator').outputs!.max.oxygen),
    )
  })

  it('the bar fills up when the switch goes to Max', () => {
    select('oxygen_generator', { mode: 'max' })
    render(<UpgradePanel />)
    expect(bar('Oxygen').getAttribute('aria-valuenow')).toBe(
      String(def('oxygen_generator').outputs!.max.oxygen),
    )
  })

  it('a machine with two products gets one bar each', () => {
    select('mine')
    render(<UpgradePanel />)
    expect(bar('Hematite')).toBeDefined()
    expect(bar('Regolith')).toBeDefined()
  })

  it('a damaged machine shows reduced output and says it is damaged', () => {
    select('oxygen_generator', { mode: 'max', status: 'damaged' })
    render(<UpgradePanel />)
    const full = def('oxygen_generator').outputs!.max.oxygen!
    expect(Number(bar('Oxygen').getAttribute('aria-valuenow'))).toBeCloseTo(
      full * config.mission.damage.damagedFactor,
    )
    expect(screen.getByTestId('structure-status').textContent).toMatch(/Damaged/)
  })

  it('a machine without power shows an empty bar and says why', () => {
    select('oxygen_generator', { shed: true })
    render(<UpgradePanel />)
    expect(bar('Oxygen').getAttribute('aria-valuenow')).toBe('0')
    expect(screen.getByTestId('structure-status').textContent).toMatch(/No power/)
  })

  it('a machine switched off shows an empty bar and says it is off', () => {
    select('oxygen_generator', { mode: 'off' })
    render(<UpgradePanel />)
    expect(bar('Oxygen').getAttribute('aria-valuenow')).toBe('0')
    expect(screen.getByTestId('structure-status').textContent).toMatch(/Switched off/)
  })

  it('a machine under construction says so', () => {
    select('oxygen_generator', { status: 'building' })
    render(<UpgradePanel />)
    expect(screen.getByTestId('structure-status').textContent).toMatch(/Under construction/)
  })

  it('a solar panel shows the power it makes this season', () => {
    select('solar_panel')
    render(<UpgradePanel />)
    const season = useGameStore.getState().game!.time.season
    const kw = (def('solar_panel').power as { kwBySeason: Record<string, number> }).kwBySeason
    const power = within(screen.getByTestId('structure-production')).getByRole('progressbar', {
      name: 'Power',
    })
    expect(power.getAttribute('aria-valuenow')).toBe(String(kw[season]))
    expect(power.getAttribute('aria-valuemax')).toBe(String(Math.max(...Object.values(kw))))
  })

  it('a machine that makes nothing (habitat) has a name and state but no bars', () => {
    select('habitat')
    render(<UpgradePanel />)
    expect(screen.getByTestId('structure-status')).toBeDefined()
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0)
  })

  it('says what the machine uses, so the player understands why it stops', () => {
    select('greenhouse', { mode: 'min' })
    render(<UpgradePanel />)
    const uses = screen.getByTestId('structure-inputs').textContent ?? ''
    expect(uses).toMatch(/Water/)
    expect(uses).toContain(String(def('greenhouse').inputs!.min.water))
  })
})
