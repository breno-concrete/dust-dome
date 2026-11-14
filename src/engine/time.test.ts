import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { createGame } from './game'
import { gameAt } from './testState'
import { advanceTime, isMissionTimeOver, seasonStartedThisStep } from './time'

const seasons = config.seasons.seasons
const first = seasons[0]
const winter = seasons[seasons.length - 1]
const lastCycle = config.seasons.cycles

describe('advanceTime', () => {
  it('adds dt to the clock', () => {
    const s = advanceTime(createGame(config, 1), config, 2.5)
    expect(s.time.elapsed).toBe(2.5)
    expect(s.time.secondsIntoSeason).toBe(2.5)
  })

  // US1 (Breno) — constitution II.3
  it('moves to the next season when secondsIntoSeason reaches its duration, keeping the remainder', () => {
    const before = gameAt(config, 1, first.id, first.durationSeconds - 1)
    const s = advanceTime(before, config, 3)
    expect(s.time.cycle).toBe(1)
    expect(s.time.season).toBe(seasons[1].id)
    expect(s.time.secondsIntoSeason).toBeCloseTo(2)
    expect(s.time.elapsed).toBeCloseTo(before.time.elapsed + 3)
  })

  it('moves from winter to spring of the next cycle', () => {
    const s = advanceTime(gameAt(config, 1, winter.id, winter.durationSeconds - 0.5), config, 1)
    expect(s.time.cycle).toBe(2)
    expect(s.time.season).toBe(first.id)
    expect(s.time.secondsIntoSeason).toBeCloseTo(0.5)
  })

  it('opens the commander briefing at every season start', () => {
    for (const [i, season] of seasons.entries()) {
      const next = seasons[(i + 1) % seasons.length]
      const cycle = i === seasons.length - 1 ? 2 : 1
      const s = advanceTime(gameAt(config, 1, season.id, season.durationSeconds - 1), config, 1)
      expect(s.briefing).toEqual({ cycle, season: next.id })
      expect(s.log.at(-1)).toMatchObject({
        kind: 'season_start',
        cycle,
        season: next.id,
        ref: next.id,
      })
      expect(s.log.at(-1)?.at).toBeCloseTo(s.time.elapsed - s.time.secondsIntoSeason)
    }
  })

  it('stops advancing after winter of the last cycle', () => {
    const before = gameAt(config, lastCycle, winter.id, winter.durationSeconds - 1)
    expect(isMissionTimeOver(before, config)).toBe(false)
    const s = advanceTime(before, config, 5)
    expect(s.time.cycle).toBe(lastCycle)
    expect(s.time.season).toBe(winter.id)
    expect(s.time.secondsIntoSeason).toBe(winter.durationSeconds)
    expect(s.time.elapsed).toBeCloseTo(before.time.elapsed + 1)
    expect(s.briefing).toBeNull()
    expect(isMissionTimeOver(s, config)).toBe(true)
  })

  it('seasonStartedThisStep is true only in the step where the season changed', () => {
    const before = gameAt(config, 1, first.id, first.durationSeconds - 1.5)
    const a = advanceTime(before, config, 1)
    expect(seasonStartedThisStep(a, 1)).toBe(false)
    const b = advanceTime(a, config, 1)
    expect(b.time.season).toBe(seasons[1].id)
    expect(seasonStartedThisStep(b, 1)).toBe(true)
    const c = advanceTime({ ...b, briefing: null }, config, 1)
    expect(seasonStartedThisStep(c, 1)).toBe(false)
  })

  it('the clock reaches the same season and time whether advanced in 1 s or 0.25 s steps', () => {
    const start = gameAt(config, 1, first.id)
    const total = first.durationSeconds + 10
    let a = start
    for (let i = 0; i < total; i++) a = advanceTime(a, config, 1)
    let b = start
    for (let i = 0; i < total * 4; i++) b = advanceTime(b, config, 0.25)
    expect(b.time.cycle).toBe(a.time.cycle)
    expect(b.time.season).toBe(a.time.season)
    expect(b.time.secondsIntoSeason).toBeCloseTo(a.time.secondsIntoSeason)
    expect(b.time.elapsed).toBeCloseTo(start.time.elapsed + total)
    expect(a.time.elapsed).toBeCloseTo(start.time.elapsed + total)
  })
})
