# Pesquisa Técnica e Decisões de Arquitetura: UI 2D do Jogo e Kit de UI

**Funcionalidade**: `specs/003-game-ui/` | **Data**: 2026-11-14 | **Branch**: `ui/003-game-ui`

Este documento consolida as pesquisas técnicas, decisões de arquitetura e justificativas para o desenvolvimento da UI 2D e do Kit de UI do projeto Mars Outpost (Dev B), em estrita conformidade com a Constituição do Projeto.

---

## 1. Arquitetura do Kit de UI e Sistema de Tokens

### Contexto
O Brief define que a área Dev B é provedora do Kit de UI reutilizável por toda a aplicação: `Button`, `ResourceBar`, `Card`, `Modal`, `Icon`, tokens de design e `useT()`. Os componentes devem ser leves, acessíveis e adequados para o público de 7 a 12 anos.

### Decisão
- **Tokens de Design**: Centralizados em `src/ui-kit/tokens.css` com variáveis CSS nativas (cores com alto contraste WCAG AA, tamanhos de fonte escaláveis em `rem`, espaçamentos modulares, raios de borda amigáveis e alvos mínimos de toque de `44px`).
- **Componentes**:
  - `Button`: Variantes (`primary`, `secondary`, `danger`, `active`), suporte a ícones, estado desabilitado com tooltip/motivo explicativo e dimensões mínimas de 44×44px.
  - `ResourceBar`: Barra de progresso visual com marcações de meta (targets), indicação numérica legível, animação de pulso/alerta para níveis críticos (< 1 estação de consumo) e rótulo textual associado a ícone.
  - `Card`: Contêiner estrutural com bordas arredondadas, fundo com opacidade tática espacial e suporte a cabeçalho e rodapé de ações.
  - `Modal`: Janela de diálogo com suporte a acessibilidade (papel `dialog`, `aria-modal="true"`), foco gerenciado e backdrop que bloqueia cliques acidentais no cenário inferior.
  - `Icon`: Renderizador de ícones SVG inline otimizados para cada recurso (Oxigênio, Água, Alimento, Energia, Hematita, Regolito, Ferro, Aço, Peças de Reparo) e estados da tripulação.
- **Estilização**: CSS Modules (`*.module.css`) por componente, sem dependências externas de UI.

### Justificativa
Garante total independência da área de UI sem violar o princípio VIII da Constituição (proibição de novas dependências sem aval do tech lead) e sem poluir o escopo global.

### Alternativas Consideradas
- *Tailwind CSS ou bibliotecas prontas (Radix/Chakra/MUI)*: Rejeitadas por adicionarem dependências externas proibidas e aumentarem o bundle além do limite do hackathon.
- *Estilos Inline*: Rejeitados por dificultarem manutenção, animações de alerta e responsividade.

---

## 2. Consumo de Estado e Seletores Reativos com Zustand

### Contexto
A Constituição (Princípio IV) e o arquivo `src/app/selectors.ts` estabelecem a regra mandatória de que seletores em `useGameStore(selector)` devem retornar apenas tipos primitivos ou referências existentes. Criar novos objetos/arrays dentro do seletor provoca loop infinito de renderização no React (Erro #185).

### Decisão
- Selecionar propriedades primitivas ou referências brutas do estado diretamente via Zustand:
  ```ts
  const oxygen = useGameStore((s) => s.game?.stock.oxygen ?? 0)
  const balanceKw = useGameStore((s) => s.game?.power.balanceKw ?? 0)
  const speed = useGameStore((s) => s.speed)
  ```
- Cálculos derivados (ex.: cálculo de materiais faltantes para compra, tempo restante da estação, verificação de limites de alerta) são executados durante o ciclo de renderização do componente ou através de funções puras auxiliares.
- Ações são chamadas diretamente da store (`useGameStore.getState().action(...)` ou desestruturadas sem re-render).

### Justificativa
Elimina riscos de render loops, mantém os componentes reativos apenas às mudanças de estado relevantes e respeita o contrato do tech lead.

### Alternativas Consideradas
- *Uso de `useShallow`*: Rejeitado por adicionar complexidade desnecessária quando a desestruturação de primitivos é direta e mais previsível.

---

## 3. Internacionalização (i18n) e Arquitetura de Textos

### Contexto
O projeto exige suporte ao inglês (mandatório para avaliação da NASA) e português (opcional com alternância instantânea). A Constituição proíbe a centralização de textos em um único arquivo de tradução que cause conflitos de mesclagem (merge conflicts).

### Decisão
- Utilizar o hook existente `useT()` e o tipo `LocalizedText` de `src/ui-kit/i18n.ts`.
- Manter objetos de constantes locais `strings` no topo de cada arquivo de componente (`Hud.tsx`, `BuildMenu.tsx`, `PowerPanel.tsx`, `BriefingDialog.tsx`, `TitleScreen.tsx`).
- O hook `useT()` seleciona o idioma ativo globalmente a partir da store `useLang` do Zustand.
- Textos de conteúdo dinâmico (nomes e descrições de estruturas, estações, eventos) continuam sendo lidos diretamente do arquivo de configuração `src/config/*.json`, que já implementa o contrato `LocalizedText`.

### Justificativa
Permite que o Dev B ajuste qualquer texto de interface sem tocar em arquivos de outras áreas e sem gerar conflitos no Git.

### Alternativas Consideradas
- *i18next / formatjs*: Rejeitados por excederem o escopo e dependerem de configurações extras.

---

## 4. Alarme de Radiação e Ação Emergencial de Abrigo

### Contexto
A Constituição (Princípios II.11 e VII) estipula que tempestades solares duram 20 segundos e são precedidas por um alarme de 10 segundos. Astronautas expostos na superfície ou em habitats sem abrigo de radiação morrem quando a tempestade atinge a base. O alarme deve permitir que o jogador envie todos os astronautas para abrigos com um único clique.

### Decisão
- Criar o componente `RadiationAlarmModal` em `src/features/decisions/RadiationAlarmModal.tsx`.
- O componente observa `game.radiationStorm`:
  - Se `phase === 'warning'`, exibe um modal ou banner emergencial com alta prioridade visual no topo da tela.
  - Apresenta contagem regressiva em segundos calculada por `Math.max(0, Math.ceil(phaseEndsAt - elapsed))`.
  - Exibe a fonte científica do evento real da NASA DONKI (`basedOn.date` e link).
  - Disponibiliza botão de ação em destaque: `"Abrigar Toda a Tripulação"` / `"Take Shelter"`, que aciona `useGameStore.getState().shelterAll()`.
- O alarme possui estilo visual urgente (amarelo/vermelho pulsante, ícone de radiação e texto explicativo).

### Justificativa
Cumpre exatamente a diretriz de "Failure Teaches" (Princípio VII), dando ao jogador 10 segundos claros para reagir e salvar a tripulação com um único comando.

### Alternativas Consideradas
- *Apenas notificação sutil no HUD*: Rejeitada porque a perda da tripulação por radiação é irreversível e exige destaque máximo imediato.

---

## 5. Ergonomia para Crianças (7–12 anos) e Acessibilidade (WCAG AA)

### Contexto
O jogo é voltado para crianças a partir de 7 anos e suas famílias/escolas, rodando em navegadores desktop e dispositivos móveis.

### Decisão
- **Tamanho de Toque**: Todos os botões e áreas clicáveis possuem área mínima de 44×44 pixels CSS.
- **Multimodalidade de Feedback**: Cores de alerta (vermelho para déficit ou perigo) são **sempre** acompanhadas de ícones e rótulos textuais (ex.: sinal `-`, ícone de bateria/alerta, texto `"Déficit"` ou `"Faltam recursos"`).
- **Fichas Informativas Transparentes**: No menu de construção, custos faltantes são destacados com clareza ("Faltam 5 Hematita") e a explicação educativa da ciência real (MOXIE, gelo de Hellas) é apresentada antes da confirmação de compra.
- **Controles de Tempo Claros**: Botões grandes com símbolos e rótulos unificados (`Pausa`, `1×`, `2×`, `4×`).
- **Navegação por Teclado e Foco Visível**: Todos os botões interativos exibem anel de foco evidente (`outline: 3px solid var(--color-focus)`) para uso via teclado ou ferramentas assistivas.

### Justificativa
Respeita o Princípio III da Constituição e viabiliza a aprovação nos critérios de avaliação do Space Apps Challenge.
