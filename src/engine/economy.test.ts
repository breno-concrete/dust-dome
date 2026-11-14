import { describe, it } from 'vitest'

// US2 (Breno) — constitution II.4–II.6, II.8. Per-season amounts are spread evenly over the season.
describe('applyProduction', () => {
  it.todo('produces each structure output per second = per-season amount / season duration')
  it.todo('uses the min or max amounts from the power mode of the structure type')
  it.todo('produces nothing when the type is off or shed by the brownout')
  it.todo('consumes inputs and stops producing when an input runs out')
  it.todo('applies damaged x damagedFactor, clogged x cloggedFactor, short_circuit x 0')
  it.todo('ignores structures that are still being built')
  it.todo('living astronauts consume oxygen, water and food per season')
})
