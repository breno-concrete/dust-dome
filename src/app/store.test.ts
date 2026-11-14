import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './store'

describe('store', () => {
  beforeEach(() => useGameStore.getState().start(42))

  it('start() opens the game screen with a fresh game', () => {
    const s = useGameStore.getState()
    expect(s.screen).toBe('game')
    expect(s.game?.seed).toBe(42)
  })

  it('advance() does nothing while paused', () => {
    useGameStore.getState().dismissBriefing()
    useGameStore.getState().setSpeed(0)
    const before = useGameStore.getState().game
    useGameStore.getState().advance(1)
    expect(useGameStore.getState().game).toBe(before)
  })

  it('advance() multiplies real seconds by the speed', () => {
    useGameStore.getState().dismissBriefing()
    useGameStore.getState().setSpeed(4)
    useGameStore.getState().advance(0.5)
    expect(useGameStore.getState().game?.time.elapsed).toBe(2)
  })

  it('placeAt() does nothing when no structure is being placed', () => {
    const before = useGameStore.getState().game
    useGameStore.getState().placeAt([0, 0])
    expect(useGameStore.getState().game).toBe(before)
  })
})
