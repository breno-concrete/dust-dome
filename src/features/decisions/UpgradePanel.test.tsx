// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { translate, useLang } from '../../ui-kit/i18n'
import { UpgradePanel } from './UpgradePanel'

const originalInstallUpgrade = useGameStore.getState().installUpgrade

function selectHabitat() {
  const game = useGameStore.getState().game!
  const habitat = game.structures.find(({ type }) => type === 'habitat')!
  const upgrades = config.structures.find(({ id }) => id === habitat.type)!.upgrades
  const stock = { ...game.stock }
  for (const upgradeId of upgrades) {
    const upgrade = config.upgrades.find(({ id }) => id === upgradeId)!
    for (const [resourceId, amount] of Object.entries(upgrade.cost)) {
      stock[resourceId] = Math.max(stock[resourceId] ?? 0, amount)
    }
  }
  useGameStore.setState({
    selectedStructureId: habitat.id,
    game: { ...game, stock },
  })
  return habitat
}

describe('UpgradePanel', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })

  afterEach(() => {
    cleanup()
    act(() => useGameStore.setState({ installUpgrade: originalInstallUpgrade }))
    vi.restoreAllMocks()
  })

  it('shows compatible upgrade costs and science descriptions', () => {
    const habitat = selectHabitat()
    const habitatDef = config.structures.find(({ id }) => id === habitat.type)!
    render(<UpgradePanel />)

    for (const upgradeId of habitatDef.upgrades) {
      const upgrade = config.upgrades.find(({ id }) => id === upgradeId)!
      const card = screen.getByTestId(`upgrade-${upgrade.id}`)
      expect(card.textContent).toContain(translate(upgrade.name, 'en'))
      expect(card.textContent).toContain(translate(upgrade.explain, 'en'))

      for (const [resourceId, amount] of Object.entries(upgrade.cost)) {
        const resource = config.resources.find(({ id }) => id === resourceId)
        expect(card.textContent).toContain(String(amount))
        expect(card.textContent).toContain(translate(resource?.name, 'en'))
      }
    }
  })

  it('calls installUpgrade with the selected structure and upgrade', async () => {
    const habitat = selectHabitat()
    const upgrade = config.upgrades.find(({ id }) => id === 'thermal_insulation')!
    const installUpgrade = vi.fn()
    act(() => useGameStore.setState({ installUpgrade }))
    render(<UpgradePanel />)

    await userEvent.click(screen.getByTestId(`install-${upgrade.id}`))

    expect(installUpgrade).toHaveBeenCalledWith(habitat.id, upgrade.id)
  })

  it('closes (deselects the structure) when the player clicks outside the panel', async () => {
    selectHabitat()
    render(<UpgradePanel />)

    await userEvent.click(screen.getByTestId('upgrade-thermal_insulation'))
    expect(useGameStore.getState().selectedStructureId).not.toBeNull()

    await userEvent.click(document.body)
    expect(useGameStore.getState().selectedStructureId).toBeNull()
  })
})
