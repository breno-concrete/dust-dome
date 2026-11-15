// Owner: Dev A. The ONLY place that knows where real NASA data comes from.
// Snapshots of real DONKI solar energetic particle (SEP) events live in ./snapshots
// (downloaded by `npm run data:fetch`, never hand-edited). The game never fetches: the committed
// snapshot is bundled like the config JSON, and the engine receives plain `SepEvent` data.
import snapshot from './snapshots/2024-05.json'

export interface SepEvent {
  /** ISO date of the real event (DONKI `eventTime`). */
  date: string
  /** Link to the event in DONKI (DONKI `link`). */
  url: string
}

export interface SepSnapshotRead {
  events: SepEvent[]
  /** What was wrong with the snapshot, one line per problem. Empty when it was all good. */
  problems: string[]
}

/** DONKI writes times as 2024-05-09T13:59Z (seconds and milliseconds optional). */
const EVENT_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?Z$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A UTC time in the DONKI shape that is also a real moment (no month 13, no 25:00). */
function isEventTime(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = EVENT_TIME.exec(value)
  if (!m) return false
  const [y, mo, d, h, mi, s = 0] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)))
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s))
  return (
    t.getUTCFullYear() === y &&
    t.getUTCMonth() === mo - 1 &&
    t.getUTCDate() === d &&
    t.getUTCHours() === h &&
    t.getUTCMinutes() === mi &&
    t.getUTCSeconds() === s
  )
}

/** Only an https:// link to a real host may be shown as the source. */
function isHttpsLink(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname !== ''
  } catch {
    return false
  }
}

/**
 * Reads a snapshot in the DONKI API format ({ range, fetchedAt, sep }) into `{ date, url }`
 * events, in snapshot order. Pure and never throws: a broken snapshot or record is described in
 * `problems` and dropped, never turned into an invented source. `flr` and `cme` are ignored.
 */
export function readSepSnapshot(raw: unknown): SepSnapshotRead {
  if (!isRecord(raw)) {
    return { events: [], problems: ['the DONKI snapshot is not an object'] }
  }
  if (!Array.isArray(raw.sep)) {
    return { events: [], problems: ['the DONKI snapshot has no "sep" list'] }
  }
  const events: SepEvent[] = []
  const problems: string[] = []
  raw.sep.forEach((record: unknown, i) => {
    if (!isRecord(record)) {
      problems.push(`sep[${i}] is not a record`)
    } else if (!isEventTime(record.eventTime)) {
      problems.push(`sep[${i}] has no valid eventTime: ${JSON.stringify(record.eventTime)}`)
    } else if (!isHttpsLink(record.link)) {
      problems.push(`sep[${i}] has no https:// link: ${JSON.stringify(record.link)}`)
    } else {
      events.push({ date: record.eventTime, url: record.link })
    }
  })
  return { events, problems }
}

let cached: readonly SepEvent[] | null = null

/**
 * The events of the committed snapshot. Read once, on the first call (when the first radiation
 * storm starts), then cached; the list and every event are frozen. Problems are reported once,
 * with console.warn, when the cache is built.
 */
export function sepEvents(): readonly SepEvent[] {
  if (cached) return cached
  const { events, problems } = readSepSnapshot(snapshot)
  if (problems.length > 0) {
    console.warn(`DONKI snapshot: ${problems.length} problem(s)\n${problems.join('\n')}`)
  }
  cached = Object.freeze(events.map((e) => Object.freeze(e)))
  return cached
}

/**
 * The events of one group: those at positions i with i % groups === group, in the original
 * order. Groups never share an event, so storms that draw from different groups never cite the
 * same one. An empty group gives back the whole list (fewer events than storms).
 */
export function sepGroup(
  events: readonly SepEvent[],
  group: number,
  groups: number,
): readonly SepEvent[] {
  const own = events.filter((_, i) => i % groups === group)
  return own.length > 0 ? own : events
}

/** The real event a radiation storm is based on (seeded index); null when there is none. */
export function pickSepEvent(events: readonly SepEvent[], index: number): SepEvent | null {
  return events.length ? events[index % events.length] : null
}
