---
name: mobile-landscape-ui
description: >-
  Adaptação responsiva Mobile Landscape e Tablet para o projeto Mars Outpost (Dust Dome),
  com isolamento estrito entre Desktop e Celular, trava de orientação horizontal,
  safe-area-insets, botão de Fullscreen exclusivo para mobile e ergonomia de toque 3D/2D.
---

# Mobile Landscape & Responsive UI Architecture (Mars Outpost)

Esta skill define as regras arquiteturais, breakpoints, padrões de CSS e interações de toque para tornar o **Mars Outpost (Dust Dome)** 100% jogável em celulares (travados na horizontal) e tablets, **sem alterar absolutamente nada na experiência Desktop existente**.

---

## 1. Regra de Ouro Inegociável: Isolamento Estrito Computador vs. Celular

1. **Zero Regressão no Desktop (`> 1024px` ou `pointer: fine` com altura `> 520px`)**:
   - **PROIBIDO** alterar os estilos base (fora de `@media`) dos arquivos `.module.css` de modo que mude tamanhos de fonte, paddings, larguras de colunas, posicionamentos ou comportamentos no computador.
   - Todo layout, botão, modal, HUD e interação de mouse que já funciona no Desktop deve permanecer pixel-a-pixel idêntico em `1440×900` e `1920×1080`.
   - **PROIBIDO** quebrar qualquer um dos testes automatizados existentes (`npm run check` / `vitest`). Em ambiente `jsdom` (onde `matchMedia` / `fullscreenEnabled` não estão ativos por padrão), a UI deve continuar se comportando exatamente como antes.

2. **Media Queries Oficiais de Isolamento**:
   - **Mobile Landscape (Foco Principal — Celular Deitado)**:
     ```css
     @media (orientation: landscape) and (max-height: 520px) { ... }
     ```
   - **Mobile Landscape Ultra-Compacto (Telas de `320px`–`380px` de altura útil)**:
     ```css
     @media (orientation: landscape) and (max-height: 400px) { ... }
     ```
   - **Tablet / Landscape Compacto (`768px`–`1024px` ou Touch Médio)**:
     ```css
     @media (orientation: landscape) and (min-height: 521px) and (max-width: 1024px) { ... }
     ```
   - **Exclusivo para Dispositivos Touch / Mobile (ex.: Botão Fullscreen e Otimizações de Toque)**:
     ```css
     @media (hover: none) and (pointer: coarse), (orientation: landscape) and (max-height: 520px) { ... }
     ```
   - **Bloqueio de Retrato (Celular em Pé — Portrait Gate)**:
     ```css
     @media (orientation: portrait) and (max-width: 760px) { ... }
     ```

---

## 2. Viewport, Safe Areas (Notch / Dynamic Island) e Gestos

1. **`index.html` (`viewport-fit=cover`)**:
   - Garantir `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` em `index.html` para que os navegadores mobile informem as dimensões reais do notch lateral e da barra de gestos inferior.
2. **Tokens de Safe Area em `src/ui-kit/tokens.css`**:
   - Definir em `:root`:
     ```css
     --safe-top: env(safe-area-inset-top, 0px);
     --safe-right: env(safe-area-inset-right, 0px);
     --safe-bottom: env(safe-area-inset-bottom, 0px);
     --safe-left: env(safe-area-inset-left, 0px);
     ```
   - No computador, todas essas variáveis valem `0px` (zero impacto no desktop).
   - No celular horizontal (`@media (orientation: landscape) and (max-height: 520px)`), usar `max(8px, var(--safe-left))`, `max(8px, var(--safe-right))`, `max(6px, var(--safe-top))` e `max(6px, var(--safe-bottom))` nos elementos ancorados nas bordas (`header.hud`, `.crewPanel`, `.buildDock`, `.powerDock`, `.cameraControls`).
3. **Altura Dinâmica (`100dvh`) e Prevenção de Scroll Acidental**:
   - Em `src/app/App.module.css`, `.stage` deve manter `height: 100vh; height: 100dvh;` e `overscroll-behavior: none; user-select: none; -webkit-user-select: none;` para evitar que o jogador dispare *pull-to-refresh* ou seleção de texto ao arrastar a câmera 3D.
   - Telas de documento (`EndScreen`, `SourcesScreen`) devem continuar permitindo scroll vertical fluido em telas baixas (`max-height: 100dvh; overflow-y: auto; -webkit-overflow-scrolling: touch;`).

---

## 3. Trava na Horizontal (Landscape Lock + Overlay de Rotação)

1. **Overlay "Gire o Dispositivo" (`PortraitOverlay`)**:
   - Criar um aviso visual integrado (oculto por padrão com `display: none` no desktop e em landscape) que só é exibido em `@media (orientation: portrait) and (max-width: 760px)`.
   - Deve ter `position: fixed; inset: 0; z-index: 9999;`, estética alinhada à paleta marciana do jogo, ícone claro de celular girando 90° e texto bilíngue (`EN` / `PT` via `useT`):
     - `PT`: *"Gire seu celular para a horizontal para comandar a base."*
     - `EN`: *"Rotate your phone to landscape to command the outpost."*
   - **Importante para testes**: usar `aria-hidden="true"` quando oculto ou controlar apenas por CSS `@media (orientation: portrait) and (max-width: 760px)` para nunca interferir em queries do Testing Library (`getByRole`) nos testes unitários.
2. **Bloqueio Programático Seguro (`screen.orientation.lock`)**:
   - Ao entrar em tela cheia (ou clicar em Play em dispositivo touch), tentar:
     ```ts
     try {
       await screen.orientation?.lock?.('landscape')
     } catch {
       // Ignorado silenciosamente em navegadores que não suportam (ex.: Safari iOS)
     }
     ```

---

## 4. Botão de Fullscreen na HUD (Exclusivo para Celular)

1. **Visibilidade Estrita**:
   - O botão de Fullscreen na HUD (`src/features/hud/Hud.tsx` / `Hud.module.css`) deve ter `display: none` no Desktop!
   - Só deve aparecer no celular/tablet via:
     ```css
     @media (hover: none) and (pointer: coarse), (orientation: landscape) and (max-height: 520px) {
       .fullscreenButton {
         display: inline-flex;
       }
     }
     ```
2. **Comportamento e Acessibilidade**:
   - Dimensão mínima de toque: `44px × 44px` (`min-width: 44px; min-height: 44px;`), posicionado no `timePanel` (ao lado dos botões de velocidade) ou no canto superior da HUD mobile.
   - Alterna entre entrar e sair de tela cheia (`document.fullscreenElement` / `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`), com fallback `webkitRequestFullscreen` e tentativa automática de `screen.orientation?.lock?.('landscape')`.
   - Textos/labels acessíveis via `useT` (`EN`: `"Fullscreen"` / `"Exit fullscreen"`, `PT`: `"Tela cheia"` / `"Sair da tela cheia"`).
   - Se a API de Fullscreen falhar ou for bloqueada, tratar com `try/catch` sem quebrar a aplicação.

---

## 5. Orçamento Vertical e Layout por Componente (Mobile Landscape `<= 520px` de altura)

Em uma tela de celular horizontal (`667×375` ou `800×360`), a soma de `Top HUD + Bottom Controls` não pode passar de **~110px–120px**, deixando o centro livre para a base 3D:

1. **HUD Superior (`src/features/hud/Hud.module.css`)**:
   - Barra superior compacta (`min-height: 48px–54px`), respeitando `--safe-top`, `--safe-left`, `--safe-right`.
   - `.lifePanel` (O₂, Água, Comida): 3 colunas horizontais compactas com barras e valores claros.
   - `.timePanel`: data compacta + botões de velocidade (`44×44px` de área clicável) + botão `.fullscreenButton` (exclusivo mobile).
   - `.materials`: grid horizontal compacto (3×2 ou linha enxuta) sem estourar a altura da primeira linha.
   - Alertas `.heatAlert` e `.weather`: em `@media (orientation: landscape) and (max-height: 520px)`, posicionar logo abaixo da barra superior (`top: 62px` / `top: 92px`, compactos em pílula horizontal) para não tampar o centro da cena 3D.

2. **Barra Inferior: Tripulação + Docks + Controles de Câmera (`Hud.module.css`, `Panel.module.css`, `Scene.module.css`)**:
   - **Problema atual a corrigir**: `.cameraControls` em `Scene.module.css` não tem regra para `(orientation: landscape) and (max-height: 520px)` e fica flutuando em `top: 150px`, batendo em cima de painéis e da Vega.
   - **Solução em Mobile Landscape**:
     - `.cameraControls`: posicionar de forma compacta logo abaixo do canto superior direito da HUD (`top: calc(max(8px, var(--safe-top)) + 58px); right: max(8px, var(--safe-right));`) OU integrado na faixa inferior entre a tripulação e os docks, com botões de `min-height: 44px` (respeitando o touch target) e ocultando as letras de atalho de teclado (`Q` / `E`) no touch para economizar largura!
     - `.crewPanel` (inferior esquerdo), `.powerDock` e `.buildDock` (inferior direito): usar `bottom: max(8px, var(--safe-bottom))` e larguras enxutas que não colidam mesmo em `667px` de largura.

3. **Painéis Laterais e Gavetas (`.power`, `.upgrades`, `.tutorialCard` em `Panel.module.css`)**:
   - Em `@media (orientation: landscape) and (max-height: 520px)`:
     - `.power` e `.upgrades`: posicionados à direita (`right: max(8px, var(--safe-right))`), altura máxima `calc(100dvh - 124px)`, com `overflow-y: auto` suave (`overscroll-behavior: contain`) para que o jogador consiga rolar todos os switches de energia ou botões de reparo/demolição sem cortar nada.
     - `.tutorialCard` (Vega): posicionado à esquerda/centro-inferior ou abaixo da HUD (`max-height: calc(100dvh - 124px); overflow-y: auto;`), compacto (`padding: 10px 12px`), retrato da Vega reduzido (`56×62px`), sem cobrir o botão que o tutorial pede para clicar (`.tutorialPulse`).

4. **Modais (`Modal.module.css`, `BuildMenu`, `BriefingDialog`, `RadiationAlarmModal`)**:
   - Em `@media (orientation: landscape) and (max-height: 520px)`:
     - `.backdrop` e `.backdropWide`: `padding: max(8px, var(--safe-top)) max(12px, var(--safe-right)) max(8px, var(--safe-bottom)) max(12px, var(--safe-left))`.
     - `.dialog` / `.wide`: `max-height: calc(100dvh - 16px)`, header e footer enxutos (`padding: 8px 14px`), e `.content` com `overflow-y: auto`.
     - **Catálogo de Construção (`BuildMenu` / `.cardGrid`)**: reduzir altura de `.preview` de `112px` para `72px` em landscape curto e usar `grid-template-columns: repeat(auto-fill, minmax(165px, 1fr))` com `gap: 10px`, permitindo ver múltiplos cards lado a lado e rolar com facilidade.
     - **Briefing / Alarme da Vega (`.commander`, `.alarm`)**: manter retrato da Vega e texto **lado a lado (em linha)** no landscape (nunca empilhar em coluna quando a tela é baixa e larga!), reduzindo o retrato para `84×92px`.

5. **Minigame de Reparo (`src/features/repair/RepairQte.module.css`)**:
   - Em `@media (orientation: landscape) and (max-height: 520px)`:
     - Transformar `.box` em um layout compacto que caiba 100% dentro de `calc(100dvh - 16px)` **sem precisar de scroll**:
     - Usar grid de 2 colunas (`grid-template-columns: minmax(170px, 0.85fr) 1.35fr; align-items: stretch; gap: 12px;`) ou compactar cabeçalho + `.targetArea` (`height: clamp(160px, calc(100dvh - 130px), 240px)`) para que todos os 5 parafusos (`15%..85%`) e o botão `Desistir / Give up` fiquem 100% visíveis e clicáveis em `667×375` e `800×360`.

6. **Tela Inicial (`TitleScreen.module.css`) e Telas Finais (`EndScreen.module.css`, `SourcesScreen.module.css`)**:
   - **`TitleScreen` em `@media (orientation: landscape) and (max-height: 520px)`**:
     - Evitar que `.logo` e `.menu` se sobreponham: diminuir `.logo img` (`width: min(260px, 38vw, 34dvh)`) no topo (`top: max(12px, var(--safe-top))`), posicionar `.menu` mais compacto (`bottom: max(14px, var(--safe-bottom)); gap: 10px;`) ou dispor os botões `Play` e `Sources` lado a lado (`flex-direction: row; width: min(520px, 84vw);`), mantendo botões com `min-height: 50px`.
   - **`EndScreen` e `SourcesScreen`**:
     - Garantir que o container `.screen` permita rolagem vertical completa em telas baixas e respeite `--safe-left`, `--safe-right` e `--safe-bottom`.

---

## 6. Ergonomia de Toque na Cena 3D (`src/features/scene/Scene.tsx`)

1. **Prevenção de Clique Acidental ao Arrastar a Câmera (Drag vs. Tap)**:
   - Rastrear a posição inicial do ponteiro (`onPointerDown`) no wrapper/canvas. Se o ponteiro se moveu mais que `8px` até o `onClick`, ignorar o `onClick` no chão/estrutura para que arrastar o mapa com o dedo nunca construa nem deselecione estruturas por engano.
2. **Construção em 2 Toques no Touch (`pointerType === 'touch'`)**:
   - No Desktop (`pointerType === 'mouse'`), manter **exatamente** o comportamento atual (hover move o preview, 1 clique constrói).
   - Apenas quando `e.pointerType === 'touch'` e `placing !== null`:
     - Se o jogador tocar em um tile diferente do `hoverTile` atual, atualizar `hoverAt(tile)` (exibindo o preview 3D verde/vermelho naquele tile) sem chamar `placeAt` imediatamente.
     - Quando tocar novamente no mesmo `hoverTile` (2º toque de confirmação), executar `placeAt(tile)` e tocar o som `place-structure`.
