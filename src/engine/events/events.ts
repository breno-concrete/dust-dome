// Owner: Dev A. Climate events and the radiation storm (constitution II.11).
// Pure and seeded: climate events draw from state.rng; the radiation storm draws from its own
// stream of the same seed (see stormPlan). Never Math.random.
// Writes: activeEvents, nextEventAt, radiationStorm, structure statuses
// (damaged / clogged / short_circuit), log entries. Called by tick() after advanceTime.
import { pickSepEvent, sepEvents, sepGroup, type SepEvent } from '../../data/donki'
import { nextFloat, nextIndex, nextRange, seedToRng } from '../rng'
import type {
  ActiveEvent,
  EventRule,
  GameConfig,
  GameState,
  LogEntry,
  SeasonId,
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
 *
 * US3 — the radiation storm (updateRadiationStorm), modeled on a real NASA DONKI event of the
 * committed snapshot, read only when a storm starts.
 */
export function updateEvents(state: GameState, config: GameConfig, dt: number): GameState {
  return updateRadiationStorm(updateClimate(state, config, dt), config, dt, sepEvents)
}

/** Climate events of the current cycle and season (US1 and US2). */
function updateClimate(state: GameState, config: GameConfig, dt: number): GameState {
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

// ---------------------------------------------------------------------------------------------
// US3 — radiation storm (constitution II.11, "Radiation Storm"; spec 002 US3).

/**
 * Fixed constants that mix the seed and the cycle into the start of the storm's own stream
 * (murmur3 finalizer). Not balance values: they only keep this stream away from state.rng.
 */
const STORM_STREAM = 0x9e3779b9
const MIX_A = 0x85ebca6b
const MIX_B = 0xc2b2ae35

/** The start of the storm stream of one cycle: seed, cycle and a fixed constant, mixed. */
function stormStream(seed: number, cycle: number): number {
  let h = Math.imul(seed ^ STORM_STREAM, MIX_A) ^ Math.imul(cycle, MIX_B)
  h = Math.imul(h ^ (h >>> 16), MIX_A)
  h = Math.imul(h ^ (h >>> 13), MIX_B)
  return seedToRng(h ^ (h >>> 16))
}

/** One planned radiation storm of a cycle. */
export interface RadiationSlot {
  cycle: number
  /** Order of the storm inside its cycle (0 when perCycle is 1). */
  n: number
  /** Seconds from the start of the cycle to the start of the warning. */
  offset: number
  season: SeasonId
  /** Generator state for the seeded choice of the cited DONKI event. */
  pickRng: number
}

/**
 * The radiation storms of one cycle: perCycle storms in every cycle from fromCycle, none before
 * or after the mission. Each starts at a seeded time in an allowed season, never in its first
 * warningSeconds (the commander's briefing pauses the game as a season starts, so the alarm does
 * not sound right on top of it) and early enough that the warning and the hit are over before
 * that season ends. Storm n starts in the n-th share of the allowed time, and every share but the
 * last leaves room for a whole storm, so two storms never overlap.
 *
 * A pure function of the seed, the cycle and the config. GameState has no field for a storm that
 * has not started (nextEventAt only holds climate rules), so the plan is drawn again from the
 * seed with the rng.ts helpers, on a stream of its own. It never reads or writes state.rng, so
 * storms and dust never shift each other's draws.
 */
export function radiationPlan(seed: number, cycle: number, config: GameConfig): RadiationSlot[] {
  const { fromCycle, perCycle, seasons, warningSeconds, durationSeconds } =
    config.mission.radiationStorm
  if (cycle < fromCycle || cycle > config.seasons.cycles) return []
  const length = warningSeconds + durationSeconds
  const margin = warningSeconds

  // Where a storm may start inside the cycle, season by season.
  const windows: { season: SeasonId; from: number; span: number }[] = []
  let at = 0
  for (const s of config.seasons.seasons) {
    if (seasons.includes(s.id) && s.durationSeconds >= margin + length) {
      windows.push({ season: s.id, from: at + margin, span: s.durationSeconds - margin - length })
    }
    at += s.durationSeconds
  }
  if (windows.length === 0) return []
  const total = windows.reduce((sum, w) => sum + w.span, 0)
  /** The time of the u-th second of allowed start time, u in [0, total]. */
  const locate = (u: number) => {
    let acc = 0
    for (const w of windows) {
      if (u <= acc + w.span) return { season: w.season, offset: w.from + (u - acc) }
      acc += w.span
    }
    const last = windows[windows.length - 1]
    return { season: last.season, offset: last.from + last.span }
  }

  const plan: RadiationSlot[] = []
  let rng = stormStream(seed, cycle)
  for (let n = 0; n < perCycle; n++) {
    const lo = (n * total) / perCycle
    const hi = ((n + 1) * total) / perCycle - (n < perCycle - 1 ? length : 0)
    const time = nextRange(rng, lo, hi)
    const pickRng = time.rng
    rng = nextFloat(pickRng).rng
    if (hi < lo) continue // the config leaves no room for this storm
    plan.push({ cycle, n, ...locate(time.value), pickRng })
  }
  return plan
}

/** The planned storm whose start falls inside this tick, (elapsed - dt, elapsed], with its time. */
function stormStartingNow(state: GameState, config: GameConfig, dt: number) {
  const { cycle, season, secondsIntoSeason, elapsed } = state.time
  const seasons = config.seasons.seasons
  const index = seasons.findIndex((s) => s.id === season)
  if (index < 0) return null
  const cycleLength = seasons.reduce((sum, s) => sum + s.durationSeconds, 0)
  const before = seasons.slice(0, index).reduce((sum, s) => sum + s.durationSeconds, 0)
  const cycleStart = elapsed - secondsIntoSeason - before
  // The previous cycle too, for a tick that crossed into a new cycle.
  for (const c of [cycle - 1, cycle]) {
    for (const slot of radiationPlan(state.seed, c, config)) {
      const at = cycleStart + (c - cycle) * cycleLength + slot.offset
      if (at > elapsed - dt && at <= elapsed) return { slot, at }
    }
  }
  return null
}

/**
 * The radiation storm: none -> warning (warningSeconds) -> active (durationSeconds) -> none.
 * Phase times count from the planned start, never from the tick, and the storm moves at most one
 * phase per tick, so the warning is always seen and the hit always lands. While it lasts, jobs
 * wait (jobs.ts) and, once it hits, the crew outside a radiation shelter dies (crew.ts).
 *
 * The storm cites a real DONKI event: the list is split into one group per storm of the mission
 * (event i is in group i % groups), so one mission never cites an event twice; an empty group
 * draws from the whole list, and an empty list cites nothing. `events` is called only when a
 * storm starts, so updateEvents reads the snapshot only then.
 *
 * The log gets one radiation_storm entry per storm, written once, when the warning starts.
 */
export function updateRadiationStorm(
  state: GameState,
  config: GameConfig,
  dt: number,
  events: () => readonly SepEvent[],
): GameState {
  const rules = config.mission.radiationStorm
  const storm = state.radiationStorm
  if (storm) {
    if (state.time.elapsed < storm.phaseEndsAt) return state
    if (storm.phase === 'warning') {
      const phaseEndsAt = storm.phaseEndsAt + rules.durationSeconds
      return { ...state, radiationStorm: { ...storm, phase: 'active', phaseEndsAt } }
    }
  }
  // The storm is over (or there was none): the next one may start in the same tick.
  const ended: GameState = storm ? { ...state, radiationStorm: null } : state
  const next = stormStartingNow(ended, config, dt)
  if (!next) return ended

  const { slot, at } = next
  const groups = (config.seasons.cycles - rules.fromCycle + 1) * rules.perCycle
  const group = sepGroup(events(), (slot.cycle - rules.fromCycle) * rules.perCycle + slot.n, groups)
  const cited =
    group.length > 0 ? pickSepEvent(group, nextIndex(slot.pickRng, group.length).value) : null
  const basedOn = cited && { date: cited.date, url: cited.url }

  const entry: LogEntry = {
    at,
    cycle: slot.cycle,
    season: slot.season,
    kind: 'radiation_storm',
    // The archived DONKI event the storm is modeled on, so the debrief can name it.
    ref: basedOn?.url ?? 'radiation_storm',
    cause: 'radiation_storm',
  }
  return {
    ...ended,
    radiationStorm: { phase: 'warning', phaseEndsAt: at + rules.warningSeconds, basedOn },
    log: [...ended.log, entry],
  }
}
