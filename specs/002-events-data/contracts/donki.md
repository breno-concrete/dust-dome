# DONKI Data Contract

## Types

```ts
interface SepEvent {
  date: string
  url: string
}

function sepEvents(): SepEvent[]
function pickSepEvent(events: SepEvent[], index: number): SepEvent | null
```

Defined in `src/data/donki.ts`.

## Behavior

- `sepEvents()` reads only committed snapshot data under `src/data/snapshots/`.
- Returned entries contain a usable date and DONKI URL.
- No runtime network access is performed.
- `pickSepEvent([], index)` returns `null`.
- For non-empty input, the same index selects the same event, including for indices larger than
  the list length through stable wraparound.
- Invalid snapshot records are rejected or reported explicitly; they are not converted into a
  made-up source.

The engine receives plain `SepEvent` data and does not know the snapshot file format.
