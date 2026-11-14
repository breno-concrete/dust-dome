import { describe, expect, it } from 'vitest'
import { config } from '../../config/loadConfig'
import { createGame } from '../../engine/game'
import type { ActiveEvent } from '../../engine/types'
import { visualState } from './visualState'

const storm: ActiveEvent = {
  id: 'e1',
  ruleId: 'c3_global_storm',
  kind: 'global_dust_storm',
  endsAt: null,
  solarFactor: 0.2,
  blocksExternalJobs: false,
}

describe('visualState', () => {
  const game = createGame(config, 1)

  it('summer is brighter than winter', () => {
    const summer = visualState({ ...game, time: { ...game.time, season: 'summer' } }, config)
    const winter = visualState({ ...game, time: { ...game.time, season: 'winter' } }, config)
    expect(summer.light).toBeGreaterThan(winter.light)
  })

  it('winter is dark from seasons.winterDarknessFromCycle on', () => {
    const v = visualState(
      {
        ...game,
        time: { ...game.time, season: 'winter', cycle: config.seasons.winterDarknessFromCycle },
      },
      config,
    )
    expect(v.dark).toBe(true)
  })

  it('a dust storm fills the sky with haze and dims the light', () => {
    const clear = visualState(game, config)
    const dusty = visualState({ ...game, activeEvents: [storm] }, config)
    expect(dusty.dustHaze).toBeCloseTo(0.8)
    expect(dusty.light).toBeLessThan(clear.light)
  })

  // US2 (Dev C)
  it.todo('an unheated base shows frost on the habitats')
  it.todo('the radiation alarm tints the scene during the warning phase')
})
