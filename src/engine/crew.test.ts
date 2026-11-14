import { describe, it } from 'vitest'

// US5 (Breno) — constitution II.2, II.9
describe('updateCrew', () => {
  it.todo('exposure fills to 1 after maxShareOfSeason of the current season spent outside')
  it.todo('exposure recovers inside a habitat at recoveryRate of the fill speed')
  it.todo(
    'at warnAt the astronaut stops working and comes back inside; the job returns to the queue with its remaining time',
  )
  it.todo('exposure never kills: no astronaut stays outside past warnAt')
  it.todo(
    'when a radiation storm hits, everyone not in a sheltered habitat (after moving into one with room) dies, cause "radiation_storm"',
  )
  it.todo(
    'an empty vital reserve kills one astronaut after graceSeconds, then one every deathEverySeconds',
  )
  it.todo('an unheated base kills the same way (cause "cold")')
  it.todo(
    'from insulationRequiredFromCycle, at winter start astronauts in uninsulated habitats die',
  )
  it.todo(
    'at extreme cold, astronauts inside move into insulated habitats with room and only the rest die',
  )
  it.todo('two empty reserves have separate countdowns')
  it.todo('the victim of a countdown is the first living astronaut in crew order')
  it.todo('resting ends when exposure is back to 0')
})
