import { beforeEach, describe, expect, it } from 'vitest'
import { hasPausedJob } from './selectors'
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

  it('demolish() and bringInside() go through the engine and report a refusal', () => {
    useGameStore.getState().demolish('no-such-structure')
    expect(useGameStore.getState().lastError).not.toBeNull()
    useGameStore.getState().start(42)
    useGameStore.getState().bringInside('no-such-astronaut')
    expect(useGameStore.getState().lastError).not.toBeNull()
  })

  it('resumeJobs() puts the jobs paused by "Bring inside" back in the queue', () => {
    const game = useGameStore.getState().game!
    const habitat = game.structures.find((x) => x.type === 'habitat')!
    useGameStore.setState({
      game: {
        ...game,
        jobs: [
          {
            id: 'j99',
            kind: 'upgrade',
            structureId: habitat.id,
            upgradeId: 'thermal_insulation',
            astronautId: null,
            remainingSeconds: 5,
            status: 'held',
          },
        ],
      },
    })
    expect(hasPausedJob(useGameStore.getState(), habitat.id)).toBe(true)

    useGameStore.getState().resumeJobs(habitat.id)
    expect(useGameStore.getState().lastError).toBeNull()
    expect(useGameStore.getState().game!.jobs[0].status).toBe('queued')
    expect(hasPausedJob(useGameStore.getState(), habitat.id)).toBe(false)

    useGameStore.getState().resumeJobs(habitat.id)
    expect(useGameStore.getState().lastError).toBe('not_allowed')
  })

  it('placeAt() does nothing when no structure is being placed', () => {
    const before = useGameStore.getState().game
    useGameStore.getState().placeAt([0, 0])
    expect(useGameStore.getState().game).toBe(before)
  })
})
