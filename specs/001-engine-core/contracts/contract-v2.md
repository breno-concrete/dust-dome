# Contract v2: delta for the `shared/contract-v2` PR

One PR, opened after announcing it in the group, merged fast, then everyone runs
`git pull --rebase`. It touches only the files below. New behaviors arrive as stubs returning
`not_implemented` plus `it.todo`s; US4 and US5 implement them test-first. Why each change:
[research.md](../research.md) R10, R12, R18.

## `src/engine/types.ts` (owners: breno-concrete, caio-nascime)

```ts
export type ActionError =
  | 'not_enough_resources'
  | 'tile_blocked'
  | 'out_of_bounds'
  | 'not_connected' // NEW: a habitat module must share a side with an existing one
  | 'external_jobs_blocked'
  | 'not_allowed'
  | 'not_implemented'

export interface Astronaut {
  // …existing fields…
  /** NEW: recalled by the player; takes no job until exposure is back to 0. */
  resting: boolean
}
```

## `src/config/schema.ts` (owners: breno-concrete, caio-nascime)

```ts
// in StructureDefSchema
/** NEW: a new structure of this type must share a side with one of these types (if any exists). */
connectsTo: z.array(z.string()).default([]),
```

`src/config/config.test.ts`: new design rule "connectsTo only lists structure types that exist".
The existing rule "the starting base fits on the grid" keeps passing (the first habitat has no
other habitat to touch).

## `src/config/structures.json` (owner: athyelbrito)

One line on `habitat`: `"connectsTo": ["habitat"]`.

## `src/engine/actions.ts` and `src/engine/game.ts` (engine)

- Stubs `bringInside(state, config, astronautId)` and `bringAllInside(state, config)` returning
  `not_implemented`; `shelterAll` removed.
- `createGame`: every astronaut starts with `resting: false`.
- `actions.test.ts`: the two `shelterAll` todos move under `describe('bringAllInside')`; new todos
  for `bringInside`, `not_connected` (`placement.test.ts`), resting, and protecting habitats
  (`crew.test.ts`).

## `src/app/store.ts` (owners: breno-concrete, jvsauma, pedrolmelo)

```ts
bringInside: (astronautId: string) => void   // NEW: crew panel button per astronaut
bringAllInside: () => void                   // NEW: "everyone inside" / "Take shelter" during the alarm
// removed: shelterAll
```

Both go through the same `withGame(...)` wrapper as the other actions, so `lastError` is set on a
refusal. The scene and the QTE still may only call `hoverAt`, `placeAt`, `selectStructure`,
`finishQte`.

## `.specify/memory/constitution.md` (owners: breno-concrete, caio-nascime; Part II: PO approval)

Version 2.1.0 → 2.2.0 (MINOR), with a Sync Impact Report:

- **Principle V**: "Placement is valid on free tiles only; adjacency has no effect" becomes "…free
  tiles only; a new habitat module must share a side with an existing habitat module (corners do
  not count). Adjacency has no other effect."
- **II.2 Win**, item 4: production plus the batteries cover the demand at that moment.
- **II.2 Lose / II.9**: the habitats are connected; when extreme cold or a radiation storm strikes,
  the astronauts inside move into the protecting habitats with room.
- **II.9**: the player can bring one astronaut or everyone inside at any time; a recalled
  astronaut rests until their exposure is back to 0.

## Who is notified

- **jvsauma (UI)**: two crew buttons (`bringInside`, `bringAllInside`), the `not_connected`
  message, the `resting` state in the crew panel.
- **pedrolmelo (scene)**: nothing to do; the placement preview turns red for `not_connected`.
- **caio-nascime (events)**: nothing to do; `Astronaut.resting` is new but events do not use it.
- **athyelbrito (PO)**: approves the JSON line and the Part II readings.
