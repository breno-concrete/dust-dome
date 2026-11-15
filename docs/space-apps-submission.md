# Dust & Domes — Space Apps 2026 submission

Challenge: Build a Junior Astronaut Mission Trainer
Deadline: Sunday 2026-11-15, 23:59 local time (team target: 20:00)
Everything below goes into the project form in English.

## 1. Project Name ✅

Dust & Domes

## 2. High-Level Project Summary ✅

Dust & Domes is a free browser game that trains kids aged 7–12 to think like mission engineers
on Mars. Four astronauts land in Hellas Planitia, and the player has four Martian years to build
a base that keeps everyone alive, so that 32 colonists can arrive. Players balance three core
systems: power, life support (oxygen, water and food) and protection. Every structure is a real
trade-off, because it costs materials and draws power. The base faces real Martian seasons, dust
storms and solar radiation storms based on real events from NASA's DONKI database. When dust
breaks a machine, an astronaut goes outside and the player tightens the bolts in a quick repair
minigame before time runs out. Commander
Vega, the narrator, explains the "why" before each season, and a sources screen shows which rules
are real science and which are game simplifications. It runs in any desktop or mobile browser,
in English and Portuguese, with no download or login, so it is ready for classrooms and families.

## 3. Link to Project Demo (30 s video OR up to 7 slides, public link)

Format: 30 s screen-recorded video, English captions on screen, no voice, no faces.
Upload: YouTube "Unlisted". Plan B at 19:00: 7 slides with screenshots.

Link: TODO

| Time    | On screen                                                    | Caption                                                 |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| 0–4 s   | Title screen                                                 | DUST & DOMES: a Mars mission trainer for kids 7–12      |
| 4–9 s   | Commander Vega briefing                                      | Land in Hellas Planitia. Build a home for 32 colonists. |
| 9–15 s  | Placing a solar panel and an oxygen generator; HUD bars move | Balance power, life support and protection.             |
| 15–20 s | Dust storm hits, a panel breaks                              | Real Martian seasons and dust storms test your base.    |
| 20–24 s | Repair minigame, bolts clicked                               | Send an astronaut out. Fix it fast!                     |
| 24–27 s | Radiation storm alert                                        | Solar storms based on real NASA DONKI data.             |
| 27–30 s | Sources screen, then end card                                | Free in any browser. Real NASA science. + game link     |

## 4. Link to Final Project (public link, no login)

Link: TODO (playable game URL, once deployed)

Code: https://github.com/breno-concrete/dust-dome (public; mention it in field 5 and add the
play link at the top of the README)

## 5. Detailed Project Description ✅

**What it does**

Dust & Domes is a real-time base-building game for kids aged 7–12. Four astronauts land on the
eastern rim of Hellas Planitia, where orbital radar found water-ice glaciers buried under the
dust. The player has four Martian years to build a base that is ready for 32 colonists: enough
oxygen, water and food for everyone, and six habitat modules. The mission is a junior astronaut
training run. Kids learn to plan ahead, read the base's vital signs and make engineering
trade-offs.

**How it works**

- Three core systems: power (kW from solar panels, batteries and a compact nuclear reactor),
  life support (oxygen, water, food) and protection (thermal insulation, radiation shelters,
  dust filters). Materials such as hematite, regolith, iron and steel pay for everything.
- The player builds 11 kinds of structures in three levels on an isometric 12×12 grid, installs
  upgrades and sets each machine type to Off, Base or Max power. Using more power than the base
  makes causes a brownout, and machines start shutting down.
- Time is real: one Martian year is 20 minutes, with pause and 1×, 2× and 4× speed. The seasons
  follow the real southern-hemisphere Martian year, so summer gives the most sunlight and winter
  is long, cold and dark.
- Building, repairing and cleaning send an astronaut outside, where a radiation exposure meter
  fills up. At 75% the astronaut comes back inside alone, so exposure never kills.
- Each Martian year is harder than the last: dust devils break solar panels, dust storms clog
  machines, and a global dust storm like the one in 2018 almost blacks out the Sun. To fix a
  broken machine, the player plays a quick repair minigame: tap five bolts in six seconds.
- Once a year, a solar radiation storm gives a 10-second alarm. The crew must take shelter in
  time. The alert names the real NASA DONKI solar particle event the storm is based on.
- Commander Vega, the narrator, briefs the player at the start of every season: what the season
  is, why it happens on Mars and how to prepare. Every structure has a short description that
  explains its real-world basis, for example MOXIE for the oxygen generator.
- Failure teaches. Every deadly event has a visible warning first. At the end, a debrief
  explains each season and each loss in plain words, with links to the real science.
- A sources screen lists every NASA reference and clearly labels what is real science and what
  is a game simplification. Archived data is never shown as live.

**Benefits**

- Free, in any desktop or mobile browser, with no download, account or login, so it is ready for
  classrooms and families.
- Written for kids: plain words, big text, icons always paired with words, and color is never
  the only signal. Available in English and Portuguese.
- It connects play to real missions: Perseverance's MOXIE, MRO's SHARAD radar, the Opportunity
  rover, NASA's Fission Surface Power project and NASA DONKI.

**What we hope to achieve**

We want kids to feel what mission engineers feel: every choice has a cost, and good planning
keeps people alive. We hope teachers use Dust & Domes in science class to start conversations
about Mars, energy and space weather, and that kids leave curious about real NASA missions.

**How we built it**

A team of 4 software engineers and 2 aerospace engineers built it in 48 hours. The aerospace
engineers own the game design and balance, and every number lives in JSON files they can tune
without touching code.

- TypeScript, React and Vite for the app; Three.js with React Three Fiber and drei for the
  isometric 3D base; Zustand for state; Zod to validate the game configuration.
- A pure, deterministic simulation engine with a seeded random number generator, so the same
  mission seed always plays the same way.
- Real NASA DONKI data saved as snapshots in the repository, so the game never depends on a live
  API.
- Test-first development with Vitest and Testing Library; oxlint, Prettier and GitHub Actions
  CI on every pull request; spec-driven development with GitHub Spec Kit.
- Source code: https://github.com/breno-concrete/dust-dome

## 6. Use of AI ("Super Intelligence") ✅

Yes. We used AI tools as assistants. The team designed the game, wrote the specs, chose the
science and the balance numbers, and reviewed every AI output. Every code change went through
tests first (a failing test, then the code) and a pull request review.

- Code: Claude Code (Anthropic) helped write and review code in the engine, the UI, the title
  screen and the sound playback. GitHub Copilot helped with the build and upgrade menus. Google
  DeepMind Antigravity CLI helped with the UI kit components and the HUD. AI-assisted commits are
  marked with a "Co-Authored-By" line in the git history.
- Project setup: the repository scaffold, CI and Spec Kit setup were generated with Claude
  (Anthropic).
- Game text: our aerospace engineers wrote every game text in Portuguese. The English versions
  were translated with Claude (Anthropic) and reviewed by the team.
- Images: the title logo was generated with Google Gemini. The characters were drawn by the team
  and then refined with Figma's AI. The icons and the HUD layout were adapted from a prototype
  made with Figma Make. AI-generated images carry a visible "AI-generated" watermark.
- This project page: the texts were drafted with Claude (Anthropic) and reviewed by the team.
- Not AI: the game design, the balance numbers, the science choices, the original character
  drawings and the sound effects (recorded by the team).

Every AI use is listed in CREDITS.md in the repository.

## 7. NASA Data ✅ (all links checked in Chrome on 2026-11-15)

**Data used in the game**

- **NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), CCMC at NASA
  Goddard.** We downloaded the Solar Energetic Particle (SEP) events of May 2024 from the DONKI
  SEP API (api.nasa.gov) with our own script and saved them in the repository as an archived
  snapshot. Each radiation storm in the game is modeled on one of these real events, and its
  alert, the debrief and the sources screen name the event's date and link to its DONKI page.
  The game never calls the API while you play, and archived data is never shown as live.
  https://ccmc.gsfc.nasa.gov/tools/DONKI/

**NASA science behind the game rules**

- **Mars seasons** (NASA Science, Mars Facts): the order and real length of the
  southern-hemisphere seasons (142, 154, 194 and 178 sols), scaled to 20 minutes per Martian
  year, plus the cold and the winter darkness.
  https://science.nasa.gov/mars/facts/
- **The 2018 global dust storm and the Opportunity rover** (NASA JPL Education): the dust storms
  and the global dust storm that almost blacks out the Sun.
  https://www.jpl.nasa.gov/edu/resources/teachable-moment/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on/
- **MOXIE on the Perseverance rover** (NASA JPL): the oxygen generator. One oxygen unit is
  about 62 kg of O₂, scaled from the MOXIE team's estimate for a crew of four.
  https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/
- **NASA Fission Surface Power project**: the 40 kW compact nuclear reactor.
  https://www.nasa.gov/centers-and-facilities/glenn/nasas-fission-surface-power-project-energizes-lunar-exploration/
- **Mars Reconnaissance Orbiter's SHARAD radar** (NASA JPL): buried water-ice glaciers in the
  Hellas region, the reason the base is built there and can mine ice.
  https://www.jpl.nasa.gov/news/nasa-spacecraft-detects-buried-glaciers-on-mars/

The in-game sources screen lists all of these and labels what is real science and what is a
game simplification.

## 8. Space Agency Partner Data & Other References ✅

**Space agency partner data:** none. All space data in the game comes from NASA (see NASA Data).

**Other references (text and science)**

- Scientific American, "Lost Opportunity: After a 15-Year Odyssey, NASA's Trailblazing Mars
  Rover Approaches Its End": dust devils on Mars (a game simplification).
  https://www.scientificamerican.com/article/lost-opportunity-after-a-15-year-odyssey-nasas-trailblazing-mars-rover-approaches-its-end/
- Wikipedia, "Hellas Planitia": background on the landing site.
  https://en.wikipedia.org/wiki/Hellas_Planitia [remove this line if the POs replace it in the
  game]

**Open-source software (code)**

- React and React DOM (MIT), three.js (MIT), React Three Fiber (MIT), drei (MIT), Zustand (MIT),
  Zod (MIT): the game.
- Vite and @vitejs/plugin-react (MIT), TypeScript (Apache-2.0): building the game.
- Vitest (MIT), Testing Library (MIT), jsdom (MIT), Prettier (MIT), oxlint (MIT): tests and code
  quality.
- GitHub Spec Kit (MIT): spec-driven development.

**Images, 3D and sound**

- 3D models: built in code by the team (no downloaded models).
- Mars picture on the title screen: rendered from the game's own 3D code by the team.
- Title logo: generated with Google Gemini (AI), with a visible AI watermark.
- Characters: drawn by the team and refined with Figma's AI, with a visible AI watermark.
- Icons and HUD layout: adapted from a prototype a team member made with Figma Make (AI).
- Design reference images for the 3D scene (in the repository's specs folder, not in the game):
  generated with Figma's AI.
- Sound effects: recorded by the team.
- Fonts: the device's system font only (no font files shipped).

**Game texts:** written in Portuguese by the team's aerospace engineers; English translation with
Claude (Anthropic), reviewed by the team.

**License of our project:** MIT (LICENSE file in the repository).

The full list is in CREDITS.md in the repository.

## 9. Final checks before "Submit for Judging"

- [ ] All fields in English
- [ ] Every link opens in a private window (no login)
- [ ] Demo has no images, video or voices of people under 18
- [ ] AI-generated images and video have a visible watermark: Gemini logo and Figma AI
      characters (Strau, ui/)
- [ ] Logo says "DUST & DOME": regenerate with "DOMES", or accept the mismatch (Strau, ui/)
- [ ] CREDITS.md lists the Gemini logo and the Figma AI characters (Strau, ui/)
- [ ] README title and browser tab (index.html "Mission Trainer") say "Dust & Domes" (shared/)
- [ ] Game is deployed and the link works in a private window (field 4)
- [x] Add a LICENSE file (MIT): PR #58, waiting for approval
- [x] CREDITS.md: TypeScript is Apache-2.0: PR #58
- [x] Visual reference images (Figma AI) listed in CREDITS.md: PR #58
- [ ] Visual reference images: AI images need a visible watermark. They are only design
      references in specs/, but the repo is public. Watermark them or remove them (Pedro, scene/)
- [ ] Game and CREDITS.md use the fixed links from field 7 (POs, content/; Dev A for CREDITS.md):
      kauai DONKI → ccmc.gsfc.nasa.gov/tools/DONKI/ (mission.json), solarsystem .amp →
      science.nasa.gov/mars/facts/ (seasons.json), Wikipedia Hellas → JPL buried glaciers and
      nasa.gov/?p=602427 → full Fission Surface Power URL (structures.json), old JPL Edu URL →
      new one (events.json)
- [ ] Terms and Conditions box checked
- [ ] "Confirm All Work is Original" box checked
