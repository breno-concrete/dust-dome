import { describe, it } from 'vitest'

// US3 (Breno) — constitution II.7
describe('computePower', () => {
  it.todo('solar panels produce kwBySeason x the active events solarFactor')
  it.todo('solar panels produce 0 in winter from seasons.winterDarknessFromCycle')
  it.todo('a damaged panel produces x damagedFactor')
  it.todo('the reactor produces its constant kW in every season and event')
  it.todo('consumers draw 0 (off), minKw (min) or maxKw (max)')
  it.todo('heatingKw by cycle and season replaces minKw; max adds maxKw - minKw')
  it.todo('an insulated habitat uses insulatedHeatingKw')
  it.todo('surplus charges batteries up to their capacity; deficit drains them')
  it.todo('with batteries empty, sheds types in mission.brownoutOrder until demand fits')
  it.todo('never sheds habitats and flags unheated when even their heating cannot be met')
})
