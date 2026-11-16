// The tutorial is data plus one pure rule (is a "do it" step finished?). The screen is tested
// in TutorialDialog.test.tsx.
import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { TUTORIAL_STEPS, fillNumbers, isStepDone, type StepContext } from './tutorial'
import { VEGA_MOODS } from './vegaMood'

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
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(18)
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
    for (const s of TUTORIAL_STEPS) expect(s.text.en.length, s.id).toBeLessThan(430)
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

  it('covers the whole game: goal, time, crew, materials, power, life support and dangers', () => {
    const all = TUTORIAL_STEPS.map((s) => s.text.en.toLowerCase()).join(' ')
    for (const word of [
      'oxygen',
      'water',
      'food',
      'season',
      'astronaut',
      'radiation',
      'hematite',
      'regolith',
      'iron',
      'steel',
      'power',
      'battery',
      'repair',
      'insulation',
      'shelter',
    ]) {
      expect(all, word).toContain(word)
    }
  })

  it('groups the steps into chapters that follow each other', () => {
    const chapters: string[] = []
    for (const s of TUTORIAL_STEPS) {
      expect((s.chapter.pt ?? '').length, s.id).toBeGreaterThan(2)
      if (chapters[chapters.length - 1] !== s.chapter.en) chapters.push(s.chapter.en)
    }
    // a chapter never comes back later
    expect(new Set(chapters).size).toBe(chapters.length)
    expect(chapters.length).toBeGreaterThanOrEqual(6)
  })

  describe('what Vega says matches the real rules in the config', () => {
    const say = (id: string) => TUTORIAL_STEPS.find((s) => s.id === id)!.text.en
    const people = config.mission.colonists + config.mission.crew
    const habitat = config.structures.find((s) => s.id === 'habitat')!

    it('goal: how many people the reserves must cover and how many habitat modules', () => {
      const text = say('goal')
      expect(text).toContain(String(people))
      expect(text).toContain(String(people / (habitat.capacity ?? 1)))
      expect(text).toContain(String(config.mission.colonists))
    })

    it('years: the year length is the sum of the four seasons', () => {
      const minutes = config.seasons.seasons.reduce((n, s) => n + s.durationSeconds, 0) / 60
      expect(say('year')).toContain(`${minutes} minutes`)
    })

    it('crew: the radiation level where astronauts stop working', () => {
      expect(say('radiation')).toContain(`${Math.round(config.mission.exposure.warnAt * 100)}%`)
    })

    it('empty reserves: the grace period before someone is lost', () => {
      expect(say('empty')).toContain(`${config.mission.emptyReserve.graceSeconds} seconds`)
    })

    it('repairs: how many repair parts a repair costs', () => {
      expect(say('dust')).toContain(`${config.mission.repair.parts} repair parts`)
    })

    it('cold: the year when the insulation becomes a must', () => {
      expect(say('cold')).toContain(`year ${config.mission.insulationRequiredFromCycle}`)
    })

    it('solar storms: the first year and the seconds of warning', () => {
      const text = say('storm')
      expect(text).toContain(`year ${config.mission.radiationStorm.fromCycle}`)
      expect(text).toContain(`${config.mission.radiationStorm.warningSeconds} seconds`)
    })
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

// Playtest 2026-11-15: the numbers Vega says were typed into the texts, so a balance change in
// the config (like the price of the workshop) left the tutorial telling the old rule.
describe('the numbers Vega says come from the config', () => {
  const { mission } = config

  it('fillNumbers puts the config values in place of the {names}', () => {
    expect(fillNumbers('{parts} parts, {warnAt}%, {alarm} s, {grace} s, year {stormCycle}')).toBe(
      `${mission.repair.parts} parts, ${mission.exposure.warnAt * 100}%, ` +
        `${mission.radiationStorm.warningSeconds} s, ${mission.emptyReserve.graceSeconds} s, ` +
        `year ${mission.radiationStorm.fromCycle}`,
    )
    expect(fillNumbers('{crew} + {colonists} = {people}')).toBe(
      `${mission.crew} + ${mission.colonists} = ${mission.crew + mission.colonists}`,
    )
  })

  it('leaves an unknown {name} alone, so a typo shows in the text review', () => {
    expect(fillNumbers('{no_such_number}')).toBe('{no_such_number}')
  })

  it('no step is left with a {name} to fill, in either language', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(s.text.en, s.id).not.toMatch(/[{}]/)
      expect(s.text.pt, s.id).not.toMatch(/[{}]/)
    }
  })

  it('the steps say the real rules', () => {
    const text = (id: string) => TUTORIAL_STEPS.find((s) => s.id === id)!.text
    expect(text('dust').en).toContain(`${mission.repair.parts} repair parts`)
    expect(text('dust').pt).toContain(`${mission.repair.parts} peças de reparo`)
    expect(text('radiation').en).toContain(`${mission.exposure.warnAt * 100}%`)
    expect(text('storm').en).toContain(`${mission.radiationStorm.warningSeconds} seconds`)
    expect(text('empty').en).toContain(`${mission.emptyReserve.graceSeconds} seconds`)
    expect(text('welcome').en).toContain(`${mission.colonists} colonists`)
  })
})
