// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { translate, useLang } from '../../ui-kit/i18n'
import { BuildMenu } from './BuildMenu'

const materials = config.resources.filter((resource) => resource.kind === 'material')

function setMaterials(stockValues: Record<string, number>) {
  const game = useGameStore.getState().game!
  const stock = Object.fromEntries(materials.map(({ id }) => [id, stockValues[id] ?? 0]))

  useGameStore.setState({ game: { ...game, stock: { ...game.stock, ...stock } } })
}

describe('BuildMenu', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('opens the build catalog from a visible build button', async () => {
    render(<BuildMenu />)

    expect(screen.queryByRole('dialog', { name: 'Build menu' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))

    expect(screen.getByRole('dialog', { name: 'Build menu' })).toBeDefined()
  })

  it('clicking a structure starts placing it', async () => {
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))
    await userEvent.click(screen.getByRole('button', { name: /Solar panel/ }))

    expect(useGameStore.getState().placing).toBe('solar_panel')
    expect(screen.queryByRole('dialog', { name: 'Build menu' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel placement' })).toBeDefined()
  })

  it('cancels structure placement without spending resources', async () => {
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))
    await userEvent.click(screen.getByRole('button', { name: /Solar panel/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel placement' }))

    expect(useGameStore.getState().placing).toBeNull()
  })

  it('groups structures by technology level', async () => {
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))

    for (const level of [1, 2, 3]) {
      expect(screen.getByRole('heading', { name: new RegExp(`Level ${level}`) })).toBeDefined()
    }

    for (const structure of config.structures) {
      const group = screen.getByTestId(`build-level-${structure.level}`)
      expect(within(group).getByTestId(`build-${structure.id}`)).toBeDefined()
    }
  })

  it('disables unaffordable structures and explains each missing resource', async () => {
    act(() => setMaterials({}))
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))

    for (const structure of config.structures) {
      const button = screen.getByTestId(`build-${structure.id}`) as HTMLButtonElement
      expect(button.disabled).toBe(true)

      for (const [resourceId, amount] of Object.entries(structure.cost)) {
        const resource = config.resources.find(({ id }) => id === resourceId)
        const missing = screen.getByTestId(`missing-${structure.id}-${resourceId}`)
        expect(missing.textContent).toContain(String(amount))
        expect(missing.textContent).toContain(translate(resource?.name, 'en'))
      }
    }
  })

  it('shows the educational fact sheet before building', async () => {
    const structure = config.structures.find(({ id }) => id === 'oxygen_generator')!
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))

    const card = screen.getByTestId(`build-card-${structure.id}`)
    await userEvent.click(within(card).getByText('Science facts'))

    expect(screen.getByText(translate(structure.explain, 'en'))).toBeDefined()
    expect(screen.getByText(structure.source!.label)).toBeDefined()
  })

  it('shows only upgrades compatible with the selected structure', () => {
    const game = useGameStore.getState().game!
    const habitat = game.structures.find(({ type }) => type === 'habitat')!
    act(() => useGameStore.setState({ selectedStructureId: habitat.id }))

    render(<BuildMenu />)

    const habitatDef = config.structures.find(({ id }) => id === habitat.type)!
    for (const upgradeId of habitatDef.upgrades) {
      const upgrade = config.upgrades.find(({ id }) => id === upgradeId)!
      expect(screen.getByText(translate(upgrade.name, 'en'))).toBeDefined()
    }
    expect(screen.queryByTestId('upgrade-dust_filters')).toBeNull()
  })

  it('shows the upgrade panel for a selected structure without opening the build menu', () => {
    const game = useGameStore.getState().game!
    const habitat = game.structures.find(({ type }) => type === 'habitat')!
    act(() => useGameStore.setState({ selectedStructureId: habitat.id }))

    render(<BuildMenu />)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('upgrade-thermal_insulation')).toBeDefined()
  })

  it('rounds what is missing up to a whole number, never a long decimal', async () => {
    const structure = config.structures.find((s) => (s.cost.hematite ?? 0) > 0)!
    const cost = structure.cost.hematite!
    // The stock holds a fraction (production adds small amounts every step).
    act(() =>
      setMaterials({ hematite: cost - 5.5426546235, regolith: 1000, iron: 1000, steel: 1000 }),
    )
    render(<BuildMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Build base' }))
    const text = screen.getByTestId(`missing-${structure.id}-hematite`).textContent ?? ''
    expect(text).toContain('Missing 6 ')
    expect(text).not.toMatch(/\d\.\d/)
  })

  // Playtest 2026-11-15: in the dark winter the build was refused without a word, and a click on
  // a taken tile gave no answer either.
  describe('refusals in plain words', () => {
    function darkWinter() {
      act(() => {
        const g = useGameStore.getState().game!
        const dark = { id: 'e1', ruleId: 'test', kind: 'darkness' as const, endsAt: null }
        useGameStore.setState({
          game: { ...g, activeEvents: [{ ...dark, solarFactor: 1, blocksExternalJobs: true }] },
        })
      })
    }

    it('nothing can be picked while outdoor jobs are blocked, and the menu says why', async () => {
      act(() => setMaterials({ hematite: 999, regolith: 999, iron: 999, steel: 999 }))
      darkWinter()
      render(<BuildMenu />)
      await userEvent.click(screen.getByRole('button', { name: 'Build base' }))
      expect(screen.getByTestId('build-blocked').textContent).toMatch(/spring/i)
      for (const s of config.structures) {
        expect((screen.getByTestId(`build-${s.id}`) as HTMLButtonElement).disabled).toBe(true)
      }
    })

    it('has no such notice in a normal season', async () => {
      render(<BuildMenu />)
      await userEvent.click(screen.getByRole('button', { name: 'Build base' }))
      expect(screen.queryByTestId('build-blocked')).toBeNull()
    })

    it('a refused placement says why next to "Where shall we build?"', () => {
      const habitat = useGameStore.getState().game!.structures.find((s) => s.type === 'habitat')!
      act(() => {
        useGameStore.getState().beginPlacement('solar_panel')
        useGameStore.getState().placeAt(habitat.tile)
      })
      render(<BuildMenu />)
      expect(useGameStore.getState().placing).toBe('solar_panel')
      expect(screen.getByRole('alert').textContent).toMatch(/blocked/i)
    })
  })
})
