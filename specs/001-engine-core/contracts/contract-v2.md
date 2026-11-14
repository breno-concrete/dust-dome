# Contract v2: delta for the `shared/contract-v2` PR

One PR, opened after announcing it in the group, merged fast, then everyone runs
`git pull --rebase`. New behaviors arrive as stubs returning `not_implemented` plus `it.todo`s;
US4 and US5 implement them test-first. Why each change: [research.md](../research.md) R10, R12,
R18, and the product owners' decisions of 2026-11-14 (constitution 3.0.0).

## `src/engine/types.ts` (owners: breno-concrete, caio-nascime)

```ts
export type ActionError =
  | 'not_enough_resources'
  | 'tile_blocked'
  | 'out_of_bounds'
  | 'not_connected' // NEW: a habitat module must share a side with another (build and demolish)
  | 'last_habitat' // NEW: the last habitat module cannot be demolished
  | 'no_room_for_crew' // NEW: demolishing this habitat leaves its occupants without room
  | 'external_jobs_blocked'
  | 'not_allowed'
  | 'not_implemented'

export interface Astronaut {
  // …existing fields…
  /** CHANGED: at warnAt the astronaut comes back inside by themselves; never lethal. */
  exposure: number
  /** NEW: brought inside by the player; takes no job until exposure is back to 0. */
  resting: boolean
}

export type JobKind = 'build' | 'upgrade' | 'repair' | 'clean' | 'demolish' // NEW: demolish
export type LogKind = /* … */ 'demolished' // NEW
// LogEntry.cause no longer has "exposure".
```

## `src/config/schema.ts` (owners: breno-concrete, caio-nascime)

```ts
// StructureDefSchema
buildSeconds: z.number().positive(),           // NEW: 30 / 40 / 60 s by level (II.6)
connectsTo: z.array(z.string()).default([]),   // NEW: must share a side with one of these types

// MissionConfigSchema
jobs: { upgradeSeconds, repairSeconds, cleanSeconds, demolishSeconds } // buildSeconds REMOVED
demolishRefundShare: z.number().min(0).max(1)  // NEW: 1 = 100% back
exposure: { maxShareOfSeason, recoveryRate, warnAt, resumeAt }       // NEW: resumeAt
```

`src/config/config.test.ts`: new design rules "every structure takes time to build",
"connectsTo only lists structure types that exist" and "resumeAt is below warnAt".

## `src/config/structures.json` and `mission.json` (owner: athyelbrito)

- Every structure gets `buildSeconds` (level 1: 30, level 2: 40, level 3: 60).
- `habitat` gets `"connectsTo": ["habitat"]`.
- `mission.json`: `jobs.demolishSeconds: 15`, `demolishRefundShare: 1`, `exposure.resumeAt: 0.25`;
  `jobs.buildSeconds` removed.

## `src/engine/actions.ts` and `src/engine/game.ts` (engine)

- Stubs returning `not_implemented`: `bringInside(state, config, astronautId)`,
  `bringAllInside(state, config)` and `demolish(state, config, structureId)`; `shelterAll`
  removed from the engine.
- `createGame`: every astronaut starts with `resting: false`.
- Test plan (`it.todo`): `bringInside`, `bringAllInside` (the old `shelterAll` todos), `demolish`
  and its refusals (`actions.test.ts`); automatic return at `warnAt`, no exposure death, the
  radiation storm (`crew.test.ts`); `resumeAt`, `buildSeconds` per structure and the demolish job
  (`jobs.test.ts`); `not_connected` (`placement.test.ts`); no power target (`outcome.test.ts`).

## `src/app/store.ts` (owners: breno-concrete, jvsauma, pedrolmelo)

```ts
demolish: (structureId: string) => void   // NEW: demolish menu (also cancels a construction)
bringInside: (astronautId: string) => void // NEW: crew panel button per astronaut
bringAllInside: () => void                 // NEW: "everyone inside" / "Take shelter"
/** @deprecated */ shelterAll: () => void   // kept as an alias of bringAllInside
```

All of them go through the same `withGame(...)` wrapper, so `lastError` is set on a refusal. The
scene and the QTE still may only call `hoverAt`, `placeAt`, `selectStructure`, `finishQte`.

## Rules the engine implements behind this contract (constitution 3.0.0)

- Exposure: at `warnAt` the job goes back to the queue with its remaining time and the astronaut
  comes inside; any free astronaut may continue it. A job starts only with an astronaut at or
  below `resumeAt` who is not resting. Nobody dies of exposure.
- Radiation storm: everyone who is not in a habitat with a radiation shelter dies.
- Win: reserves and habitat capacity only; power is not a target.
- Thermal insulation uses `insulatedHeatingKw` of any structure that has it (habitat, greenhouse).

## Who is notified

- **jvsauma (UI)**: `demolish`, `bringInside`, `bringAllInside` (`shelterAll` still works); the
  messages for `not_connected`, `last_habitat` and `no_room_for_crew`; the `resting` state in the
  crew panel; no exposure death in the texts.
- **pedrolmelo (scene)**: nothing to do; the placement preview turns red for `not_connected`.
- **caio-nascime (events)**: no "exposure" cause in the log for the debrief; `Astronaut.resting`
  is new but events do not use it.
- **athyelbrito (PO)**: approves the JSON values (`buildSeconds`, `demolishSeconds`,
  `demolishRefundShare`, `resumeAt`).
