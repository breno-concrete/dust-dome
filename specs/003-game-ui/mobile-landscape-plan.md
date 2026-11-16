# Plano de Execução: Adaptação Mobile Landscape & Tablet (`shared/mobile-landscape-ui`)

**Skills Obrigatórias**:
- [`specs/003-game-ui/skills/mobile-landscape-ui/SKILL.md`](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/003-game-ui/skills/mobile-landscape-ui/SKILL.md)
- [`specs/003-game-ui/skills/responsive-visual-review/SKILL.md`](file:///home/pedr0melo/ProjetosProg/mars-outpost/specs/003-game-ui/skills/responsive-visual-review/SKILL.md)

> **REGRA DE OURO INEGOCIÁVEL**:
> **NÃO QUEBRAR NEM ALTERAR NADA NO COMPUTADOR (DESKTOP).**
> Toda regra base dos `.module.css` deve continuar intacta. As adaptações para celular e tablet devem ficar **estritamente isoladas** dentro de `@media (orientation: landscape) and (max-height: 520px)`, `@media (hover: none) and (pointer: coarse)` e `@media (orientation: portrait) and (max-width: 760px)`.

---

## Fase 1: Viewport, Safe Areas, Trava Horizontal (`PortraitOverlay`) e `TitleScreen`

- [x] **T1.1 — `index.html` e `src/ui-kit/tokens.css`**:
  - Em [`index.html`](file:///home/pedr0melo/ProjetosProg/mars-outpost/index.html), adicionar `viewport-fit=cover` na meta tag `viewport`.
  - Em [`src/ui-kit/tokens.css`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/ui-kit/tokens.css), adicionar `--safe-top`, `--safe-right`, `--safe-bottom`, `--safe-left` com `env(safe-area-inset-*, 0px)`.
  - Garantir que `.screen` permita scroll vertical completo em telas baixas respeitando `--safe-*`.
- [x] **T1.2 — `src/app/App.module.css` e `PortraitOverlay` (`src/app/App.tsx`)**:
  - Em [`src/app/App.module.css`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/app/App.module.css), adicionar `height: 100dvh;` abaixo de `height: 100vh;` em `.stage` e proteger gestos (`overscroll-behavior: none; user-select: none; -webkit-user-select: none;`).
  - Criar overlay visual de orientação vertical (`.portraitOverlay`, `display: none` por padrão no desktop/landscape e `display: flex` apenas em `@media (orientation: portrait) and (max-width: 760px)`) com ícone de rotação 90° e mensagem bilíngue (`EN` / `PT` via `useT`).
- [x] **T1.3 — `src/features/title/TitleScreen.tsx` & `TitleScreen.module.css`**:
  - Em [`src/features/title/TitleScreen.module.css`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/features/title/TitleScreen.module.css), adicionar `@media (orientation: landscape) and (max-height: 520px)` para que `.logo`, `.planet`, `.menu` (`Play` e `Sources`) e `.language` nunca se sobreponham em `800×360` e `667×375`, respeitando `--safe-*`.
  - Em [`src/features/title/TitleScreen.tsx`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/features/title/TitleScreen.tsx), ao iniciar missão em dispositivo touch, tentar `screen.orientation?.lock?.('landscape')` dentro de `try/catch` silencioso.
- [x] **T1.4 — Ciclo de Autocrítica da Fase 1 (`responsive-visual-review`)**:
  - Validar `TitleScreen` e `PortraitOverlay` nos viewports `1440×900`, `800×360`, `667×375` e `390×844` (teto: 10 iterações até zero sobreposição e zero mudança no desktop).

---

## Fase 2: HUD Compacta, Botão de Fullscreen (Exclusivo Celular) e Controles 3D

- [x] **T2.1 — Botão de Fullscreen exclusivo para Celular (`src/features/hud/Hud.tsx`, `Hud.module.css`, `Hud.test.tsx`)**:
  - Escrever teste unitário primeiro em `Hud.test.tsx` verificando a alternância do botão de tela cheia (`requestFullscreen` / `exitFullscreen` com `try/catch` seguro).
  - Adicionar botão `.fullscreenButton` no `timePanel` de [`src/features/hud/Hud.tsx`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/features/hud/Hud.tsx) com `display: none` no Desktop e `display: inline-flex` **apenas** em `@media (hover: none) and (pointer: coarse), (orientation: landscape) and (max-height: 520px)`.
  - Ao ativar fullscreen, tentar também `screen.orientation?.lock?.('landscape')` com `try/catch`.
- [x] **T2.2 — Refinamento da HUD e Tripulação em Mobile Landscape (`src/features/hud/Hud.module.css`)**:
  - Dentro de `@media (orientation: landscape) and (max-height: 520px)`:
    - Aplicar recuos seguros (`max(8px, var(--safe-top/left/right/bottom))`).
    - Compactar `.heatAlert` e `.weather` (`top: 62px` e `top: 94px`) para não cobrirem o centro da cena 3D.
    - Ajustar `.crewPanel` na barra inferior esquerda para nunca colidir com `.powerDock` e `.buildDock` em `667×375`.
- [x] **T2.3 — Controles de Câmera e Toque 3D (`src/features/scene/Scene.tsx`, `Scene.module.css`)**:
  - Em [`src/features/scene/Scene.module.css`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/features/scene/Scene.module.css), adicionar `@media (orientation: landscape) and (max-height: 520px)` para `.cameraControls`: posicionar sem colidir com `.upgrades` / `.tutorialCard`, garantir `min-height: 44px; min-width: 44px;` nos botões e ocultar os rótulos de teclado `Q` / `E` em `@media (hover: none) and (pointer: coarse)`.
  - Em [`src/features/scene/Scene.tsx`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/features/scene/Scene.tsx), manter o comportamento de `mouse` **100% inalterado**, e apenas para `pointerType === 'touch'`:
    - Ignorar `onClick` se houve arrasto de câmera (`> 8px` entre `pointerdown` e `pointerup`).
    - Quando `placing !== null` no touch, usar confirmação em 2 toques (1º toque faz `hoverAt(tile)` para mostrar o preview verde/vermelho; 2º toque no mesmo tile executa `placeAt(tile)`).
- [x] **T2.4 — Ciclo de Autocrítica da Fase 2 (`responsive-visual-review`)**:
  - Validar `HUD + Scene` nos viewports `1440×900`, `800×360`, `667×375` e `852×393` (teto: 10 iterações até zero colisão de HUD/docks/câmera, `.fullscreenButton` oculto no desktop e visível no mobile).

---

## Fase 3: Painéis, Modais da Vega, Minigame `RepairQte` e Telas Finais

- [x] **T3.1 — Painéis e Modais (`src/features/decisions/Panel.module.css`, `src/ui-kit/Modal.module.css`)**:
  - Dentro de `@media (orientation: landscape) and (max-height: 520px)`:
    - Ajustar `.powerDock`, `.buildDock`, `.placementBanner`, `.power`, `.upgrades` e `.tutorialCard` com `--safe-right` / `--safe-bottom`, alturas máximas em `100dvh` e `overflow-y: auto`.
    - Compactar `.cardGrid` e `.preview` (`height: 72px`) do `BuildMenu` para caberem confortavelmente na altura curta.
    - Garantir que `.commander` e `.alarm` mantenham o retrato da Vega e o texto **lado a lado** (em linha) quando em landscape curto, com retrato reduzido.
- [x] **T3.2 — Minigame `RepairQte` (`src/features/repair/RepairQte.module.css`)**:
  - Adicionar `@media (orientation: landscape) and (max-height: 520px)` em [`src/features/repair/RepairQte.module.css`](file:///home/pedr0melo/ProjetosProg/mars-outpost/src/features/repair/RepairQte.module.css) para que `.box` e `.targetArea` caibam 100% dentro de `calc(100dvh - 16px)` sem cortar os parafusos nem o botão `Give up / Desistir` em `800×360` e `667×375`.
- [x] **T3.3 — Telas de Fim de Jogo e Fontes (`EndScreen.module.css`, `SourcesScreen.module.css`)**:
  - Garantir rolagem vertical completa (`100dvh`, `overflow-y: auto`) em `EndScreen` e `SourcesScreen` quando abertas em telas baixas.
- [x] **T3.4 — Ciclo de Autocrítica da Fase 3 & Gate Final (`responsive-visual-review`)**:
  - Validar `BuildMenu`, `PowerPanel`, `Upgrades`, `BriefingDialog`/`VegaNotice`/`RadiationAlarmModal`, `RepairQte`, `EndScreen` e `SourcesScreen` nos 6 viewports (teto: 10 iterações).
  - Rodar `npm run check` (Prettier, `oxlint`, `tsc -b`, Vitest e `vite build` todos com código `0`).
  - Preencher a rubrica completa de `responsive-visual-review/SKILL.md` e aguardar aprovação humana.
