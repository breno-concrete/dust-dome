import { describe, expect, it } from 'vitest'
import { pickSepEvent, readSepSnapshot, sepEvents, sepGroup, type SepEvent } from './donki'

// US3 (Dev A) — constitution principle II and II.11; spec 002, US3 scenarios 5 to 7, FR-011,
// FR-012; contracts/donki.md; data-model "Snapshot DONKI".
//
// The valid case uses the committed snapshot (real NASA data). Every bad case is SYNTHETIC, built
// in the test and marked as such: snapshots are never hand-edited.

interface SepRecord {
  sepID?: string
  eventTime: string
  link: string
}
interface Snapshot {
  range: string
  fetchedAt: string
  sep: SepRecord[]
  flr?: unknown[]
  cme?: unknown[]
}

// Loaded with import.meta.glob so that a missing file fails only the tests that need it.
const SNAPSHOT_FILE = './snapshots/2024-05.json'
const snapshots = import.meta.glob<Snapshot>('./snapshots/2024-05.json', {
  eager: true,
  import: 'default',
})
const rawSnapshots = import.meta.glob<string>('./snapshots/2024-05.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

function committed(): Snapshot {
  const snapshot = snapshots[SNAPSHOT_FILE]
  expect(snapshot, 'src/data/snapshots/2024-05.json is missing (T016/T017)').toBeDefined()
  return snapshot
}

/** SYNTHETIC records in the DONKI API format, not real NASA events. */
const synthetic = (n: number): SepRecord => ({
  sepID: `SYNTHETIC-${n}`,
  eventTime: `2099-01-${String(n).padStart(2, '0')}T12:30Z`,
  link: `https://example.test/synthetic-sep/${n}`,
})
const asEvent = (r: SepRecord): SepEvent => ({ date: r.eventTime, url: r.link })
/** A SYNTHETIC month in the snapshot format. */
const month = (sep: unknown[], extra: Record<string, unknown> = {}) => ({
  range: '2099-01-01..2099-01-31',
  fetchedAt: '2099-02-01T00:00:00Z',
  sep,
  ...extra,
})

/** SYNTHETIC SEP events: only their position in the list matters. */
const events = (count: number): SepEvent[] =>
  Array.from({ length: count }, (_, i) => asEvent(synthetic(i + 1)))

describe('readSepSnapshot: a valid snapshot (US3 scenario 5)', () => {
  it('turns every SEP record of the committed snapshot into { date: eventTime, url: link }, in snapshot order', () => {
    const snapshot = committed()
    expect(snapshot.sep.length).toBeGreaterThan(0)
    const { events: read, problems } = readSepSnapshot(snapshot)
    expect(problems).toEqual([])
    expect(read).toEqual(snapshot.sep.map(asEvent))
  })

  it('keeps the order of the snapshot, and only date and url', () => {
    const records = [synthetic(3), synthetic(1), synthetic(2)]
    const { events: read } = readSepSnapshot(month(records))
    expect(read).toEqual([asEvent(synthetic(3)), asEvent(synthetic(1)), asEvent(synthetic(2))])
    for (const e of read) expect(Object.keys(e).sort()).toEqual(['date', 'url'])
  })

  it('an empty month gives no events and no problems', () => {
    expect(readSepSnapshot(month([]))).toEqual({ events: [], problems: [] })
  })

  it('ignores flr and cme when they are there, and does not need them', () => {
    const records = [synthetic(1), synthetic(2)]
    const without = readSepSnapshot(month(records))
    const withThem = readSepSnapshot(
      month(records, { flr: [{ flrID: 'SYNTHETIC' }], cme: [{ activityID: 'SYNTHETIC' }] }),
    )
    expect(without).toEqual({ events: records.map(asEvent), problems: [] })
    expect(withThem).toEqual(without)
  })
})

describe('readSepSnapshot: a broken snapshot is reported, never invented (US3 scenario 6)', () => {
  // SYNTHETIC: none of these is a real snapshot.
  const corrupted: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not a snapshot'],
    ['a number', 42],
    ['an array', [synthetic(1)]],
    ['an object without sep', { range: '2099-01', fetchedAt: '2099-02-01T00:00:00Z' }],
    ['sep that is not a list', month('nope' as unknown as unknown[])],
    ['sep that is null', { ...month([]), sep: null }],
  ]

  it.each(corrupted)(
    'a corrupted snapshot (%s) gives no events and a problem, without throwing',
    (_, raw) => {
      let result: ReturnType<typeof readSepSnapshot> | undefined
      expect(() => {
        result = readSepSnapshot(raw)
      }).not.toThrow()
      expect(result!.events).toEqual([])
      expect(result!.problems.length).toBeGreaterThan(0)
      for (const p of result!.problems) expect(p).toEqual(expect.stringMatching(/\S/))
    },
  )

  // SYNTHETIC bad records, each one between two good ones.
  const good = synthetic(1)
  const badRecords: [string, unknown][] = [
    ['no eventTime', { sepID: 'SYNTHETIC-BAD', link: good.link }],
    ['an empty eventTime', { ...good, eventTime: '' }],
    ['an eventTime that is not a date', { ...good, eventTime: 'yesterday' }],
    [
      'an eventTime with the right shape but an impossible date',
      { ...good, eventTime: '2024-13-40T99:99Z' },
    ],
    ['an eventTime that is a number', { ...good, eventTime: 1715263140000 }],
    ['no link', { sepID: 'SYNTHETIC-BAD', eventTime: good.eventTime }],
    ['an http link', { ...good, link: 'http://example.test/synthetic-sep/1' }],
    ['a javascript link', { ...good, link: 'javascript:alert(1)' }],
    ['a link that is not a URL', { ...good, link: 'https://' }],
    ['a link that is a number', { ...good, link: 42 }],
    ['a null record', null],
    ['a string record', 'SYNTHETIC'],
  ]

  it.each(badRecords)(
    'a record with %s is dropped and reported; the good ones stay, in order',
    (_, bad) => {
      const before = synthetic(2)
      const after = synthetic(3)
      let result: ReturnType<typeof readSepSnapshot> | undefined
      expect(() => {
        result = readSepSnapshot(month([before, bad, after]))
      }).not.toThrow()
      expect(result!.events).toEqual([asEvent(before), asEvent(after)])
      expect(result!.problems).toHaveLength(1)
      expect(result!.problems[0]).toEqual(expect.stringMatching(/\S/))
    },
  )

  it('a snapshot with only bad records gives no events, one problem per record', () => {
    const { events: read, problems } = readSepSnapshot(
      month([
        { ...synthetic(1), link: 'http://x.test' },
        { ...synthetic(2), eventTime: 'soon' },
      ]),
    )
    expect(read).toEqual([])
    expect(problems).toHaveLength(2)
  })
})

describe('sepGroup: one group of events per storm, so one mission never cites an event twice', () => {
  it('group g holds the events at positions i with i % groups === g, in the original order', () => {
    const list = events(7)
    expect(sepGroup(list, 0, 3)).toEqual([list[0], list[3], list[6]])
    expect(sepGroup(list, 1, 3)).toEqual([list[1], list[4]])
    expect(sepGroup(list, 2, 3)).toEqual([list[2], list[5]])
  })

  it('groups never share an event and together hold the whole list', () => {
    const list = events(14)
    for (let groups = 1; groups <= 6; groups++) {
      const all = Array.from({ length: groups }, (_, g) => sepGroup(list, g, groups))
      const flat = all.flat()
      expect(flat).toHaveLength(list.length)
      expect(new Set(flat.map((e) => e.url)).size).toBe(list.length)
    }
  })

  it('an empty group gives back the whole list', () => {
    const list = events(2)
    expect(sepGroup(list, 2, 3)).toEqual(list)
  })

  it('an empty list gives an empty group', () => {
    expect(sepGroup([], 0, 3)).toEqual([])
  })

  it('does not change the list it receives', () => {
    const list = Object.freeze(events(5).map((e) => Object.freeze(e)))
    expect(() => sepGroup(list as SepEvent[], 1, 2)).not.toThrow()
    expect(list).toEqual(events(5))
  })
})

describe('pickSepEvent: the seeded choice', () => {
  it('picks the same event for the same index', () => {
    const list = events(5)
    expect(pickSepEvent(list, 3)).toEqual(pickSepEvent(list, 3))
    expect(pickSepEvent(list, 3)).toEqual(list[3])
  })

  it('wraps around for an index past the end, in a stable way', () => {
    const list = events(5)
    expect(pickSepEvent(list, 7)).toEqual(list[2])
    expect(pickSepEvent(list, 12)).toEqual(pickSepEvent(list, 7))
  })

  it('returns null when there is no event, so nothing is invented', () => {
    expect(pickSepEvent([], 0)).toBeNull()
    expect(pickSepEvent([], 9)).toBeNull()
  })
})

describe('sepEvents: the events of the committed snapshot', () => {
  it('returns the events of the committed 2024-05 snapshot, in order', () => {
    const list = sepEvents()
    expect(list.length).toBeGreaterThan(0)
    expect(list).toEqual(readSepSnapshot(committed()).events)
  })

  it('reads the snapshot once: every call returns the same list', () => {
    expect(sepEvents()).toBe(sepEvents())
  })

  it('is frozen: changing the list or one of its events throws', () => {
    const list = sepEvents()
    expect(list.length).toBeGreaterThan(0)
    expect(() => (list as SepEvent[]).push({ date: 'x', url: 'https://example.test' })).toThrow(
      TypeError,
    )
    expect(() => {
      ;(list[0] as { date: string }).date = 'changed'
    }).toThrow(TypeError)
  })
})

describe('the committed snapshot file (T017)', () => {
  it('is { range, fetchedAt, sep } for May 2024', () => {
    const snapshot = committed()
    expect(snapshot.range).toContain('2024-05')
    expect(Number.isNaN(Date.parse(snapshot.fetchedAt))).toBe(false)
    expect(Array.isArray(snapshot.sep)).toBe(true)
  })

  it('never saves flr or cme as an empty list (that would read as "no flares")', () => {
    const snapshot = committed()
    for (const key of ['flr', 'cme'] as const) {
      if (key in snapshot) expect(snapshot[key]).not.toEqual([])
    }
  })

  it('does not contain the API key', () => {
    const text = rawSnapshots[SNAPSHOT_FILE]
    expect(text, 'src/data/snapshots/2024-05.json is missing (T016/T017)').toBeDefined()
    expect(text).not.toMatch(/api_key/i)
    expect(text).not.toContain('DEMO_KEY')
  })
})
