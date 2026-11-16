// @vitest-environment jsdom
// Playtest 2026-11-15: an astronaut died and only their name got crossed out. The commander
// announces every loss when it happens, and explains the automatic return at 75% (II.9, II.12).
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { LogEntry } from '../../engine/types'
import { useLang } from '../../ui-kit/i18n'
import { VegaNotice } from './VegaNotice'

const crew = () => useGameStore.getState().game!.crew

function log(...entries: Pick<LogEntry, 'kind' | 'ref' | 'cause'>[]) {
  act(() => {
    const g = useGameStore.getState().game!
    const added = entries.map((e) => ({ at: 10, cycle: 1, season: 'spring' as const, ...e }))
    useGameStore.setState({ game: { ...g, log: [...g.log, ...added] } })
  })
}
const death = (index: number, cause: string) => ({
  kind: 'death' as const,
  ref: crew()[index]!.id,
  cause,
})
const notice = () => screen.getByTestId('vega-notice')

describe('VegaNotice', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('says nothing while nothing happened', () => {
    render(<VegaNotice />)
    expect(screen.queryByTestId('vega-notice')).toBeNull()
  })

  it('announces a loss when it happens, with the name and the reason', () => {
    render(<VegaNotice />)
    log(death(0, 'empty_food'))
    expect(notice().textContent).toContain(crew()[0]!.name)
    expect(notice().textContent).toContain(config.narrator.lossMessages.empty_food.en)
    expect(screen.getByText('Commander Vega')).toBeDefined()
  })

  it('names everyone lost for the same reason in one message', () => {
    render(<VegaNotice />)
    log(death(0, 'radiation_storm'), death(1, 'radiation_storm'))
    expect(notice().textContent).toContain(crew()[0]!.name)
    expect(notice().textContent).toContain(crew()[1]!.name)
    expect(screen.getAllByText(config.narrator.lossMessages.radiation_storm.en)).toHaveLength(1)
  })

  it('explains why an astronaut came back inside at the exposure limit', () => {
    render(<VegaNotice />)
    log({ kind: 'exposure_return', ref: crew()[2]!.id })
    expect(notice().textContent).toContain(crew()[2]!.name)
    expect(notice().textContent).toContain(config.narrator.exposureWarning.en)
  })

  it('stays until the player says OK, then shows the next thing that happened', async () => {
    render(<VegaNotice />)
    log({ kind: 'exposure_return', ref: crew()[0]!.id }, death(1, 'cold'))
    expect(notice().textContent).toContain(config.narrator.exposureWarning.en)

    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(notice().textContent).toContain(config.narrator.lossMessages.cold.en)

    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.queryByTestId('vega-notice')).toBeNull()
  })

  it('ignores the rest of the log (builds, repairs, power)', () => {
    render(<VegaNotice />)
    log({ kind: 'built', ref: 's1' }, { kind: 'power_shed', ref: 'mine' })
    expect(screen.queryByTestId('vega-notice')).toBeNull()
  })

  it('starts clean in a new game', () => {
    render(<VegaNotice />)
    log(death(0, 'empty_water'))
    expect(notice()).toBeDefined()
    act(() => useGameStore.getState().start(7))
    expect(screen.queryByTestId('vega-notice')).toBeNull()
  })

  it('speaks Portuguese when the language is switched', () => {
    useLang.setState({ lang: 'pt' })
    render(<VegaNotice />)
    log(death(0, 'empty_oxygen'))
    expect(notice().textContent).toContain(config.narrator.lossMessages.empty_oxygen.pt)
    expect(screen.getByText('Comandante Vega')).toBeDefined()
  })
})
