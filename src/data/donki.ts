// Owner: Dev A. The ONLY place that knows where real NASA data comes from.
// Snapshots of real DONKI solar energetic particle (SEP) events live in ./snapshots
// (downloaded by `npm run data:fetch`). The engine receives plain data, never fetches.

export interface SepEvent {
  /** ISO date of the real event. */
  date: string
  /** Link to the event in DONKI. */
  url: string
}

// TODO(Dev A, US3): load the committed snapshot and return its SEP events.
export function sepEvents(): SepEvent[] {
  return []
}

// TODO(Dev A, US3): pick the real event a game radiation storm is based on (seeded index).
export function pickSepEvent(events: SepEvent[], index: number): SepEvent | null {
  return events.length ? events[index % events.length] : null
}
