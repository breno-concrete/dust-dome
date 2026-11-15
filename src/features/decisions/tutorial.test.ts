// The tutorial is data plus one pure rule (is a "do it" step finished?). The screen is tested
// in TutorialDialog.test.tsx.
import { describe, expect, it } from 'vitest'
import { TUTORIAL_STEPS, isStepDone, type StepContext } from './tutorial'
import { VEGA_MOODS } from './vegaPortrait'

const ctx = (patch: Partial<StepContext> = {}): StepContext => ({
  placing: null,
  solarPanels: 1,
  solarPanelsAtStart: 1,
  selectedStructureId: null,
  powerModes: { mine: 'min' },
  powerModesAtStart: { mine: 'min' },
  ...patch,
})

describe('tutorial steps', () => {
  it('has unique ids and a complete tutorial', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(10)
  })

  it('every step has a Vega portrait mood that exists', () => {
    for (const s of TUTORIAL_STEPS) expect(VEGA_MOODS, s.id).toContain(s.mood)
    expect(TUTORIAL_STEPS[0]!.mood).toBe('welcome')
  })

  it('every step speaks English and Portuguese', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(s.text.en.length, s.id).toBeGreaterThan(20)
      expect((s.text.pt ?? '').length, s.id).toBeGreaterThan(20)
    }
  })

  it('keeps the steps short enough for kids', () => {
    for (const s of TUTORIAL_STEPS) expect(s.text.en.length, s.id).toBeLessThan(420)
  })

  it('first teaches by reading, then asks the player to act, then says goodbye', () => {
    const kinds = TUTORIAL_STEPS.map((s) => s.kind)
    const firstDo = kinds.indexOf('do')
    const lastDo = kinds.lastIndexOf('do')
    expect(firstDo).toBeGreaterThan(0)
    expect(kinds.slice(0, firstDo).every((k) => k === 'read')).toBe(true)
    expect(kinds.slice(firstDo, lastDo + 1).every((k) => k === 'do')).toBe(true)
    expect(kinds[kinds.length - 1]).toBe('read')
  })

  it('covers the whole game: goal, time, materials, power, crew and hazards', () => {
    const all = TUTORIAL_STEPS.map((s) => s.text.en.toLowerCase()).join(' ')
    for (const word of [
      'oxygen',
      'season',
      'regolith',
      'power',
      'radiation',
      'repair',
      'insulation',
    ]) {
      expect(all, word).toContain(word)
    }
  })

  it('only "do" steps wait for the player', () => {
    for (const s of TUTORIAL_STEPS) expect(s.kind === 'do', s.id).toBe(s.check !== undefined)
  })
})

describe('isStepDone', () => {
  it('"pick" is done when a solar panel is being placed', () => {
    expect(isStepDone('pick', ctx())).toBe(false)
    expect(isStepDone('pick', ctx({ placing: 'solar_panel' }))).toBe(true)
    expect(isStepDone('pick', ctx({ placing: 'mine' }))).toBe(false)
  })

  it('"pick" also counts when the panel is already placed', () => {
    expect(isStepDone('pick', ctx({ solarPanels: 2 }))).toBe(true)
  })

  it('"place" is done when there is one more solar panel than at the start', () => {
    expect(isStepDone('place', ctx())).toBe(false)
    expect(isStepDone('place', ctx({ solarPanels: 2 }))).toBe(true)
  })

  it('"select" is done when a structure is selected', () => {
    expect(isStepDone('select', ctx())).toBe(false)
    expect(isStepDone('select', ctx({ selectedStructureId: 's1' }))).toBe(true)
  })

  it('"switch" is done when any power switch changed', () => {
    expect(isStepDone('switch', ctx())).toBe(false)
    expect(isStepDone('switch', ctx({ powerModes: { mine: 'max' } }))).toBe(true)
  })
})
