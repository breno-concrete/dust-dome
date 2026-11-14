# Guia de Validação Rápida: UI 2D do Jogo e Kit de UI

**Funcionalidade**: `specs/003-game-ui/` | **Data**: 2026-11-14 | **Branch**: `ui/003-game-ui`

Este guia apresenta cenários executáveis para validar a interface 2D e o Kit de UI de ponta a ponta, sem depender de motores 3D ou simulações demoradas.

---

## 1. Pré-Requisitos e Ambiente de Execução

- Node.js 20+ e npm instalados.
- Dependências instaladas (`npm install`).
- Ambiente de testes: Vitest em ambiente `jsdom` com `@testing-library/react`.

```bash
# Executar todos os testes da área de UI
npm run test -- src/features/hud src/features/decisions src/features/title src/ui-kit

# Validar linting e formatação
npm run check
```

---

## 2. Cenários de Validação Rápida

### Cenário 1: Validação do HUD e Sinais Vitais (História de Usuário 1)
**Objetivo**: Confirmar que o HUD exibe barras vitais com metas de vitória, pisca em estoques baixos, reflete déficit de energia e monitora a exposição dos astronautas.

- **Comando de Teste**:
  ```bash
  npx vitest run src/features/hud/Hud.test.tsx
  ```
- **Procedimento no Teste**:
  1. Inicializar a store com `useGameStore.getState().start(42)`.
  2. Injetar estoque de oxigênio baixo (< 4 U):
     ```ts
     useGameStore.setState({
       game: {
         ...useGameStore.getState().game!,
         stock: { ...useGameStore.getState().game!.stock, oxygen: 2 }
       }
     })
     ```
  3. Renderizar `<Hud />`.
- **Resultado Esperado**:
  - Exibição de `/ 16` como meta de vitória no oxigênio.
  - O elemento do oxigênio contém indicador/classe de alerta piscante.
  - Botões de velocidade alteram `useGameStore.getState().speed`.

---

### Cenário 2: Catálogo de Construção e Acessibilidade de Custos (História de Usuário 2)
**Objetivo**: Confirmar que o menu de construção agrupa estruturas por nível tecnológico, desabilita construções caras demais apontando o recurso faltante e permite selecionar/cancelar colocação.

- **Comando de Teste**:
  ```bash
  npx vitest run src/features/decisions/BuildMenu.test.tsx
  ```
- **Procedimento no Teste**:
  1. Inicializar a store com estoque zerado de materiais.
  2. Renderizar `<BuildMenu />`.
- **Resultado Esperado**:
  - Os botões das estruturas mostram "Faltam X [recurso]" e ficam desabilitados.
  - Ao injetar materiais para uma estrutura (ex.: 15 Hematita para Painel Solar), o botão fica habilitado.
  - Ao clicar na estrutura, `useGameStore.getState().placing` passa a ser `'solar_panel'`.
  - Botão "Cancelar" desativa o modo de colocação.

---

### Cenário 3: Chaves de Energia, Briefings e Alarme de Radiação (História de Usuário 3)
**Objetivo**: Validar a alternância de modos de energia (Off / Min / Max), a pausa e exibição do briefing da Comandante Vega e a ação de abrigo emergencial.

- **Comando de Teste**:
  ```bash
  npx vitest run src/features/decisions/
  ```
- **Procedimento no Teste**:
  1. Renderizar `<PowerPanel />` e alternar chave da mina para `'off'`.
  2. Verificar que `game.powerModes.mine` foi alterado para `'off'`.
  3. Renderizar `<BriefingDialog />` com estado de briefing ativo e verificar pausa da simulação.
  4. Injetar tempestade de radiação em fase `'warning'` e renderizar `<RadiationAlarmModal />`:
     - O botão "Abrigar Tripulação" / "Take Shelter" chama `shelterAll()`.
- **Resultado Esperado**:
  - Redução imediata na demanda de energia ao desligar instalações.
  - Transmissão da Comandante Vega pausando o jogo e orientando a estação.
  - Alarme de 10 segundos disparando recolhimento geral da tripulação em um clique.

---

### Cenário 4: Alternância Bilíngue e Acessibilidade (História de Usuário 4)
**Objetivo**: Validar a alternância instantânea entre Inglês e Português e a responsividade em telas reduzidas.

- **Comando de Teste**:
  ```bash
  npx vitest run src/features/title/ src/ui-kit/
  ```
- **Procedimento no Teste**:
  1. Renderizar `<TitleScreen />`.
  2. Clicar no botão de idioma (`Português` / `English`).
  3. Verificar que os rótulos de todos os botões se atualizam imediatamente.
- **Resultado Esperado**:
  - Tradução reativa sem recarregamento da página.
  - Alvos de clique de no mínimo 44×44px em todos os botões interativos.

---

## 3. Validação Visual no Navegador

Para executar a aplicação localmente e inspecionar visualmente:

```bash
npm run dev
```

1. Acesse `http://localhost:5173`.
2. Clique em **"Start mission"** / **"Começar missão"**.
3. Verifique o HUD no topo: barras de oxigênio, água e comida com marcas de meta, medidor de energia, carteira de materiais e controles de tempo.
4. Abra o menu de construção à esquerda e teste selecionar estruturas e observar as fichas de ciência.
5. Alterne o idioma no topo ou tela inicial e comprove a tradução dinâmica.
