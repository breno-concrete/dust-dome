import { describe, expect, it } from 'vitest'
import { popScale, revealProgress, revealSeconds } from './reveal'

const COUNT = 8
const STEPS = 300
const END = revealSeconds(COUNT)

describe('little base appearing on the menu planet', () => {
  it('starts with a bare, textured planet: nothing is placed yet', () => {
    for (let i = 0; i < COUNT; i++) expect(revealProgress(0, i)).toBe(0)
    expect(revealProgress(-3, 0)).toBe(0)
  })

  it('places the pieces one after the other, never two in the same instant', () => {
    for (let i = 1; i < COUNT; i++) {
      const firstStart = (seconds: number, index: number) => revealProgress(seconds, index) > 0
      const earlier = Array.from({ length: STEPS }, (_, s) => (s / STEPS) * END).find((t) =>
        firstStart(t, i - 1),
      )!
      expect(firstStart(earlier, i)).toBe(false)
    }
  })

  it('only moves forward', () => {
    for (let i = 0; i < COUNT; i++) {
      let before = 0
      for (let s = 0; s <= STEPS; s++) {
        const now = revealProgress((s / STEPS) * END, i)
        expect(now).toBeGreaterThanOrEqual(before)
        before = now
      }
    }
  })

  it('has every piece in place when the time is up, and keeps it there', () => {
    for (const seconds of [END, END + 60]) {
      for (let i = 0; i < COUNT; i++) expect(revealProgress(seconds, i)).toBe(1)
    }
  })

  it('pops in with a little bounce: from nothing, past full size, back to full size', () => {
    expect(popScale(0)).toBe(0)
    expect(popScale(1)).toBe(1)
    const sizes = Array.from({ length: 101 }, (_, i) => popScale(i / 100))
    expect(Math.max(...sizes)).toBeGreaterThan(1)
    expect(Math.max(...sizes)).toBeLessThan(1.25)
  })
})
