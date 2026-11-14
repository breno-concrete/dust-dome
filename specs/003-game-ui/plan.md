# Plano de Implementação: UI 2D do Jogo e Kit de UI

**Branch**: `ui/003-game-ui` | **Data**: 2026-11-14 | **Especificação**: [spec.md](spec.md)

**Entrada**: Especificação de funcionalidade de `specs/003-game-ui/spec.md` e Constituição do Projeto.

---

## Sumário

Implementação completa da interface bidimensional (2D) e do Kit de UI reutilizável de Mars Outpost (área do Dev B), garantindo que um jogador de 7 a 12 anos consiga monitorar sinais vitais, energia e carteira de recursos, gerenciar construções e melhorias com fichas educativas da NASA, operar chaves elétricas, acompanhar os briefings da Comandante Vega, responder a tempestades de radiação com abrigo em um clique e jogar integralmente em inglês ou português mesmo em dispositivos móveis ou caso a visualização 3D não carregue.

A abordagem técnica baseia-se em componentes puros de React com CSS Modules, tokens de design nativos sem dependências externas, consumo de estado através do Zustand (`useGameStore`) com seletores de tipos primitivos para evitar render loops (Erro #185), internacionalização modular com `useT()` e desenvolvimento estritamente orientado a testes (TDD) via Vitest e Testing Library em ambiente `jsdom`.

---

## Contexto Técnico

- **Linguagem / Versão**: TypeScript 5.8+ (React 19)
- **Dependências Principais**: React 19, Zustand 5, CSS Modules nativo (sem bibliotecas pesadas de UI)
- **Armazenamento**: Estado em memória gerenciado pelo Zustand (`useGameStore`); dados e configurações balanceadas em `src/config/*.json`
- **Ambiente de Testes**: Vitest 3+ com Testing Library (`@testing-library/react`, `@testing-library/user-event`) sob ambiente `jsdom` (`// @vitest-environment jsdom`)
- **Plataforma Alvo**: Navegadores Web modernos (desktop, tablets escolares e smartphones)
- **Tipo de Projeto**: Web Application (Single-Page Application frontend)
- **Metas de Desempenho**: Renderização instantânea (< 16ms por frame de UI), tempo de carregamento < 2s, alvos de toque >= 44×44px
- **Restrições**: Sem novas dependências externas (Princípio VIII); sem uso de cores como único sinal; texto bilíngue EN/PT; acessibilidade WCAG AA; isolamento estrito de arquivos da área Dev B
- **Escopo**: 4 Histórias de Usuário entregues em 4 etapas/PRs incrementais:
  1. *US1*: Kit de UI básico + HUD (barras vitais com alvos, aviso de reserva baixa, medidor de energia, carteira de materiais, exposição da tripulação)
  2. *US2*: Menu de construção (níveis tecnológicos 1–3, custos faltantes, fichas educativas) + painel de melhorias para a estrutura selecionada
  3. *US3*: Chaves de energia (Off / Min / Max), diálogos de briefing com Comandante Vega e modal emergencial de tempestade de radiação com abrigo em 1 clique
  4. *US4*: Tela inicial, alternância bilíngue instantânea (PT/EN), layout responsivo para celular e revisão de acessibilidade

---

## Verificação da Constituição (Constitution Check)

*GATE: Validação pré e pós-design com base na Constituição v2.1.0:*

| Princípio da Constituição | Requisito do Projeto | Status de Conformidade |
|---|---|---|
| **I. Trade-offs Reais** | Recursos e custos vêm de `src/config/*.json`. Nada de valores hardcoded em código. | **Aprovado**: A UI consome estruturas, custos e taxas diretamente do arquivo de configuração e exibe custos com total clareza. |
| **II. Ciência Real com Rótulos Honestos** | Conceitos baseados em dados reais da NASA (MOXIE, Hellas, DONKI) com explicações educativas. | **Aprovado**: Fichas de construção trazem explicações educativas e o alarme de radiação referencia eventos DONKI reais. |
| **III. Para Crianças de 7–12 anos em Navegador** | Linguagem simples, sem downloads/login, textos grandes, ícones acompanhados de palavras, cores nunca sozinhas, inglês e português, sem mídia de menores. | **Aprovado**: Botões com toque >= 44px, contraste WCAG AA, ícones pareados com textos, alternância EN/PT instantânea. |
| **IV. Propriedade Clara por Contratos** | Dev B edita apenas em `src/ui-kit/`, `src/features/title/`, `src/features/hud/`, `src/features/decisions/`. Seletores do Zustand retornam apenas primitivos/referências. | **Aprovado**: Escopo rigorosamente delimitado aos diretórios de posse do Dev B. Seletores desenhados para retorno de tipos primitivos. |
| **V. Visualização 2.5D com Fallback 2D** | O jogo permanece 100% funcional caso o WebGL/3D falhe. | **Aprovado**: A UI 2D permite colocar estruturas, gerenciar energia, acionar abrigo e avançar ciclos autonomamente. |
| **VI. Tempo Real Controlado pelo Jogador** | Controles de pausa e velocidade 1× / 2× / 4× sempre visíveis; briefings pausam o jogo. | **Aprovado**: HUD fixa botões de velocidade e o briefing sazonal congela a simulação até ser dispensado. |
| **VII. A Falha Ensina (Failure Teaches)** | Todo perigo letal é precedido por aviso visível (reserva baixa pulsante, exposição a 75%, alarme de 10s de radiação). Reinício em um clique. | **Aprovado**: Alertas animados no HUD para reservas < 1 estação, aviso em 75% de radiação e banner de 10s para abrigo. |
| **VIII. Test-First, Small, Green** | TDD mandatório; testes com Testing Library e `useGameStore.setState` sem esperar pelo motor; sem novas dependências. | **Aprovado**: Estruturado para testes primeiro em cada US (`Hud.test.tsx`, `BuildMenu.test.tsx`, etc.). Nenhuma dependência externa adicionada. |

---

## Estrutura do Projeto

### Documentação (esta funcionalidade)

```text
specs/003-game-ui/
├── brief.md              # Requisitos originais do Dev B
├── spec.md               # Especificação de requisitos funcionais e critérios
├── checklists/
│   └── requirements.md   # Validação de qualidade da especificação
├── plan.md               # Este plano de implementação
├── research.md           # Decisões técnicas e justificativas de arquitetura
├── data-model.md         # Modelos de dados e fluxos de estado
├── quickstart.md         # Roteiro de validação e testes
└── contracts/            # Contratos de componentes TypeScript
    ├── ui-kit.ts
    ├── hud.ts
    └── decisions.ts
```

### Código-Fonte (Diretórios de Propriedade do Dev B)

```text
src/
├── ui-kit/                        # Kit de UI transversal
│   ├── tokens.css                 # Variáveis CSS de cores, espaçamentos, tipografia
│   ├── i18n.ts                    # Hook useT() e armazenamento de idioma (useLang)
│   ├── Button.tsx                 # Botão com variantes, foco e alvos >= 44px
│   ├── Button.module.css
│   ├── ResourceBar.tsx            # Barra com marcador de alvo e pulso de alerta
│   ├── ResourceBar.module.css
│   ├── Card.tsx                   # Contêiner acessível de informações
│   ├── Card.module.css
│   ├── Modal.tsx                  # Diálogo acessível com foco e backdrop
│   ├── Modal.module.css
│   └── Icon.tsx                   # Ícones vetoriais inline de recursos e status
│
├── features/
│   ├── hud/                       # Painel superior principal
│   │   ├── Hud.tsx                # Vitals, power meter, carteira, tripulação, tempo
│   │   ├── Hud.module.css
│   │   └── Hud.test.tsx           # Testes unitários do HUD (TDD)
│   │
│   ├── decisions/                 # Painéis e janelas de decisão
│   │   ├── BuildMenu.tsx          # Catálogo por níveis, cálculo de custos e fichas
│   │   ├── BuildMenu.module.css
│   │   ├── BuildMenu.test.tsx     # Testes do menu de construção
│   │   ├── UpgradePanel.tsx       # Melhorias específicas da estrutura selecionada
│   │   ├── PowerPanel.tsx         # Chaves Off / Min / Max por instalação
│   │   ├── BriefingDialog.tsx     # Briefings sazonais com Comandante Vega
│   │   ├── RadiationAlarmModal.tsx # Alarme emergencial de 10s com abrigo em 1 clique
│   │   └── decisions.test.tsx     # Testes de energia, briefings e alarme
│   │
│   └── title/                     # Tela inicial
│       ├── TitleScreen.tsx        # Início de missão, fontes e toggle de idioma
│       └── TitleScreen.test.tsx   # Testes da tela inicial e alternância de idioma
```

---

## Rastreamento de Complexidade (Complexity Tracking)

*Nenhuma violação aos princípios da Constituição foi identificada. O design preserva a simplicidade com componentes React puros e CSS Modules sem adição de bibliotecas de terceiros.*
