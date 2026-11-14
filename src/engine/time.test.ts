import { describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { createGame } from './game'
import { advanceTime } from './time'

describe('advanceTime', () => {
  it('adds dt to the clock', () => {
    const s = advanceTime(createGame(config, 1), config, 2.5)
    expect(s.time.elapsed).toBe(2.5)
    expect(s.time.secondsIntoSeason).toBe(2.5)
  })

  // US1 (Breno) — constitution II.3
  it.todo(
    'moves to the next season when secondsIntoSeason reaches its duration, keeping the remainder',
  )
  it.todo('moves from winter to spring of the next cycle')
  it.todo('opens the commander briefing at every season start')
  it.todo('stops advancing after winter of the last cycle')
})
