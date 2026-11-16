---
name: responsive-visual-review
description: >-
  Loop de autocrítica visual e geométrica multi-viewport (teto de 10 iterações por fase),
  matriz de 6 dispositivos (Desktop Não-Regressão, Mobile Landscape, Tablet e Portrait Gate),
  rubrica fixa e gate de aprovação humana para a UI responsiva do Mars Outpost.
---

# Responsive & Mobile Landscape Visual Review & Self-Critique Loop

Esta skill define o **ciclo obrigatório de autocrítica iterativa e aprovação humana** para qualquer alteração de responsividade no **Mars Outpost (Dust Dome)**. Nenhum ajuste responsivo pode ser dado como concluído apenas escrevendo CSS no escuro.

---

## 1. Matriz Obrigatória de Viewports (Os 6 Alvos Canônicos)

Toda fase deve ser validada contra estes **6 viewports**:

| Perfil | Resolução (`W × H`) | Tipo de Ponteiro | O que valida |
| :--- | :--- | :--- | :--- |
| **1. Desktop Padrão (Não-Regressão)** | `1440 × 900` | `pointer: fine`, `hover: hover` | **ZERO mudança em relação ao original.** Botão Fullscreen oculto (`display: none`), `PortraitOverlay` oculto, HUD/painéis/modais/cena 100% idênticos. |
| **2. Android Landscape Compacto (Stress Test Vertical)** | `800 × 360` | `pointer: coarse`, `hover: none` | Menor altura útil do mercado. HUD superior, docks inferiores, `RepairQte`, `BuildMenu`, `BriefingDialog` e `TitleScreen` sem corte ou sobreposição. |
| **3. iPhone SE Landscape (Stress Test Horizontal + Vertical)** | `667 × 375` | `pointer: coarse`, `hover: none` | Menor largura em landscape. `.crewPanel` + `.powerDock` + `.buildDock` não podem colidir na barra inferior. |
| **4. iPhone 15 Pro Landscape (Safe Areas + Fullscreen)** | `852 × 393` | `pointer: coarse`, `hover: none` | Valida recuos laterais (`--safe-left` / `--safe-right`) e botão Fullscreen visível e clicável (`>= 44×44px`) na HUD. |
| **5. Tablet Landscape (iPad Mini / Air)** | `1024 × 768` | `pointer: coarse`, `hover: none` | Layout intermediário confortável, alvos de toque `>= 44×44px`, painéis bem proporcionados. |
| **6. Celular em Pé (Portrait Gate)** | `390 × 844` | `pointer: coarse`, `hover: none` | Deve exibir o `PortraitOverlay` (*"Gire seu celular para a horizontal"*) cobrindo 100% da tela. |

---

## 2. Ciclo Obrigatório de Autocrítica (Teto: 10 Iterações por Fase)

Para cada fase (`Fase 1`, `Fase 2`, `Fase 3`), o agente deve executar este loop fechado:

### Passo 1 — Implementar / Ajustar Isoladamente
- Editar apenas os arquivos da fase atual, garantindo que **todo estilo mobile esteja isolado dentro das `@media` queries oficiais** de `mobile-landscape-ui/SKILL.md`.

### Passo 2 — Captura Visual + Auditoria Geométrica (`getBoundingClientRect`) nos 6 Viewports
- Usando navegador real headless (Puppeteer / Playwright apontando `executablePath` para o Chrome local se necessário) ou script de inspeção de layout sobre o `npm run dev`:
  1. **Capturar screenshots determinísticos** em `scratch/responsive-previews/` para os viewports da matriz nas telas afetadas pela fase:
     - `TitleScreen`
     - `HUD + Scene` (jogo aberto em repouso)
     - `BuildMenu` aberto
     - `PowerPanel` e `.upgrades` (estrutura selecionada) abertos
     - `BriefingDialog` / `VegaNotice` / `RadiationAlarmModal`
     - `RepairQte` aberto
     - `EndScreen` e `SourcesScreen`
  2. **Checagem Matemática de Bounding Boxes (`getBoundingClientRect()`)**:
     - **Sem corte de viewport (Zero Clipping):** Nenhum botão ou card visível pode ter `top < 0`, `left < 0`, `right > window.innerWidth` ou `bottom > window.innerHeight` (exceto dentro de container com `overflow-y: auto`).
     - **Sem colisão de elementos (Zero Overlap):** As caixas de `header.hud`, `.cameraControls`, `.crewPanel`, `.powerDock`, `.buildDock` e o painel ativo (`.power` / `.upgrades` / `.tutorialCard`) **não podem se interceptar**.
     - **Touch Target `>= 44×44px`:** Todo botão interativo visível no celular (`800×360`, `667×375`) deve ter `width >= 44` e `height >= 44`.

### Passo 3 — Autocrítica com Rubrica Fixa (Preencher Explicitamente)
Antes de considerar uma fase pronta, o agente deve avaliar cada item abaixo (inspecionando os screenshots gerados com `read_file` se disponíveis e os dados de layout):
- [ ] **1. Desktop Intocado (`1440 × 900`):** Layout, fontes, espaçamentos e posições estão 100% idênticos ao original? `.fullscreenButton` e `.portraitOverlay` estão com `display: none`?
- [ ] **2. Zero Colisão em Mobile Landscape (`800 × 360` e `667 × 375`):** `.crewPanel` (esquerda) e `.powerDock` + `.buildDock` (direita) cabem na barra inferior com folga? `.cameraControls` está longe dos painéis `.upgrades` / `.tutorialCard`?
- [ ] **3. Centro 3D Livre (`>= 55%` da altura):** Em `800 × 360`, o centro da base 3D está desobstruído para enxergar e tocar nas estruturas? Alertas `.heatAlert` / `.weather` estão compactos no topo?
- [ ] **4. Modais, Vega e QTE 100% Visíveis em `360px` de Altura:**
  - `RepairQte` mostra todos os 5 parafusos e o botão `Give up / Desistir` sem precisar de scroll?
  - `BriefingDialog` / `RadiationAlarmModal` / `VegaNotice` mantêm o retrato da Vega **lado a lado** com o texto (sem empilhar em coluna que estoure a altura)?
  - `BuildMenu` permite rolar todos os níveis de estruturas confortavelmente?
- [ ] **5. Botão de Fullscreen Exclusivo para Celular:** Visível e com `>= 44×44px` nos viewports mobile/touch, oculto no Desktop, e protegido com `try/catch`?
- [ ] **6. Portrait Gate (`390 × 844`):** O aviso para girar o celular aparece apenas em retrato mobile e bloqueia a tentativa de jogar em pé?
- [ ] **7. Qualidade de Código (`npm run check`):** Prettier, `oxlint`, `tsc -b`, 100% dos testes do Vitest e `vite build` passam sem erros?

### Passo 4 — Decisão do Loop (Corrigir e Repetir até Passar)
- Se **qualquer** item da rubrica acima falhar:
  - Diagnosticar a causa exata (qual seletor CSS ou cálculo gerou o corte/colisão).
  - Corrigir o CSS/TSX e voltar ao **Passo 2** (**máximo de 10 iterações por fase**).
  - Se atingir 10 iterações ou se o ambiente bloquear a abertura do navegador headless (ex.: falta de biblioteca gráfica no container Snap), **não inventar nem fingir que inspecionou screenshots** — registrar exatamente o que foi validado via código/testes e o que precisa de conferência visual no navegador do usuário.

### Passo 5 — Gate de Aprovação Humana (Com o Pedro)
- Ao concluir as fases e passar na autocrítica:
  - Apresentar o relatório com a **Rubrica Preenchida** (e os screenshots comparativos `Desktop 1440×900` vs `Mobile 800×360` / `667×375` / `Portrait 390×844` caso o navegador headless esteja disponível).
  - **Aguardar aprovação humana** antes de fazer `git commit`, `git push` ou abrir PR.

---

## 3. Falhas Automáticas (Rejeição Imediata na Autocrítica)

- Qualquer alteração visual ou comportamental perceptível no Desktop (`1440 × 900`).
- Botão de Fullscreen aparecendo no computador (`pointer: fine` em tela desktop).
- `RepairQte` cortando o botão `Give up` ou a placa de parafusos em `800 × 360` ou `667 × 375`.
- `.cameraControls` sobreposto ao painel `.upgrades`, `.power` ou `.tutorialCard`.
- Retrato da Vega empilhado em coluna acima do texto em `800 × 360` (empurrando o botão de ação para fora da tela).
- Botões interativos com área de toque menor que `44×44px` no modo mobile.
- Aprovar uma fase sem preencher a rubrica ou com qualquer falha no `npm run check`.
