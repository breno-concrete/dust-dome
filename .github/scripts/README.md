# CI scripts

Owner: Breno (`shared/` branches, CODEOWNERS approval). Everything here is deterministic:
no LLM, no API key, no network except npm and the `gh` CLI. Plain Node ESM, no dependencies.

## What runs when

| Workflow               | When                               | What it does                                                                                                    |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ci.yml` (`check`)     | every PR and every push to `main`  | format, lint, typecheck, tests, build. Stops at the first failure. A failing PR never opens an issue.           |
| `ci.yml` (`ownership`) | every PR                           | The branch prefix must match the files it changes.                                                              |
| `regression-ci.yml`    | push to `main`, every hour, manual | Runs **all** steps without stopping, retries failed test files once, writes a log, opens/updates/closes issues. |

The hourly run is `17 * * * *` (off the hour on purpose: runs at `:00` are the most delayed).
GitHub only runs scheduled workflows on the default branch, and pauses them after 60 days
without repository activity. To turn the schedule off, delete the `schedule:` block in
`regression-ci.yml`; push and manual runs keep working.

## Run the same thing locally

Works the same in PowerShell, cmd and bash (everything goes through npm scripts):

```text
npm run check           # what a PR must pass (stops at the first failure)
npm run ci:regression   # what the Regression workflow does, minus the issues
```

`ci:regression` writes to `ci-out/` (ignored by git): `steps.json`, one log per step in `steps/`,
`vitest.json`, then `errors.json` and `ran.json`. It prints a table with what failed and the exact
command to reproduce it. It exits 1 if anything failed (flaky tests do not count).

## The error log (`ci-out/errors.json`)

One object per distinct failure:

```json
{
  "fingerprint": "sha1(type + spec_id + test)",
  "type": "regression | infra | flaky",
  "spec_id": null,
  "feature": "specs/001-engine-core",
  "area": "engine",
  "source": "tests | step:lint",
  "test": "src/engine/time.test.ts::advanceTime adds dt to the clock",
  "summary": "one short line",
  "excerpt": "at most 40 lines, secrets and e-mails masked",
  "reproduce": "npx vitest run src/engine/time.test.ts",
  "commit": "full sha",
  "run_url": "https://github.com/.../actions/runs/123",
  "first_seen": "ISO-8601",
  "rerun_passed": false
}
```

The fingerprint has no date, run id or temp path, so the same failure on two days has the same hash.

- `flaky`: failed, then passed on the automatic re-run. Logged, never an issue.
- `infra`: network, registry or timeout problems. Logged and the run is red, but no code issue is opened.
- `regression`: a test or step (lint, typecheck, build) that fails twice. Opens an issue.

## Issues (`file-issues.mjs`)

- Searches open issues labeled `ci-failure` for the hidden `<!-- ci-fingerprint: HASH -->`.
- Already open: adds one short comment (date, short commit, run link). Never a second issue.
- New: opens an issue with labels `ci-failure`, `regression` and `area:<name>`.
- More than 10 new failures in one run: opens **one** summary issue instead of a flood.
- Closes an issue only when its failure is gone **and** it provably ran and passed in this run
  (a skipped, renamed or not-run test keeps its issue open).
- Only the `main` branch files issues. Labels are created automatically and idempotently.

## Tests of the CI itself

`tests/ci/*.test.mjs` run with `npm test`. They never touch the network or GitHub: `gh`, the clock and
the process runner are injected and replaced by fakes.

## Security rules for anyone editing the workflows

- `permissions:` is always explicit and minimal; every job has `timeout-minutes`.
- Never `pull_request_target`. Never put `${{ github.event.* }}` (branch name, PR title, issue body)
  inside `run:`: pass it with `env:` and use `"$VAR"`.
- Logs and issues carry at most 40 lines, after masking secrets, e-mails and CPF/CNPJ.
