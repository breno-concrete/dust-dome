# DONKI snapshots

Owner: Dev A. Downloaded by `npm run data:fetch`, committed to the repo so the game works
offline and judges always see the same data. One file per month, named `<YYYY-MM>.json`, e.g.
`2024-05.json`. Never hand-edit these files.

Format: `{ range, fetchedAt, sep }`. `flr` and `cme` are optional and currently left out.

- `sep` holds the records exactly as the DONKI API returned them. The game converts them to
  `{ date, url }` in `src/data/donki.ts`, not here.
- `flr` and `cme` are omitted on purpose, not forgotten: the game only uses SEP; the FLR
  request returned 404 on `api.nasa.gov` (not confirmed why; re-check the response body before
  relying on it); CME was left out for size (about 340 KB for one month, and a static import
  would bundle it into the game). Never save an omitted or failed list as `[]`: an empty array
  would read as "no flares". The parser ignores these keys if they exist and does not require
  them. To add them later, run `npm run data:fetch` again with them included.
- The API key (`NASA_API_KEY`, `DEMO_KEY` as fallback) is read from the environment or from
  `.env.local` (git-ignored). It is never written to a snapshot or to the recorded URL.
- A range that crosses months is refused: the file name is one month.
