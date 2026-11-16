// @vitest-environment jsdom
// UI tests for US1 (Dev B): real store, assertions on HUD elements, TDD test-first.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { targets } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { GameState } from '../../engine/types'
import { Hud } from './Hud'

describe('Hud', () => {
  beforeEach(() => act(() => useGameStore.getState().start(42)))
  afterEach(cleanup)

  it('shows each vital reserve against its win target', () => {
    render(<Hud />)
    expect(screen.getByTestId('vital-oxygen').textContent).toContain(`/ ${targets.reserves.oxygen}`)
    expect(screen.getByTestId('vital-water').textContent).toContain(`/ ${targets.reserves.water}`)
    expect(screen.getByTestId('vital-food').textContent).toContain(`/ ${targets.reserves.food}`)
  })

  it('groups survival, time controls, materials, and crew like the supplied HUD model', () => {
    render(<Hud />)

    const lifePanel = screen.getByRole('region', { name: 'Life support reserves' })
    expect(lifePanel.contains(screen.getByTestId('vital-oxygen'))).toBe(true)
    expect(lifePanel.contains(screen.getByTestId('vital-water'))).toBe(true)
    expect(lifePanel.contains(screen.getByTestId('vital-food'))).toBe(true)

    const timePanel = screen.getByRole('region', { name: 'Game clock' })
    expect(timePanel.contains(screen.getByRole('button', { name: 'Pause' }))).toBe(true)
    expect(timePanel.contains(screen.getByRole('group', { name: 'Game speed controls' }))).toBe(
      true,
    )

    expect(screen.getByRole('region', { name: 'Materials and energy' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Crew' })).toBeDefined()
  })

  it('the pause and speed buttons change the game speed', async () => {
    render(<Hud />)
    await userEvent.click(screen.getByRole('button', { name: '4x speed' }))
    expect(useGameStore.getState().speed).toBe(4)
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(useGameStore.getState().speed).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(useGameStore.getState().speed).toBe(1)
  })

  // US1 (Dev B) — constitution II.2, II.8, principle VII (T010)
  it('a vital bar flashes when it holds less than one season of crew needs', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          stock: {
            ...g.stock,
            oxygen: 2, // Less than 4 U (1 season need for 4 crew)
          },
        },
      })
    })

    render(<Hud />)
    const oxygenBar = screen.getByTestId('vital-oxygen')
    expect(oxygenBar.className).toContain('low')
  })

  it('lists the vital bars in the order food, water, oxygen', () => {
    render(<Hud />)
    const ids = ['food', 'water', 'oxygen'].map((id) => screen.getByTestId(`vital-${id}`))
    expect(ids[0]!.compareDocumentPosition(ids[1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ids[1]!.compareDocumentPosition(ids[2]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // US1 (Dev B) — constitution II.7, principle VII (T011)
  it('the power meter turns red when the balance is negative', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          power: {
            ...g.power,
            productionKw: 10,
            demandKw: 16,
            balanceKw: -6,
          },
        },
      })
    })

    render(<Hud />)
    const power = screen.getByTestId('power')
    expect(power.textContent).toContain('-6 kW')
    expect(power.className).toContain('deficit')
  })

  // US1 (Dev B) — constitution II.4 (T012)
  it('the wallet shows hematite, regolith, iron, steel and repair parts', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: {
          ...g,
          stock: {
            ...g.stock,
            hematite: 50,
            regolith: 35,
            iron: 12,
            steel: 4,
            repair_parts: 8,
          },
        },
      })
    })

    render(<Hud />)
    const wallet = screen.getByTestId('wallet')
    expect(wallet.textContent).toContain('50')
    expect(wallet.textContent).toContain('35')
    expect(wallet.textContent).toContain('12')
    expect(wallet.textContent).toContain('4')
    expect(wallet.textContent).toContain('8')
  })

  // US1 (Dev B) — constitution II.9, principle VII (T013)
  it('the crew panel shows each astronaut and warns at 75% exposure', () => {
    act(() => {
      const g = useGameStore.getState().game!
      const updatedCrew = g.crew.map((a, i) =>
        i === 0 ? { ...a, exposure: 0.8, location: 'outside' as const } : a,
      )
      useGameStore.setState({
        game: {
          ...g,
          crew: updatedCrew,
        },
      })
    })

    render(<Hud />)
    const crewPanel = screen.getByTestId('crew-panel')
    expect(crewPanel).toBeDefined()
    // Should display all 4 astronauts
    const members = screen.getAllByTestId(/^crew-member-/)
    expect(members).toHaveLength(4)

    // The astronaut with 0.8 exposure should have warning indicator
    const exposedAstronaut = screen.getByTestId(
      `crew-member-${useGameStore.getState().game!.crew[0].id}`,
    )
    expect(exposedAstronaut.className).toContain('warning')
  })

  // Playtest 2026-11-15: the player could not tell whether the battery was storing energy.
  describe('battery charge', () => {
    const bank = config.structures.find((s) => s.power.kind === 'storage')!
    const capacity = bank.power.kind === 'storage' ? bank.power.capacityEu : 0
    function withBattery(batteryEu: number, balanceKw: number) {
      act(() => {
        const g = useGameStore.getState().game!
        const site = { id: 'b1', type: bank.id, tile: [10, 10] as [number, number] }
        useGameStore.setState({
          game: {
            ...g,
            batteryEu,
            structures: [...g.structures, { ...site, status: 'active', upgrades: [] }],
            power: { ...g.power, balanceKw },
          },
        })
      })
    }

    it('shows the battery charge next to power and says when it is charging', () => {
      withBattery(capacity / 2, 3)
      render(<Hud />)
      const battery = screen.getByTestId('battery')
      const bar = within(battery).getByRole('progressbar')
      expect(bar.getAttribute('aria-valuenow')).toBe(String(capacity / 2))
      expect(bar.getAttribute('aria-valuemax')).toBe(String(capacity))
      expect(battery.textContent).toContain('50%')
      expect(battery.textContent).toContain('Charging')
    })

    it('says the battery is in use when the base draws more than it makes', () => {
      withBattery(capacity / 2, -3)
      render(<Hud />)
      expect(screen.getByTestId('battery').textContent).toContain('In use')
    })

    it('marks the charge at which switched-off machines come back', () => {
      withBattery(0, 3)
      render(<Hud />)
      const mark = screen.getByTestId('battery-restore-mark')
      expect(mark.style.left).toBe(`${config.mission.batteryRestoreShare * 100}%`)
    })

    it('says there is no battery yet when the base has no battery bank', () => {
      render(<Hud />)
      expect(screen.getByTestId('battery').textContent).toContain('No battery')
    })
  })

  // Playtest 2026-11-15: in winter the HUD said "+0 kW" in green with every machine switched off.
  describe('honest warnings', () => {
    function setGame(patch: (g: GameState) => Partial<GameState>) {
      act(() => {
        const g = useGameStore.getState().game!
        useGameStore.setState({ game: { ...g, ...patch(g) } })
      })
    }

    it('power is short when the brownout switched machines off, even with a balance of 0', () => {
      setGame((g) => ({ power: { ...g.power, balanceKw: 0, shed: ['mine', 'ice_melter'] } }))
      render(<Hud />)
      const power = screen.getByTestId('power')
      expect(power.className).toContain('deficit')
      expect(power.textContent).toContain('2 off')
      expect(screen.getByRole('status').textContent).toContain('power deficit')
    })

    it('power is fine when nothing is switched off and the balance is not negative', () => {
      render(<Hud />)
      const power = screen.getByTestId('power')
      expect(power.className).not.toContain('deficit')
      expect(power.textContent).not.toContain('off')
    })

    it('warns in words when the habitat has no heating (principle VII)', () => {
      setGame((g) => ({ power: { ...g.power, balanceKw: -12, unheated: true } }))
      render(<Hud />)
      expect(screen.getByRole('alert').textContent).toContain('no heating')
    })

    it('shows no heating alert while the habitat is heated', () => {
      render(<Hud />)
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('names the weather event that is active, and nothing when the sky is calm', () => {
      render(<Hud />)
      expect(screen.queryByTestId('weather')).toBeNull()
      const rule = config.events.find((e) => e.kind === 'dust_storm')!
      setGame(() => ({
        activeEvents: [
          {
            id: 'e1',
            ruleId: rule.id,
            kind: rule.kind,
            endsAt: 999,
            solarFactor: 0.6,
            blocksExternalJobs: false,
          },
        ],
      }))
      expect(screen.getByTestId('weather').textContent).toContain(rule.name.en)
    })

    it('an astronaut inside is "Inside", not "Sheltered": only a radiation shelter shelters', () => {
      render(<Hud />)
      const member = screen.getByTestId(`crew-member-${useGameStore.getState().game!.crew[0].id}`)
      expect(member.getAttribute('title')).toContain('Inside')
      expect(member.getAttribute('title')).not.toContain('Sheltered')
    })

    it('an astronaut inside who is still above the level to go out again is "Recovering"', () => {
      const { warnAt, resumeAt } = config.mission.exposure
      setGame((g) => ({
        crew: g.crew.map((a, i) => ({ ...a, exposure: i === 0 ? (warnAt + resumeAt) / 2 : 0 })),
      }))
      render(<Hud />)
      const [first, second] = useGameStore.getState().game!.crew
      const recovering = screen.getByTestId(`crew-member-${first.id}`)
      expect(recovering.textContent).toContain('Recovering')
      expect(recovering.getAttribute('title')).toContain('Recovering')
      expect(screen.getByTestId(`crew-member-${second.id}`).textContent).not.toContain('Recovering')
    })

    it('warns about exposure at the level set in the mission config, not a fixed one', () => {
      const { warnAt } = config.mission.exposure
      setGame((g) => ({
        crew: g.crew.map((a, i) => ({ ...a, exposure: i === 0 ? warnAt : warnAt - 0.01 })),
      }))
      render(<Hud />)
      const [first, second] = useGameStore.getState().game!.crew
      expect(screen.getByTestId(`crew-member-${first.id}`).className).toContain('warning')
      expect(screen.getByTestId(`crew-member-${second.id}`).className).not.toContain('warning')
    })
  })
})
