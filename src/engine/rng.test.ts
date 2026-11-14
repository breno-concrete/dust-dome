import { describe, expect, it } from 'vitest'
import { nextFloat, nextIndex, nextRange, seedToRng } from './rng'

describe('rng', () => {
  it('is deterministic for the same state', () => {
    expect(nextFloat(seedToRng(42))).toEqual(nextFloat(seedToRng(42)))
  })

  it('produces values in [0, 1) and advances the state', () => {
    let rng = seedToRng(7)
    for (let i = 0; i < 1000; i++) {
      const r = nextFloat(rng)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
      expect(r.rng).not.toBe(rng)
      rng = r.rng
    }
  })

  it('respects ranges and indexes', () => {
    let rng = seedToRng(3)
    for (let i = 0; i < 200; i++) {
      const a = nextRange(rng, 30, 45)
      expect(a.value).toBeGreaterThanOrEqual(30)
      expect(a.value).toBeLessThan(45)
      const b = nextIndex(a.rng, 5)
      expect(Number.isInteger(b.value) && b.value >= 0 && b.value < 5).toBe(true)
      rng = b.rng
    }
  })
})
