# Credits and references

Everything not written by the team goes here (Space Apps requires it).
Add lines only in your own area's section to avoid merge conflicts.

## NASA and space agency data (Dev A)

All data sources used by the game are also listed in-game on the sources screen.

| Dataset                        | Used for                 | Link                                    | Live / archive / curated |
| ------------------------------ | ------------------------ | --------------------------------------- | ------------------------ |
| Space Weather Database (DONKI) | Solar events in the game | https://kauai.ccmc.gsfc.nasa.gov/DONKI/ | archive                  |

## 3D models, textures and sound (Dev C)

| Asset                                                                                                                                         | Author                            | License          | Link            |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------- | --------------- |
| Sound effects in `public/audio/` (placement, selection, radiation alarm, dust and radiation storm loops, bolt click, repair success and fail) | Breno (team), original recordings | Made by the team | `public/audio/` |

## Fonts, icons and UI art (Dev B)

| Asset                                                         | Author                                                          | License                                   | Link                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| SVG icons and HUD visual design adapted for the game UI       | Figma Make prototype provided by Sauma                          | No license stated in the supplied archive | `Menu para Base Espacial.zip` (local source, not committed) |
| Dust & Dome logo on the title screen (hexagon badge cut away) | Provided by the team with the menu mock-up (author to confirm)  | To confirm                                | `src/features/title/logo.png`                               |
| Mars picture on the title screen (`planet.webp`)              | Rendered from the game's own title scene code (`MenuScene.tsx`) | Made by the team                          | `src/features/title/planet.webp`                            |

## Libraries (Breno)

React, Vite, three.js, React Three Fiber, drei, Zustand, Zod, Vitest, Testing Library, jsdom, Prettier, oxlint (all MIT).
GitHub Spec Kit (MIT) for spec-driven development.

## AI ("Super Intelligence") use (everyone)

- Repository scaffold, CI and Spec Kit setup generated with Claude (Anthropic).
- English versions of the product owners' Portuguese game texts in `src/config/*.json` translated
  with Claude (Anthropic) and reviewed by the team.
- UI kit components and HUD implementation assistance: Google DeepMind Antigravity CLI.
- Sprint 2 construction and upgrade UI, and adaptation of the supplied Figma Make icons: GitHub Copilot.
- Review and fixes of the sprint 2 construction/upgrade UI and HUD: Claude Code (Anthropic).
- Sound playback code for the scene and repair QTE (`sound.ts` and its tests): Claude Code (Anthropic).
- Title screen 3D menu and landing transition (`src/features/title/`, models built in code): Claude Code (Anthropic).

<!-- Add where and how AI tools were used. AI images/videos need a visible watermark. -->
