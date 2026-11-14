// Owner: Dev A. Climate events and the radiation storm (constitution II.11).
// Pure and seeded: state.rng is the only source of randomness.
// Writes: activeEvents, nextEventAt, radiationStorm, structure statuses
// (damaged / clogged / short_circuit), log entries. Called by tick() after advanceTime.
import { nextRange } from '../rng'
import type { EventRule, GameConfig, GameState } from '../types'

/**
 * US1 — scheduling. `nextEventAt[rule.id]` is the game time of a rule's next occurrence,
 * counted from the start of the season and never later than the end of the season.
 * Rules without `intervalSeconds` last the whole season and are not scheduled here.
 */
// TODO(Dev A, US2–US3): apply the effects of each occurrence and the radiation storm.
export function updateEvents(state: GameState, config: GameConfig, _dt: number): GameState {
  const { cycle, season, elapsed, secondsIntoSeason } = state.time
  const seasonDef = config.seasons.seasons.find((s) => s.id === season)
  if (!seasonDef) return state

  const seasonStart = elapsed - secondsIntoSeason
  const seasonEnd = seasonStart + seasonDef.durationSeconds
  const factor = cycle === config.seasons.cycles ? config.mission.finalCycleIntervalFactor : 1

  const rules = config.events.filter((r) => r.cycles.includes(cycle) && r.season === season)
  const currentIds = new Set(rules.map((r) => r.id))
  const ruleIds = new Set(config.events.map((r) => r.id))

  // A rule outside this cycle and season is left over from the previous season: drop it.
  // Keys that are not climate rules (e.g. the radiation storm) are not ours to drop here.
  const activeEvents = state.activeEvents.filter((e) => currentIds.has(e.ruleId))
  const nextEventAt = Object.fromEntries(
    Object.entries(state.nextEventAt).filter(([id]) => currentIds.has(id) || !ruleIds.has(id)),
  )
  let changed =
    activeEvents.length !== state.activeEvents.length ||
    Object.keys(nextEventAt).length !== Object.keys(state.nextEventAt).length

  let rng = state.rng
  const draw = (rule: EventRule, from: number): number => {
    const [lo, hi] = rule.intervalSeconds!
    const r = nextRange(rng, lo * factor, hi * factor)
    rng = r.rng
    return Math.min(from + r.value, seasonEnd)
  }

  for (const rule of rules) {
    if (!rule.intervalSeconds) continue
    let at = nextEventAt[rule.id]
    if (at === undefined) at = draw(rule, seasonStart)
    // Each occurrence that is due schedules the next one. Time stuck at the end of the
    // season is not an occurrence: the season ends first.
    while (at <= elapsed && at < seasonEnd) at = draw(rule, at)
    if (at !== state.nextEventAt[rule.id]) {
      nextEventAt[rule.id] = at
      changed = true
    }
  }

  return changed ? { ...state, rng, activeEvents, nextEventAt } : state
}
