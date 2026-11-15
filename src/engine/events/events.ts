// Owner: Dev A. Climate events and the radiation storm (constitution II.11).
// Pure and seeded: state.rng is the only source of randomness.
// Writes: activeEvents, nextEventAt, radiationStorm, structure statuses
// (damaged / clogged / short_circuit), log entries. Called by tick() after advanceTime.
import { nextFloat, nextIndex, nextRange } from '../rng'
import type {
  ActiveEvent,
  EventRule,
  GameConfig,
  GameState,
  LogEntry,
  StructureInstance,
  StructureStatus,
} from '../types'

type Hit = 'damaged' | 'clogged' | 'short_circuit'

/** One status per structure: a worse one replaces a milder one, never the other way round. */
const SEVERITY: Record<StructureStatus, number> = {
  building: -1,
  active: 0,
  clogged: 1,
  damaged: 2,
  short_circuit: 3,
}

/** Float drift allowed when counting periods inside a season (not a balance value). */
const EPS = 1e-9

/** A due occurrence: an interval rule firing, or a short circuit of a whole-season rule. */
interface Occurrence {
  at: number
  /** Position of the rule in the config: breaks ties between occurrences at the same time. */
  order: number
  rule: EventRule
  shortCircuit: boolean
}

function startEvent(rule: EventRule, at: number, endsAt: number | null): ActiveEvent {
  return {
    id: `${rule.id}@${at}`,
    ruleId: rule.id,
    kind: rule.kind,
    endsAt,
    // A rule without these effects leaves sunlight and jobs alone (neutral values).
    solarFactor: rule.effects.solarFactor ?? 1,
    blocksExternalJobs: rule.effects.blocksExternalJobs ?? false,
  }
}

/**
 * US1 — scheduling. `nextEventAt[rule.id]` is the game time of a rule's next occurrence,
 * counted from the start of the season (first occurrence) or from the end of the previous one
 * (`durationSeconds` + interval), and never later than the end of the season.
 * Rules without `intervalSeconds` last the whole season and are not scheduled here.
 *
 * US2 — effects. Whole-season rules (cold, darkness, global storm) are active from the first
 * tick of their season. Every occurrence damages panels, clogs one structure of each listed type
 * and, when it has a duration, starts an active event until `endsAt`. A global storm
 * short-circuits one mine or refinery every `shortCircuitEverySeconds` from the start of the
 * season. Occurrences are applied in time order, so the result does not depend on the tick size.
 */
// TODO(Dev A, US3): the radiation storm.
export function updateEvents(state: GameState, config: GameConfig, dt: number): GameState {
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
  let activeEvents = state.activeEvents.filter((e) => currentIds.has(e.ruleId))
  const nextEventAt = Object.fromEntries(
    Object.entries(state.nextEventAt).filter(([id]) => currentIds.has(id) || !ruleIds.has(id)),
  )
  let changed =
    activeEvents.length !== state.activeEvents.length ||
    Object.keys(nextEventAt).length !== Object.keys(state.nextEventAt).length

  // ---------- seeded draws (state.rng only) ----------
  let rng = state.rng
  // `from` is when the wait starts: the season start, or the end of the previous occurrence.
  const draw = (rule: EventRule, from: number): number => {
    const [lo, hi] = rule.intervalSeconds!
    const r = nextRange(rng, lo * factor, hi * factor)
    rng = r.rng
    return Math.min(from + r.value, seasonEnd)
  }
  // The interval counts from the moment an occurrence ends, so a rule with a duration waits
  // for it first (PO decision T1). Only the first occurrence of the season has nothing to wait for.
  const drawAfter = (rule: EventRule, startedAt: number): number =>
    draw(rule, startedAt + (rule.durationSeconds ?? 0))
  const pick = <T>(list: readonly T[]): T => {
    const r = nextIndex(rng, list.length)
    rng = r.rng
    return list[r.value]
  }
  const roll = (chance: number): boolean => {
    const r = nextFloat(rng)
    rng = r.rng
    return r.value < chance
  }

  // ---------- targets and statuses ----------
  const filterIds = new Set(
    config.upgrades.filter((u) => u.effect === 'dust_filters').map((u) => u.id),
  )
  const solarTypes = new Set(
    config.structures.filter((d) => d.power.kind === 'solar').map((d) => d.id),
  )
  let structures = state.structures
  const hits: LogEntry[] = []

  /** Finished and without dust filters: the only structures an event can hit. */
  const exposed = (s: StructureInstance) =>
    s.status !== 'building' && !s.upgrades.some((u) => filterIds.has(u))
  /** Exposed and in good state: dust devils and clogs only hit these. */
  const healthy = (isType: (type: string) => boolean) =>
    structures.filter((s) => isType(s.type) && s.status === 'active' && exposed(s))
  const hit = (target: StructureInstance, status: Hit, rule: EventRule, at: number) => {
    if (SEVERITY[status] <= SEVERITY[target.status]) return
    structures = structures.map((s) => (s.id === target.id ? { ...s, status } : s))
    hits.push({ at, cycle, season, kind: status, ref: target.id, cause: rule.id })
  }

  const occur = (rule: EventRule, at: number) => {
    const { damagePanels = 0, clog = [], clogChance } = rule.effects
    let panels = healthy((type) => solarTypes.has(type))
    for (let i = 0; i < damagePanels && panels.length > 0; i++) {
      const panel = pick(panels)
      panels = panels.filter((p) => p !== panel)
      hit(panel, 'damaged', rule, at)
    }
    // One chance per occurrence, drawn before the targets (absent = always).
    if (clog.length > 0 && (clogChance === undefined || roll(clogChance))) {
      for (const type of clog) {
        const targets = healthy((t) => t === type)
        if (targets.length > 0) hit(pick(targets), 'clogged', rule, at)
      }
    }
    if (rule.durationSeconds) {
      activeEvents = [...activeEvents, startEvent(rule, at, at + rule.durationSeconds)]
    }
  }

  const shortCircuit = (rule: EventRule, at: number) => {
    const types = rule.effects.shortCircuit ?? []
    const targets = structures.filter(
      (s) => types.includes(s.type) && exposed(s) && SEVERITY[s.status] < SEVERITY.short_circuit,
    )
    if (targets.length > 0) hit(pick(targets), 'short_circuit', rule, at)
  }

  // ---------- whole-season rules: active from the first tick, created once ----------
  for (const rule of rules) {
    if (rule.intervalSeconds || activeEvents.some((e) => e.ruleId === rule.id)) continue
    activeEvents = [...activeEvents, startEvent(rule, seasonStart, null)]
    changed = true
  }

  // ---------- first occurrence of each interval rule in this season ----------
  for (const rule of rules) {
    if (rule.intervalSeconds && nextEventAt[rule.id] === undefined) {
      nextEventAt[rule.id] = draw(rule, seasonStart)
    }
  }

  // ---------- short circuits that fall inside this tick ----------
  // Counted from the start of the season, only over the part of the tick that belongs to it:
  // the rest of a tick that crossed into the season does not count.
  const periods = (seconds: number, every: number) => Math.floor(seconds / every + EPS)
  const shorts: Occurrence[] = []
  rules.forEach((rule, order) => {
    const every = rule.effects.shortCircuitEverySeconds
    if (rule.intervalSeconds || !every) return
    const from = Math.max(0, secondsIntoSeason - dt)
    const last = Math.min(
      periods(secondsIntoSeason, every),
      // An occurrence at the very end of the season does not happen: the season ends first.
      Math.ceil(seasonDef.durationSeconds / every - EPS) - 1,
    )
    for (let k = periods(from, every) + 1; k <= last; k++) {
      shorts.push({ at: seasonStart + k * every, order, rule, shortCircuit: true })
    }
  })
  shorts.sort((a, b) => a.at - b.at || a.order - b.order)

  // ---------- apply every due occurrence in time order ----------
  const nextDue = (): Occurrence | undefined => {
    let best: Occurrence | undefined = shorts[0]
    rules.forEach((rule, order) => {
      if (!rule.intervalSeconds) return
      const at = nextEventAt[rule.id]
      // Time stuck at the end of the season is not an occurrence: the season ends first.
      if (at > elapsed || at >= seasonEnd) return
      if (!best || at < best.at || (at === best.at && order < best.order)) {
        best = { at, order, rule, shortCircuit: false }
      }
    })
    return best
  }
  for (let o = nextDue(); o; o = nextDue()) {
    if (o.shortCircuit) {
      shorts.shift()
      shortCircuit(o.rule, o.at)
    } else {
      occur(o.rule, o.at)
      nextEventAt[o.rule.id] = drawAfter(o.rule, o.at)
    }
  }

  // ---------- storms with a duration end at endsAt ----------
  const live = activeEvents.filter((e) => e.endsAt === null || e.endsAt > elapsed)
  if (live.length !== activeEvents.length) changed = true
  activeEvents = live

  for (const rule of rules) {
    if (rule.intervalSeconds && nextEventAt[rule.id] !== state.nextEventAt[rule.id]) changed = true
  }
  if (hits.length > 0) changed = true

  if (!changed) return state
  return {
    ...state,
    rng,
    structures,
    activeEvents,
    nextEventAt,
    log: hits.length > 0 ? [...state.log, ...hits] : state.log,
  }
}
