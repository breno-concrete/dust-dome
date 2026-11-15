// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canPlay3d, prefersReducedMotion } from './motion'

describe('what the device can play', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('says no to 3D where there is no WebGL (jsdom, very old browsers)', () => {
    expect(canPlay3d()).toBe(false)
  })

  it('does not ask for less motion when the browser cannot tell', () => {
    expect(prefersReducedMotion()).toBe(false)
  })

  it('asks for less motion when the device setting says so', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
    expect(prefersReducedMotion()).toBe(true)
  })
})
