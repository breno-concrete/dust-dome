import { describe, it } from 'vitest'

// US1 (Dev A) — scheduling, constitution II.11
describe('event scheduling', () => {
  it.todo(
    'schedules every rule of the current cycle and season at a seeded time inside intervalSeconds',
  )
  it.todo('multiplies intervals by finalCycleIntervalFactor in the last cycle')
  it.todo('the same seed produces the same event times')
  it.todo('removes every active event when the season ends')
})

// US2 (Dev A) — dust
describe('dust events', () => {
  it.todo('a dust devil damages damagePanels random active solar panels')
  it.todo('panels with dust_filters are not damaged by dust devils')
  it.todo('clog hits the listed types with clogChance; dust_filters make them immune')
  it.todo('a dust storm stays active for durationSeconds with its solarFactor')
  it.todo(
    'a global dust storm lasts the whole season and short-circuits a listed structure every shortCircuitEverySeconds',
  )
  it.todo('darkness blocks external jobs for the whole season')
})

// US3 (Dev A) — radiation storm
describe('radiation storm', () => {
  it.todo(
    'happens perCycle times per cycle from fromCycle, at a seeded time in the allowed seasons',
  )
  it.todo('starts with a warning phase of warningSeconds, then an active phase of durationSeconds')
  it.todo(
    'when the active phase starts, astronauts outside or in a habitat without shelter are hit',
  )
  it.todo('carries the date and link of the real DONKI event it is based on')
})
