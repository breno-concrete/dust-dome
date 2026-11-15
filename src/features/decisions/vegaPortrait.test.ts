import { describe, expect, it } from 'vitest'
import { framesForMood, moodForBriefing, VEGA_MOODS, type VegaMood } from './vegaPortrait'

describe('vegaPortrait', () => {
  it('picks distinct expressive moods across mission briefings', () => {
    expect(moodForBriefing(1, 'spring', false)).toBe('welcome')
    expect(moodForBriefing(1, 'summer', false)).toBe('neutral')
    expect(moodForBriefing(1, 'winter', false)).toBe('warning')
    expect(moodForBriefing(2, 'spring', false)).toBe('celebrating')
    expect(moodForBriefing(3, 'spring', true)).toBe('warning')
    expect(moodForBriefing(3, 'summer', false)).toBe('alert')
    expect(moodForBriefing(3, 'winter', false)).toBe('caring')
    expect(moodForBriefing(4, 'spring', false)).toBe('welcome')
    expect(moodForBriefing(4, 'summer', false)).toBe('alert')
  })

  it('switches to warning when an unexpected warning flag is present', () => {
    expect(moodForBriefing(1, 'summer', true)).toBe('warning')
    expect(moodForBriefing(3, 'summer', true)).toBe('alert')
  })

  it('provides non-empty ordered frame sequences with distinct final keyframes per mood', () => {
    const finalFrames = new Set<string>()
    for (const mood of VEGA_MOODS) {
      const frames = framesForMood(mood as VegaMood)
      expect(frames.length).toBeGreaterThanOrEqual(1)
      for (const frame of frames) {
        expect(frame).toMatch(/^\/narrator\/vega-/)
      }
      finalFrames.add(frames[frames.length - 1]!)
    }
    expect(finalFrames.size).toBe(VEGA_MOODS.length)
  })
})
