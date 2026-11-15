// US4 (Dev A), T020: pure debrief helpers. Contract: specs/002-events-data/contracts/debrief-sources.md.
// Values come from the config, never from fixed balance numbers.
import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { LOSS_CAUSES, type SeasonId } from '../../config/schema'
import type { LogEntry, LogKind, StructureInstance } from '../../engine/types'
import { buildDebrief, donkiCitation, lossCount, type DebriefLine } from './debrief'

/** A real record of src/data/snapshots/2024-05.json. */
const DONKI_URL = 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1'
const DONKI_ID = '30609'

const SEASONS = config.seasons.seasons.map((s) => s.id)
const FIRST = SEASONS[0]
const SECOND = SEASONS[1]

const dustDevil = config.events.find((r) => r.kind === 'dust_devil')!
const solarType = config.structures.find((s) => s.power.kind === 'solar')!.id

function seasonStart(cycle: number, season: SeasonId, at = 0): LogEntry {
  return { at, cycle, season, kind: 'season_start', ref: season }
}
function death(cause: string, cycle = 1, season: SeasonId = FIRST, ref = 'a1', at = 10): LogEntry {
  return { at, cycle, season, kind: 'death', ref, cause }
}
function hit(
  kind: 'damaged' | 'clogged' | 'short_circuit',
  ref: string,
  cause: string,
  cycle = 1,
  season: SeasonId = FIRST,
): LogEntry {
  return { at: 20, cycle, season, kind, ref, cause }
}
function storm(ref: string, cycle = 1, season: SeasonId = FIRST): LogEntry {
  return { at: 30, cycle, season, kind: 'radiation_storm', ref, cause: 'radiation_storm' }
}
function structure(id: string, type: string): StructureInstance {
  return { id, type, tile: [0, 0], status: 'active', upgrades: [] }
}

/** Every season of every cycle, in mission order. */
function fullMission(): LogEntry[] {
  const log: LogEntry[] = []
  for (let cycle = 1; cycle <= config.seasons.cycles; cycle++)
    for (const season of SEASONS) log.push(seasonStart(cycle, season, log.length))
  return log
}

function lines(log: LogEntry[], structures: StructureInstance[] = []): DebriefLine[] {
  return buildDebrief(log, structures, config).flatMap((s) => s.lines)
}

describe('donkiCitation: the two meanings of a radiation_storm ref', () => {
  it('reads an https DONKI link as a citation with the id from the end of the URL', () => {
    expect(donkiCitation(DONKI_URL)).toEqual({ url: DONKI_URL, id: DONKI_ID })
  })

  it('never turns the plain word radiation_storm into a citation', () => {
    expect(donkiCitation('radiation_storm')).toBeNull()
  })

  it('rejects anything that is not an https link', () => {
    expect(donkiCitation('')).toBeNull()
    expect(donkiCitation('http://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1')).toBeNull()
    expect(donkiCitation('javascript:alert(1)')).toBeNull()
  })
})

describe('buildDebrief: one section per season reached', () => {
  it('creates a section for each season_start, in mission order', () => {
    const log = [seasonStart(1, FIRST), seasonStart(1, SECOND, 100), seasonStart(2, FIRST, 200)]
    const sections = buildDebrief(log, [], config)
    expect(sections.map((s) => [s.cycle, s.season])).toEqual([
      [1, FIRST],
      [1, SECOND],
      [2, FIRST],
    ])
  })

  it('never creates a section for a season the mission did not reach', () => {
    const sections = buildDebrief([seasonStart(1, FIRST)], [], config)
    expect(sections).toHaveLength(1)
  })

  it("lists as the season's weather exactly the events.json rules of that cycle and season", () => {
    const sections = buildDebrief(fullMission(), [], config)
    expect(sections).toHaveLength(config.seasons.cycles * SEASONS.length)
    for (const s of sections) {
      const expected = config.events
        .filter((r) => r.cycles.includes(s.cycle) && r.season === s.season)
        .map((r) => r.id)
      expect(s.weather.map((r) => r.id)).toEqual(expected)
    }
  })

  it('puts each log entry in the section of its own cycle and season', () => {
    const log = [seasonStart(1, FIRST), seasonStart(1, SECOND, 100), death('cold', 1, SECOND)]
    const [first, second] = buildDebrief(log, [], config)
    expect(first.lines).toEqual([])
    expect(second.lines).toHaveLength(1)
  })

  it('does not mutate the log it reads', () => {
    const log = Object.freeze([seasonStart(1, FIRST), death('cold')].map((e) => Object.freeze(e)))
    expect(() => buildDebrief(log, [], config)).not.toThrow()
    expect(buildDebrief(log, [], config)).toHaveLength(1)
  })
})

describe('buildDebrief: crew deaths', () => {
  it('explains every loss cause with the narrator debrief text', () => {
    for (const cause of LOSS_CAUSES) {
      const [line] = lines([seasonStart(1, FIRST), death(cause)])
      expect(line).toEqual({
        kind: 'death',
        cause,
        count: 1,
        explain: config.narrator.debrief.causes[cause],
      })
    }
  })

  it('joins deaths with the same cause in the same season into one line with the count', () => {
    const log = [
      seasonStart(1, FIRST),
      death('radiation_storm', 1, FIRST, 'a1'),
      death('radiation_storm', 1, FIRST, 'a2', 11),
      death('radiation_storm', 1, FIRST, 'a3', 12),
    ]
    expect(lines(log)).toEqual([expect.objectContaining({ kind: 'death', count: 3 })])
  })

  it('keeps different causes on different lines', () => {
    const log = [
      seasonStart(1, FIRST),
      death('cold', 1, FIRST, 'a1'),
      death('empty_food', 1, FIRST, 'a2'),
    ]
    const deaths = lines(log).filter((l) => l.kind === 'death')
    expect(deaths.map((l) => l.kind === 'death' && [l.cause, l.count])).toEqual([
      ['cold', 1],
      ['empty_food', 1],
    ])
  })

  it('keeps the same cause in different seasons in different sections', () => {
    const log = [
      seasonStart(1, FIRST),
      death('empty_water', 1, FIRST, 'a1'),
      seasonStart(1, SECOND, 100),
      death('empty_water', 1, SECOND, 'a2', 110),
    ]
    const sections = buildDebrief(log, [], config)
    expect(sections.map((s) => s.lines.length)).toEqual([1, 1])
  })

  it('still counts a death with an unknown cause, without inventing an explanation', () => {
    const [line] = lines([seasonStart(1, FIRST), death('not_a_cause')])
    expect(line).toEqual({ kind: 'death', cause: 'not_a_cause', count: 1, explain: null })
  })
})

describe('buildDebrief: structures hit by events', () => {
  it('groups hits by rule, status and structure type, with the count', () => {
    const structures = [structure('s7', solarType), structure('s8', solarType)]
    const log = [
      seasonStart(1, FIRST),
      hit('damaged', 's7', dustDevil.id),
      hit('damaged', 's8', dustDevil.id),
    ]
    expect(lines(log, structures)).toEqual([
      {
        kind: 'structure',
        status: 'damaged',
        ruleId: dustDevil.id,
        structureType: solarType,
        count: 2,
        rule: dustDevil,
      },
    ])
  })

  it('takes the type from game.structures, because the ref is only an id like s5', () => {
    const [line] = lines(
      [seasonStart(1, FIRST), hit('damaged', 's5', dustDevil.id)],
      [structure('s5', solarType)],
    )
    expect(line).toMatchObject({ kind: 'structure', structureType: solarType })
  })

  it('uses a null type for a structure that no longer exists (demolished later)', () => {
    const [line] = lines([seasonStart(1, FIRST), hit('damaged', 's99', dustDevil.id)], [])
    expect(line).toMatchObject({ kind: 'structure', structureType: null, count: 1 })
  })

  it('keeps different statuses of the same rule on different lines', () => {
    const structures = [structure('s1', solarType), structure('s2', solarType)]
    const log = [
      seasonStart(1, FIRST),
      hit('clogged', 's1', dustDevil.id),
      hit('short_circuit', 's2', dustDevil.id),
    ]
    expect(lines(log, structures).map((l) => l.kind === 'structure' && l.status)).toEqual([
      'clogged',
      'short_circuit',
    ])
  })

  it('finds the events.json rule for every rule id used as a cause (cause = rule id)', () => {
    for (const rule of config.events) {
      const [line] = lines(
        [seasonStart(1, FIRST), hit('damaged', 's1', rule.id)],
        [structure('s1', solarType)],
      )
      expect(line).toMatchObject({ kind: 'structure', ruleId: rule.id, rule })
    }
  })

  it('keeps a hit whose cause matches no rule, with a null rule instead of crashing', () => {
    const [line] = lines(
      [seasonStart(1, FIRST), hit('damaged', 's1', 'no_such_rule')],
      [structure('s1', solarType)],
    )
    expect(line).toMatchObject({ kind: 'structure', ruleId: 'no_such_rule', rule: null })
  })

  it('never invents a hit from the final structure status', () => {
    const broken = { ...structure('s1', solarType), status: 'damaged' as const }
    const sections = buildDebrief([seasonStart(1, FIRST)], [broken], config)
    expect(sections).toHaveLength(1)
    expect(sections[0].lines).toEqual([])
  })
})

describe('buildDebrief: radiation storm and ignored entries', () => {
  it('shows a storm with a DONKI link as an event with its citation', () => {
    expect(lines([seasonStart(1, FIRST), storm(DONKI_URL)])).toEqual([
      { kind: 'radiation_storm', citation: { url: DONKI_URL, id: DONKI_ID } },
    ])
  })

  it('shows a storm without a DONKI event with a null citation', () => {
    expect(lines([seasonStart(1, FIRST), storm('radiation_storm')])).toEqual([
      { kind: 'radiation_storm', citation: null },
    ])
  })

  it('leaves out entries that are not losses or events (built, repairs, power shed...)', () => {
    const quiet: LogKind[] = [
      'built',
      'upgrade_installed',
      'repaired',
      'cleaned',
      'demolished',
      'power_shed',
    ]
    const log = [
      seasonStart(1, FIRST),
      ...quiet.map((kind, i) => ({ at: i, cycle: 1, season: FIRST, kind, ref: 's1' })),
      death('cold'),
    ]
    const sections = buildDebrief(log, [structure('s1', solarType)], config)
    expect(sections[0].lines.map((l) => l.kind)).toEqual(['death'])
  })
})

describe('lossCount: events are never losses (SC-005)', () => {
  it('a radiation storm without deaths is an event, not a loss', () => {
    const sections = buildDebrief([seasonStart(1, FIRST), storm(DONKI_URL)], [], config)
    expect(sections[0].lines).toEqual([expect.objectContaining({ kind: 'radiation_storm' })])
    expect(lossCount(sections)).toBe(0)
  })

  it('counts 100% of the deaths in the log, and nothing else', () => {
    const log = [
      seasonStart(1, FIRST),
      storm(DONKI_URL),
      death('radiation_storm', 1, FIRST, 'a1'),
      death('radiation_storm', 1, FIRST, 'a2'),
      hit('damaged', 's1', dustDevil.id),
      seasonStart(1, SECOND, 100),
      death('empty_oxygen', 1, SECOND, 'a3', 120),
      seasonStart(2, FIRST, 200),
      death('cold', 2, FIRST, 'a4', 210),
    ]
    const deaths = log.filter((e) => e.kind === 'death').length
    expect(lossCount(buildDebrief(log, [structure('s1', solarType)], config))).toBe(deaths)
  })
})
