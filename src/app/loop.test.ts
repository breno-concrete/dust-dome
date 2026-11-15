import { describe, expect, it } from 'vitest'
import { MAX_REAL_STEP_SECONDS, realStep } from './loop'

// The loop turns real time into the seconds passed to the store (constitution VI).
describe('realStep', () => {
  it('passes the real time between two loop calls, in seconds', () => {
    expect(realStep(1000, 1250)).toBeCloseTo(0.25)
  })

  it('caps a long gap (a hidden tab, a frozen laptop) so the mission does not jump ahead', () => {
    // A hidden tab runs the timer about once a minute: at 4x that would be 4 game minutes at
    // once, and the crew could die before the player sees any warning.
    expect(realStep(0, 60_000)).toBe(MAX_REAL_STEP_SECONDS)
    expect(MAX_REAL_STEP_SECONDS).toBeLessThanOrEqual(1)
  })

  it('never goes backwards', () => {
    expect(realStep(2000, 1000)).toBe(0)
  })
})
