import { beforeEach, describe, expect, it } from 'vitest'
import { config } from '../config/loadConfig'
import { radiationPlan } from '../engine/events/events'
import { gameAt } from '../engine/testState'
import { hasPausedJob } from './selectors'
import { useGameStore } from './store'

/** A running mission one game second before the first radiation alarm (gameAt uses seed 1). */
function justBeforeRadiationAlarm() {
  const cycle = config.mission.radiationStorm.fromCycle
  const slot = radiationPlan(1, cycle, config)[0]!
  const seasons = config.seasons.seasons
  const before = seasons
    .slice(
      0,
      seasons.findIndex((s) => s.id === slot.season),
    )
    .reduce((sum, s) => sum + s.durationSeconds, 0)
  return gameAt(config, cycle, slot.season, slot.offset - before - 1)
}

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

  // Playtest 2026-11-15: at 4× the 10 s alarm lasted 2.5 real seconds (constitution VI, II.11).
  describe('radiation alarm and game speed', () => {
    it('advance() drops the speed to 1× when the radiation alarm starts', () => {
      for (const fast of [2, 4] as const) {
        useGameStore.setState({ game: justBeforeRadiationAlarm(), speed: fast })
        useGameStore.getState().advance(0.5)
        expect(useGameStore.getState().game!.radiationStorm?.phase).toBe('warning')
        expect(useGameStore.getState().speed).toBe(1)
      }
    })

    it('leaves the speed alone when no alarm starts', () => {
      useGameStore.getState().dismissBriefing()
      useGameStore.getState().setSpeed(4)
      useGameStore.getState().advance(0.5)
      expect(useGameStore.getState().game!.radiationStorm).toBeNull()
      expect(useGameStore.getState().speed).toBe(4)
    })

    it('lets the player speed up again while the alarm is on', () => {
      useGameStore.setState({ game: justBeforeRadiationAlarm(), speed: 4 })
      useGameStore.getState().advance(0.5)
      useGameStore.getState().setSpeed(2)
      useGameStore.getState().advance(0.5)
      expect(useGameStore.getState().game!.radiationStorm).not.toBeNull()
      expect(useGameStore.getState().speed).toBe(2)
    })
  })

  // Playtest 2026-11-15: an old error stayed on the panel of another structure, and a click on a
  // structure while placing cancelled the placement without a word.
  describe('feedback of refused actions', () => {
    it('selecting a structure or starting a placement clears the last error', () => {
      const mine = useGameStore.getState().game!.structures.find((x) => x.type === 'mine')!
      useGameStore.getState().demolish('no-such-structure')
      expect(useGameStore.getState().lastError).not.toBeNull()
      useGameStore.getState().selectStructure(mine.id)
      expect(useGameStore.getState().lastError).toBeNull()

      useGameStore.getState().demolish('no-such-structure')
      useGameStore.getState().beginPlacement('solar_panel')
      expect(useGameStore.getState().lastError).toBeNull()
    })

    it('a click on a structure while placing keeps the placement and says the tile is taken', () => {
      const mine = useGameStore.getState().game!.structures.find((x) => x.type === 'mine')!
      useGameStore.getState().beginPlacement('solar_panel')
      useGameStore.getState().selectStructure(mine.id)
      const s = useGameStore.getState()
      expect(s.placing).toBe('solar_panel')
      expect(s.selectedStructureId).toBeNull()
      expect(s.lastError).toBe('tile_blocked')
    })

    it('a power switch changed while the game waits shows in the power report at once', () => {
      // The first briefing is still open: no tick runs.
      const before = useGameStore.getState().game!.power
      useGameStore.getState().setPowerMode('oxygen_generator', 'off')
      const after = useGameStore.getState().game!.power
      expect(after.demandKw).toBeLessThan(before.demandKw)
      expect(after.balanceKw).toBeGreaterThan(before.balanceKw)
    })
  })
})
