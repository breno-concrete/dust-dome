# Debrief and Sources Contract

## Debrief input

The end-of-mission feature consumes:

- the final `GameState.status` and `lostReason`;
- the complete `GameState.log`;
- validated configuration explanations and sources;
- the archived DONKI citation associated with a radiation storm.

## Debrief output

The screen presents:

- a success or failure summary;
- entries grouped by cycle and season or by event;
- one plain-English cause for every recorded crew, structure, or resource loss;
- the science explanation or explicit gameplay-simplification label;
- a restart action using the existing store navigation.

No historical outcome may be invented from the final stock or structure list.

## Sources output

The sources screen presents deduplicated `DataSource` entries with:

- source label;
- link;
- classification: real value, scaled value, game simplification, or game value;
- an archived-data label for DONKI snapshots.

Sources remain English-first and use short words suitable for ages 7-12. Components read
application state through the existing store boundary; any missing store exposure is a contract
change request.
