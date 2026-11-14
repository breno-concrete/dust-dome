# Quickstart: Events and NASA Data

## Prerequisites

- Node.js `>=22.18`
- Dependencies installed with the repository lockfile
- Working branch with the `data/` prefix

## Focused validation

Run the event tests:

```powershell
npx vitest run src\engine\events\events.test.ts
```

Expected result: scheduling, dust, darkness, global-storm, and radiation-storm tests pass.

Run the DONKI tests:

```powershell
npx vitest run src\data\donki.test.ts
```

Expected result: snapshot parsing, deterministic selection, and empty-data behavior pass.

Run screen tests when US4 is implemented:

```powershell
npx vitest run src\features\end\EndScreen.test.tsx src\features\sources\SourcesScreen.test.tsx
```

Expected result: the debrief accounts for logged outcomes and the sources screen labels science,
game values, simplifications, and archived DONKI data.

## Data snapshot validation

Use the existing script only when refreshing an explicitly approved archive range:

```powershell
npm run data:fetch -- 2024-05-01 2024-05-31
```

The resulting snapshot must be committed under `src/data/snapshots/`, reviewed for the expected
SEP fields, and never fetched by the browser at runtime.

## Full validation

Before each story PR:

```powershell
npm run check
```

Expected result: formatting, lint, type checking, all tests, and build pass. The ownership job is
verified separately by CI before merge.

## Manual scenario checklist

1. Start two missions with the same seed and advance them through the same season; compare event
   times and targets.
2. Observe a dust storm and confirm its solar reduction ends when the storm ends.
3. Confirm damaged, clogged, and short-circuited structures remain in that state until repaired
   or cleaned.
4. Reach a radiation warning, shelter the crew, and confirm the storm names an archived DONKI
   event.
5. Finish a mission with logged losses and confirm the debrief explains every cause.
