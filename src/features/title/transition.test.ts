import { describe, expect, it } from 'vitest'
import { TRANSITION_SECONDS, transitionFrame } from './transition'

const STEPS = 400
const samples = Array.from({ length: STEPS + 1 }, (_, i) =>
  transitionFrame((i / STEPS) * TRANSITION_SECONDS),
)

describe('title → game transition timeline', () => {
  it('starts on the menu view: in space, nothing covering the screen', () => {
    const first = transitionFrame(0)
    expect(first.set).toBe('space')
    expect(first.approach).toBe(0)
    expect(first.flyby).toBe(0)
    expect(first.wash).toBe(0)
    expect(first.fade).toBe(0)
    expect(first.done).toBe(false)
  })

  it('only moves forward: the camera, the rocket and the landing never go back', () => {
    for (let i = 1; i < samples.length; i++) {
      const before = samples[i - 1]!
      const now = samples[i]!
      expect(now.approach).toBeGreaterThanOrEqual(before.approach)
      expect(now.flyby).toBeGreaterThanOrEqual(before.flyby)
      expect(now.descent).toBeGreaterThanOrEqual(before.descent)
      expect(now.touchdown).toBeGreaterThanOrEqual(before.touchdown)
      expect(now.fade).toBeGreaterThanOrEqual(before.fade)
    }
  })

  it('reaches the planet before leaving space', () => {
    const lastInSpace = samples.findLast((f) => f.set === 'space')!
    expect(lastInSpace.approach).toBe(1)
    expect(lastInSpace.flyby).toBe(1)
  })

  it('hides the cut from space to the surface behind the dust', () => {
    const cut = samples.findIndex((f) => f.set === 'surface')
    expect(cut).toBeGreaterThan(0)
    expect(samples[cut - 1]!.wash).toBe(1)
    expect(samples[cut]!.wash).toBe(1)
  })

  it('shows the surface again while the rocket is still coming down', () => {
    const clear = samples.find((f) => f.set === 'surface' && f.wash === 0)!
    expect(clear.descent).toBeLessThan(1)
  })

  it('lands the rocket before the screen fades out', () => {
    const fading = samples.find((f) => f.fade > 0)!
    expect(fading.set).toBe('surface')
    expect(fading.descent).toBe(1)
    expect(fading.touchdown).toBeGreaterThan(0)
  })

  it('ends landed and fully faded, and stays there', () => {
    for (const seconds of [TRANSITION_SECONDS, TRANSITION_SECONDS + 30]) {
      const end = transitionFrame(seconds)
      expect(end.set).toBe('surface')
      expect(end.descent).toBe(1)
      expect(end.touchdown).toBe(1)
      expect(end.fade).toBe(1)
      expect(end.done).toBe(true)
    }
  })

  it('treats a negative time as the start', () => {
    expect(transitionFrame(-5)).toEqual(transitionFrame(0))
  })
})
