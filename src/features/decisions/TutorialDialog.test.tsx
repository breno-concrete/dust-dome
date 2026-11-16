// @vitest-environment jsdom
// Commander Vega's tutorial: shown at the start of a new game, before the first briefing.
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { useLang } from '../../ui-kit/i18n'
import { BriefingDialog } from './BriefingDialog'
import { TUTORIAL_STEPS } from './tutorial'

const firstSeason = config.seasons.seasons[0]!.id
const READ_STEPS = TUTORIAL_STEPS.filter((s) => s.kind === 'read')
const springBriefing = config.narrator.briefings['1']![firstSeason].text.en

const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

/** Reads through every "read" step before the first "do" step. */
async function readIntro() {
  const intro = TUTORIAL_STEPS.findIndex((s) => s.kind === 'do')
  for (let i = 0; i < intro; i++) await next()
}

function addSolarPanel() {
  act(() => {
    const g = useGameStore.getState().game!
    const base = g.structures.find((s) => s.type === 'solar_panel')!
    useGameStore.setState({
      // Like placeAt: the panel is on the ground and the placement is over.
      placing: null,
      game: {
        ...g,
        structures: [...g.structures, { ...base, id: 'tutorial-panel', status: 'building' }],
      },
    })
  })
}

const textOf = (check: string) => TUTORIAL_STEPS.find((s) => s.check === check)!.text.en
const outro = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1]!

/** Does the first three "do it" steps the way a player does: pick, place, select a machine. */
async function practiceUntilSwitch() {
  render(<BriefingDialog />)
  await readIntro()
  act(() => useGameStore.getState().beginPlacement('solar_panel'))
  addSolarPanel()
  act(() =>
    useGameStore.getState().selectStructure(useGameStore.getState().game!.structures[0]!.id),
  )
  expect(await screen.findByText(textOf('switch'))).toBeDefined()
}

describe('Tutorial', () => {
  beforeEach(() => {
    act(() => useGameStore.getState().start(42))
    useLang.setState({ lang: 'en' })
  })
  afterEach(cleanup)

  it('opens before the first season briefing, spoken by Commander Vega', () => {
    render(<BriefingDialog />)
    expect(screen.getByText('Commander Vega')).toBeDefined()
    expect(screen.getByText(TUTORIAL_STEPS[0]!.text.en)).toBeDefined()
    expect(screen.queryByText(springBriefing)).toBeNull()
  })

  it('keeps the game paused: the briefing is still waiting', () => {
    render(<BriefingDialog />)
    expect(useGameStore.getState().game!.briefing).not.toBeNull()
  })

  it('does not show up in later seasons or after the game has started', () => {
    act(() => {
      const g = useGameStore.getState().game!
      useGameStore.setState({
        game: { ...g, time: { ...g.time, elapsed: 90 }, briefing: { cycle: 1, season: 'summer' } },
      })
    })
    render(<BriefingDialog />)
    expect(screen.queryByText(TUTORIAL_STEPS[0]!.text.en)).toBeNull()
    expect(screen.getByText(config.narrator.briefings['1']!.summer.text.en)).toBeDefined()
  })

  it('names the chapter in the dialog title, and changes it with the chapter', async () => {
    render(<BriefingDialog />)
    expect(screen.getByRole('dialog', { name: TUTORIAL_STEPS[0]!.chapter.en })).toBeDefined()
    const other = TUTORIAL_STEPS.findIndex((s) => s.chapter.en !== TUTORIAL_STEPS[0]!.chapter.en)
    for (let i = 0; i < other; i++) await next()
    expect(screen.getByRole('dialog', { name: TUTORIAL_STEPS[other]!.chapter.en })).toBeDefined()
  })

  it('shows where the player is: step 1 of N', () => {
    render(<BriefingDialog />)
    expect(screen.getByText(`1 / ${TUTORIAL_STEPS.length}`)).toBeDefined()
  })

  it('goes forward and back through the reading steps', async () => {
    render(<BriefingDialog />)
    await next()
    expect(screen.getByText(TUTORIAL_STEPS[1]!.text.en)).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText(TUTORIAL_STEPS[0]!.text.en)).toBeDefined()
  })

  it('has no Back on the first step', () => {
    render(<BriefingDialog />)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('Skip tutorial goes straight to the season briefing', async () => {
    render(<BriefingDialog />)
    await userEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }))
    expect(screen.getByText(springBriefing)).toBeDefined()
    expect(screen.queryByText(TUTORIAL_STEPS[0]!.text.en)).toBeNull()
  })

  it('every reading step can be read, one after the other', async () => {
    render(<BriefingDialog />)
    const intro = TUTORIAL_STEPS.findIndex((s) => s.kind === 'do')
    for (let i = 0; i < intro; i++) {
      expect(screen.getByText(READ_STEPS[i]!.text.en)).toBeDefined()
      await next()
    }
  })

  describe('the "do it" steps', () => {
    it('wait for the player: Next is not offered until the action is done', async () => {
      render(<BriefingDialog />)
      await readIntro()
      expect(
        screen.getByText(TUTORIAL_STEPS.find((s) => s.check === 'pick')!.text.en),
      ).toBeDefined()
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    })

    it('do not hide the game: the player can still click on it', async () => {
      render(<BriefingDialog />)
      await readIntro()
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('move on by themselves when the player does the action', async () => {
      render(<BriefingDialog />)
      await readIntro()
      act(() => useGameStore.getState().beginPlacement('solar_panel'))
      expect(
        await screen.findByText(TUTORIAL_STEPS.find((s) => s.check === 'place')!.text.en),
      ).toBeDefined()
      addSolarPanel()
      expect(
        await screen.findByText(TUTORIAL_STEPS.find((s) => s.check === 'select')!.text.en),
      ).toBeDefined()
      act(() =>
        useGameStore.getState().selectStructure(useGameStore.getState().game!.structures[0]!.id),
      )
      expect(
        await screen.findByText(TUTORIAL_STEPS.find((s) => s.check === 'switch')!.text.en),
      ).toBeDefined()
    })

    // Playtest 2026-11-15: any click outside the machine's panel closes it, and the tutorial went
    // back a step. "Start" on the last step closed the panel too, so the tutorial never ended.
    it('a finished step stays finished when the machine panel closes', async () => {
      await practiceUntilSwitch()
      act(() => useGameStore.getState().selectStructure(null))
      expect(screen.getByText(textOf('switch'))).toBeDefined()
      expect(screen.queryByText(textOf('select'))).toBeNull()
    })

    it('Start on the last step ends the tutorial even if the machine panel closed', async () => {
      await practiceUntilSwitch()
      const type = config.structures.find((s) => s.switchable)!.id
      act(() => useGameStore.getState().setPowerMode(type, 'off'))
      expect(await screen.findByText(outro.text.en)).toBeDefined()
      act(() => useGameStore.getState().selectStructure(null))
      expect(screen.getByText(outro.text.en)).toBeDefined()
      await userEvent.click(screen.getByRole('button', { name: 'Start' }))
      expect(screen.getByText(springBriefing)).toBeDefined()
    })

    it('goes back to "pick a panel" when the placement is cancelled before placing', async () => {
      render(<BriefingDialog />)
      await readIntro()
      act(() => useGameStore.getState().beginPlacement('solar_panel'))
      expect(await screen.findByText(textOf('place'))).toBeDefined()
      act(() => useGameStore.getState().beginPlacement(null))
      expect(await screen.findByText(textOf('pick'))).toBeDefined()
    })

    it('can be skipped one by one, so nobody gets stuck', async () => {
      render(<BriefingDialog />)
      await readIntro()
      const doSteps = TUTORIAL_STEPS.filter((s) => s.kind === 'do')
      for (const step of doSteps) {
        expect(screen.getByText(step.text.en)).toBeDefined()
        await userEvent.click(screen.getByRole('button', { name: 'Skip this step' }))
      }
      const outro = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1]!
      expect(screen.getByText(outro.text.en)).toBeDefined()
    })

    it('Skip tutorial also works here', async () => {
      render(<BriefingDialog />)
      await readIntro()
      await userEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }))
      expect(screen.getByText(springBriefing)).toBeDefined()
    })
  })

  it('ends with the season briefing, still paused until the player starts the season', async () => {
    render(<BriefingDialog />)
    await readIntro()
    for (const _ of TUTORIAL_STEPS.filter((s) => s.kind === 'do')) {
      await userEvent.click(screen.getByRole('button', { name: 'Skip this step' }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText(springBriefing)).toBeDefined()
    expect(useGameStore.getState().game!.briefing).not.toBeNull()
  })

  it('speaks Portuguese when the language is switched', async () => {
    useLang.setState({ lang: 'pt' })
    render(<BriefingDialog />)
    expect(screen.getByText('Comandante Vega')).toBeDefined()
    expect(screen.getByText(TUTORIAL_STEPS[0]!.text.pt!)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Pular tutorial' })).toBeDefined()
  })

  it('starts again in the next game', () => {
    const { unmount } = render(<BriefingDialog />)
    unmount()
    act(() => useGameStore.getState().start(7))
    render(<BriefingDialog />)
    expect(screen.getByText(TUTORIAL_STEPS[0]!.text.en)).toBeDefined()
  })

  it('Back from the last step returns to the last reading step, not to a finished action', async () => {
    render(<BriefingDialog />)
    await readIntro()
    for (const _ of TUTORIAL_STEPS.filter((s) => s.kind === 'do')) {
      await userEvent.click(screen.getByRole('button', { name: 'Skip this step' }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    const lastRead = READ_STEPS[READ_STEPS.length - 2]!
    expect(screen.getByText(lastRead.text.en)).toBeDefined()
  })

  describe("Vega's portrait", () => {
    it('waves on the first step', () => {
      render(<BriefingDialog />)
      expect(screen.getByRole('img', { name: /waving/ })).toBeDefined()
    })

    it('looks serious when she talks about the dangers', async () => {
      render(<BriefingDialog />)
      const hazards = TUTORIAL_STEPS.findIndex((s) => s.mood === 'warning')
      for (let i = 0; i < hazards; i++) await next()
      expect(screen.getByText(TUTORIAL_STEPS[hazards]!.text.en)).toBeDefined()
      expect(screen.getByRole('img', { name: /serious warning/ })).toBeDefined()
    })

    it('is also there while she waits for the player to act', async () => {
      render(<BriefingDialog />)
      await readIntro()
      expect(screen.getByRole('img', { name: /Commander Vega/ })).toBeDefined()
    })

    it('speaks Portuguese in the picture description too', () => {
      useLang.setState({ lang: 'pt' })
      render(<BriefingDialog />)
      expect(screen.getByRole('img', { name: /acenando/ })).toBeDefined()
    })
  })
})
