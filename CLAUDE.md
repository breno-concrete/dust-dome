# Instructions for AI coding agents

Read `.specify/memory/constitution.md` before doing anything. It wins over everything else.
Part II of it is the game; every number lives in `src/config/*.json`.

## Know your area

Your area comes from the current git branch prefix:

| Prefix     | Area                           | You may edit                                                                                                                                         |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/`  | Engine core, store, app shell  | `src/engine/` (not `events/`), `src/app/`, `src/config/schema.ts`, `src/config/loadConfig.ts`, `src/config/config.test.ts`, `specs/001-engine-core/` |
| `data/`    | Events and NASA data           | `src/engine/events/`, `src/data/`, `scripts/`, `src/features/sources/`, `src/features/end/`, `specs/002-events-data/`                                |
| `ui/`      | 2D UI and UI kit               | `src/ui-kit/`, `src/features/title/`, `src/features/hud/`, `src/features/decisions/`, `specs/003-game-ui/`                                           |
| `scene/`   | Isometric scene and repair QTE | `src/features/scene/`, `src/features/repair/`, `public/models/`, `public/audio/`, `specs/004-base-scene/`                                            |
| `content/` | Game content (POs)             | `src/config/*.json`                                                                                                                                  |

Everyone may also add lines to their own section of `CREDITS.md`.

## Branches

Story branches start from `develop` and their PRs target `develop` (squash merge). Only the
sprint review PR goes from `develop` to `main` (merge commit). One user story per branch, per
Claude Code session and per PR. Schedule and sprint review: `WORKFLOW.md`.

## Test-first, always (constitution VIII)

For every task:

1. **Red.** Write the test first, or turn an `it.todo` into a real test. Run only that file,
   e.g. `npx vitest run src/engine/time.test.ts`, and show that it fails for the right reason.
2. **Green.** Write the minimum code that makes it pass. Run the file again.
3. **Refactor.** Clean up with the tests green.
4. Before saying a task is done, run `npm run check` and fix what fails.

- Tests come from the spec's acceptance scenarios and describe behavior, not balance numbers.
- Engine and events: plain Vitest on pure functions. UI: add `// @vitest-environment jsdom` at
  the top and use Testing Library with the real store (`useGameStore.setState` to set up a state).
  Scene: test the pure functions (`iso.ts`, `visualState.ts`), not the R3F components.
- Never delete, skip or weaken a test to make it pass. Never edit another area's tests.

## Hard rules

- Never edit a file outside your area. If you need something from another area, stop and write
  a "contract change request" (what you need and why) instead of editing it.
- Never add or upgrade dependencies, and never edit `package.json`, `package-lock.json`,
  `tsconfig*.json`, `vite.config.ts`, `.github/`, `.specify/` or `.claude/` unless the branch
  prefix is `shared/`.
- The engine is pure: no React, no fetch, no `Math.random` (use `src/engine/rng.ts` with
  `state.rng`), no timers.
- Components use `useGameStore` and `src/app/selectors.ts`; never import `src/engine/` or
  `src/data/` from a component. The scene and the QTE may only call `hoverAt`, `placeAt`,
  `selectStructure` and `finishQte`.
- A `useGameStore` selector returns only primitives or existing references. Never build a new
  object or array inside it (infinite re-render, React error #185); compute it in render.
- Player-facing text: English required, Portuguese optional, plain words for ages 7–12.
- CSS Modules next to the component. The only global CSS is `src/ui-kit/tokens.css`.

## Spec Kit

One spec per developer. Always pass your area's spec folder explicitly:

```
/speckit-specify SPECIFY_FEATURE_DIRECTORY=specs/004-base-scene Read specs/004-base-scene/brief.md and the constitution, and specify it.
```

Then `/speckit-plan` and `/speckit-tasks` in the same session. Implement one user story at a time:
`/speckit-implement` for that story's test tasks first (red), then its implementation tasks
(green). Setup and infrastructure already exist: plans and tasks must not create them again.
