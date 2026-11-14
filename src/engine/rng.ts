// Owner: Breno. Seeded pseudo-random generator (mulberry32). The engine never
// calls Math.random: same seed -> same mission. Pure: returns the next state.
export interface RngResult {
  value: number
  rng: number
}

/** Next float in [0, 1). */
export function nextFloat(rng: number): RngResult {
  let t = (rng + 0x6d2b79f5) >>> 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, rng: next }
}

/** Next float in [min, max). */
export function nextRange(rng: number, min: number, max: number): RngResult {
  const r = nextFloat(rng)
  return { value: min + r.value * (max - min), rng: r.rng }
}

/** Next integer in [0, length). */
export function nextIndex(rng: number, length: number): RngResult {
  const r = nextFloat(rng)
  return { value: Math.floor(r.value * length), rng: r.rng }
}

export function seedToRng(seed: number): number {
  return seed >>> 0 || 1
}
