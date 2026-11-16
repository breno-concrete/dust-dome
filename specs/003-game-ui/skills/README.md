# Skills de UI Responsiva (Mobile Landscape & Tablet)

Estas skills documentam a arquitetura de adaptação responsiva do **Mars Outpost (Dust Dome)** para celulares na horizontal e tablets, mantendo isolamento total em relação ao Desktop:

- [`mobile-landscape-ui/SKILL.md`](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/003-game-ui/skills/mobile-landscape-ui/SKILL.md) — regras de isolamento Desktop vs. Celular, `100dvh`, `safe-area-inset`, trava de orientação horizontal (`PortraitOverlay` + `screen.orientation.lock`), botão de Fullscreen exclusivo para celular, layouts compactos por componente e ergonomia de toque no grid 3D.
- [`responsive-visual-review/SKILL.md`](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/003-game-ui/skills/responsive-visual-review/SKILL.md) — matriz de 6 viewports canônicos (`1440×900`, `800×360`, `667×375`, `852×393`, `1024×768`, `390×844`), checklist das 7 telas críticas e critérios de rejeição imediata.

## Como ativar no seu agente local

```bash
mkdir -p ~/.gemini/skills
cp -r specs/003-game-ui/skills/mobile-landscape-ui ~/.gemini/skills/
cp -r specs/003-game-ui/skills/responsive-visual-review ~/.gemini/skills/
```
