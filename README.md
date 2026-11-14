# Mars Outpost

NASA Space Apps Challenge 2026 — _Build a Junior Astronaut Mission Trainer_.

A browser game for kids aged 7–12. Four astronauts land in Hellas Planitia, Mars, and have four
Martian years to build a base that survives real Martian seasons, dust storms and solar storms,
so that the first colonists can arrive. Every choice trades power, life support and protection,
and the numbers come from real NASA science.

## Run it

Requires Node 22.18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # all tests
npm run check    # everything CI runs: format, lint, typecheck, tests, build
```

## Project layout

```
src/
  config/             game content and balance as JSON + schema + design-rule tests
  engine/             pure simulation: time, economy, power, jobs, crew, outcome
  engine/events/      climate events and radiation storms (seeded)
  data/               real NASA data (DONKI snapshots)
  app/                store, real-time loop, selectors, screen layout
  features/scene/     isometric base (React Three Fiber), lazy-loaded
  features/repair/    repair minigame
  features/hud/       vital bars, power, wallet, clock, time controls
  features/decisions/ build menu, power switches, briefings, alerts
  features/title/     title screen
  features/end/       mission debrief
  features/sources/   the real science behind the game
  ui-kit/             shared components, design tokens, i18n
specs/                one Spec Kit folder per developer (brief, spec, plan, tasks)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how the team works, the
[constitution](.specify/memory/constitution.md) for the rules of the project and the game, and
[CREDITS.md](CREDITS.md) for data sources and assets.
