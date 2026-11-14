# Data Model: Events and NASA Data

## Season event rule

Configured in `GameConfig.events` and `src/config/events.json`.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique rule identifier |
| `kind` | event kind | `dust_devil`, `dust_storm`, `global_dust_storm`, `cold`, or `darkness` |
| `cycles` | positive integer array | Rule applies only to listed cycles |
| `season` | season ID | One of spring, summer, autumn, winter |
| `intervalSeconds` | optional `[min, max]` | Positive interval for repeating events |
| `durationSeconds` | optional positive number | Active duration; absent means instantaneous or season-long |
| `effects` | event effects | Damage, solar factor, clogging, short-circuit, and job blocking |
| `name`, `explain` | localized text | English required; Portuguese optional |
| `source` | data source | Label, valid URL, and science classification required |

## Active event

Stored in `GameState.activeEvents`.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique occurrence ID |
| `ruleId` | string | References the configured rule |
| `kind` | non-radiation event kind | Matches the rule |
| `endsAt` | number or null | End game time; null means season-long |
| `solarFactor` | number | Combined by consumers using the lowest active factor |
| `blocksExternalJobs` | boolean | True when the active event prevents outside jobs |

State transitions:

```text
scheduled -> active -> expired
scheduled -> active -> season boundary cleanup
```

Season-long events expire at the season boundary. Persistent structure statuses created by an
event do not expire with the active occurrence.

## Structure status

Stored on each `StructureInstance.status`.

```text
building -> active
active -> damaged       (dust devil)
active -> clogged       (dust/clog effect)
active -> short_circuit (global dust storm)
damaged/clogged/short_circuit -> active
```

Repairs clear `damaged` and `short_circuit`; cleaning clears `clogged`. Event code must not
silently replace an existing status with an invalid status or target a structure that is absent.

## Radiation storm

Stored in `GameState.radiationStorm` and scheduled through the existing `nextEventAt` map.

| Field | Type | Rules |
|---|---|---|
| `phase` | `warning` or `active` | Warning precedes active phase |
| `phaseEndsAt` | number | Game time when current phase changes |
| `basedOn` | `{ date, url }` or null | Archived DONKI event citation |

State transitions:

```text
none -> warning -> active -> none
```

The warning lasts `mission.radiationStorm.warningSeconds`; the active phase lasts
`mission.radiationStorm.durationSeconds`. The storm is scheduled only from the configured cycle
and season and at most the configured `perCycle` count.

## DONKI snapshot

Stored as committed JSON under `src/data/snapshots/`.

Expected outer shape:

```text
{
  range: string,
  fetchedAt: string,
  flr: unknown[],
  sep: SepEvent[],
  cme: unknown[]
}
```

The game uses only SEP records with:

```text
{
  date: string,
  url: string
}
```

An empty or invalid eligible set returns `null` from selection and must be surfaced explicitly by
the caller; no fabricated citation is allowed.

## Mission log entry

Stored in `GameState.log`.

| Field | Type | Purpose |
|---|---|---|
| `at` | number | Game elapsed time |
| `cycle`, `season` | mission position | Grouping in the debrief |
| `kind` | log kind | Event, status, death, repair, cleaning, or power record |
| `ref` | string | Structure, astronaut, or event identifier |
| `cause` | optional string | Stable key used for plain-language explanation |

The debrief treats the log as append-only history and does not infer historical losses from the
current state.

## Science source

Configured through `DataSource`:

```text
{
  label: string,
  url: valid URL,
  kind: real | scaled | simplification | game_value
}
```

The sources screen must display the classification in kid-friendly English and distinguish
archived DONKI data from live data.
