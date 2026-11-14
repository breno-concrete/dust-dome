# How we work (48 h, 4 devs, 2 POs, spec-driven + test-first)

The rules live in `.specify/memory/constitution.md` (Part II is the game). This page is the
practical version. Sprints, schedule and the branch flow (`develop` → `main`) are in
[WORKFLOW.md](WORKFLOW.md).

## 1. Who owns what

| Area                                    | Owner | Branch prefix                          | Paths                                                                                                                      | Spec                     |
| --------------------------------------- | ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Engine core, store, app shell, repo, CI | Breno | `engine/` (`shared/` for shared files) | `src/engine/` (not `events/`), `src/app/`, `src/config/schema.ts`, `src/config/loadConfig.ts`, `src/config/config.test.ts` | `specs/001-engine-core/` |
| Events and NASA data, sources, debrief  | Dev A | `data/`                                | `src/engine/events/`, `src/data/`, `scripts/`, `src/features/sources/`, `src/features/end/`                                | `specs/002-events-data/` |
| 2D game UI, UI kit, title               | Dev B | `ui/`                                  | `src/ui-kit/`, `src/features/title/`, `src/features/hud/`, `src/features/decisions/`                                       | `specs/003-game-ui/`     |
| Isometric scene, repair QTE             | Dev C | `scene/`                               | `src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/`                                           | `specs/004-base-scene/`  |
| Game content and balance                | POs   | `content/` (or GitHub's `*-patch-N`)   | `src/config/*.json`                                                                                                        | —                        |

The CI job **ownership** fails any PR that touches files outside the area of its branch prefix.
Shared files (`.github/CODEOWNERS`) need the owner's approval. Everyone adds credits only in
their own section of `CREDITS.md`.

## 2. The contract (already in the repo)

- `src/config/schema.ts` (config), `src/engine/types.ts` (game state, actions),
  `src/app/store.ts` (what the UI and the scene can read and call).
- `tick()` runs: time → events (Dev A) → power → production → jobs → crew → outcome.
- Contract change: post in the group, open a `shared/` PR touching only contract files, Breno
  merges it in under 10 minutes, everyone runs `git pull --rebase`.

## 3. One spec per dev, one PR per user story

1. `git switch develop && git pull && git switch -c <prefix>/spec`
2. In Claude Code:
   `/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/00X-<area> Read specs/00X-<area>/brief.md and the constitution, and specify it.`
3. `/speckit-clarify` only if the spec has `[NEEDS CLARIFICATION]`: ask the POs.
4. `/speckit-plan`, then `/speckit-tasks`. Steps 2–4 take about 45 min.
5. Open the spec PR (spec.md, plan.md, tasks.md); a PO skims it; merge.
6. For each user story: new branch `<prefix>/us<N>-<short-name>`, then the TDD loop below.

## 4. TDD loop with the agent (every user story)

1. **Red:** `/speckit-implement` only the story's test tasks. Run `npx vitest run <file>`; the new
   tests must fail for the right reason. Commit: `test(us2): power balance and brownout (red)`.
2. **Green:** `/speckit-implement` the story's implementation tasks until those tests pass.
   Commit: `feat(us2): power balance and brownout`.
3. **Refactor**, then `npm run check`. Open the PR; merge when CI is green.

Read the tests the agent writes before accepting them: they are the spec in code.

## 5. Branches and PRs

1. Story PRs target `develop` (the default branch). `main` only changes at the end of a sprint,
   through the sprint review PR `develop` → `main` (merge commit). Nobody pushes to `main` or
   `develop` directly.
2. One user story per PR, under ~300 changed lines. Open early as Draft.
3. Before merging: `git fetch origin && git rebase origin/develop`, then `npm run check`.
4. Green CI (+ owner approval only for shared files) → **you** squash-merge it into `develop`.
5. After a merge, post "merged X" in the group. Everyone rebases within the hour.
6. `develop` red = top priority. The author fixes it in 10 minutes or reverts.
7. One sprint review per user story round replaces fixed checkpoints; the schedule and the
   review steps are in [WORKFLOW.md](WORKFLOW.md). Code freeze Sunday **14:00**.

## 6. Avoiding conflicts

- No new dependencies. Need one? Ask Breno (`shared/` PR).
- `package-lock.json` conflict: `git checkout origin/develop -- package-lock.json && npm install`.
- No barrel `index.ts` files. Import from the file directly.
- No global CSS outside `src/ui-kit/tokens.css`. Use `Something.module.css`.
- UI texts live next to each screen (`strings` object). Game texts live in `src/config/*.json`.

## 7. POs editing the JSON

Edit the file on github.com (pencil icon) → "Create a new branch and start a pull request".
CI checks the game-design rules (`src/config/config.test.ts`). Open the PR's preview link to
play the change.
