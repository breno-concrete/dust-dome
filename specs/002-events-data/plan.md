# Plano de implementação: Eventos e dados da NASA

**Branch**: `data/002-events-data` | **Data**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação da feature em `/specs/002-events-data/spec.md`

## Resumo

Implementar o loop de eventos climáticos de Marte com seed, a seleção de eventos NASA DONKI
arquivados e a experiência de debrief e fontes da missão. O motor de eventos continuará sendo
uma transição pura de estado chamada por `tick()` depois do avanço do tempo, usando apenas
`state.rng` para agendamento e alvos e aplicando efeitos configurados aos campos existentes de
`GameState`. A camada de dados lerá snapshots DONKI versionados offline, enquanto a apresentação
do debrief e das fontes consumirá o contrato existente da store e os metadados da configuração.

## Contexto técnico

**Linguagem/versão**: TypeScript, TypeScript 7.0.2 do repositório

**Dependências principais**: Vitest para testes do motor/dados, React e Testing Library para as
telas, Zod para o schema de configuração existente e Zustand para a store do jogo. Nenhuma nova
dependência.

**Armazenamento**: Configuração JSON estática em `src/config/*.json` e snapshots DONKI versionados
em `src/data/snapshots/`; sem banco de dados ou acesso à rede em runtime.

**Testes**: Testes unitários focados do Vitest para `src/engine/events/events.test.ts` e
`src/data/donki.test.ts`; testes da Testing Library em jsdom para as telas de fim e fontes;
validação final com `npm run check`.

**Plataforma-alvo**: Navegadores desktop e mobile, com dados versionados disponíveis offline.

**Tipo de projeto**: Aplicação web React com Vite e motor de simulação puro.

**Metas de desempenho**: As atualizações de eventos devem permanecer limitadas pelas regras
configuradas, eventos ativos e estruturas da base a cada tick de um segundo do jogo; nenhum
processamento de eventos pode exigir I/O de rede ou arquivo.

**Restrições**: Preservar o contrato existente de `GameState`, o determinismo por seed, as
funções puras do motor, os limites de ownership, o texto voltado ao jogador em inglês e o modelo
de configuração JSON existente. Todos os valores de balanceamento permanecem em
`src/config/*.json`.

**Escala/escopo**: Quatro ciclos, quatro estações por ciclo, base 12x12, estruturas e tripulação
configuradas, uma tempestade de radiação por ciclo elegível e as quatro user stories da spec.

## Verificação da constituição

*GATE: Deve passar antes da pesquisa da Fase 0. Reavaliar após o design da Fase 1.*

- **Ownership**: PASSA. Os caminhos de implementação estão limitados a `src/engine/events/`,
  `src/data/`, `scripts/`, `src/features/sources/` e `src/features/end/`. A documentação fica
  em `specs/002-events-data/`.
- **Motor puro**: PASSA. `updateEvents` recebe estado, configuração e tempo decorrido; não fará
  fetch, leitura de arquivos, uso de timers ou chamada a `Math.random`.
- **Missão com seed**: PASSA. O agendamento e a seleção de alvos usam os helpers RNG existentes
  e gravam o estado RNG retornado.
- **Ciência real**: PASSA. Os dados DONKI são snapshots offline e cada evento/fonte mantém seu
  tipo de fonte e URL.
- **Test-first**: PASSA. Os casos `it.todo` existentes são o plano de testes acordado e serão
  implementados story por story antes do código de produção.
- **Contratos**: PASSA sem edição planejada de contratos. Os campos existentes de `GameState`,
  `ActiveEvent` e `RadiationStorm` cobrem a feature; qualquer campo ausente deve virar uma
  alteração separada em `shared/`.
- **Sem dependências/alterações de configuração**: PASSA. O plano não adiciona pacotes nem
  altera a configuração do projeto.
- **Escopo de PR**: PASSA. Cada user story será uma PR pequena separada.

## Estrutura do projeto

### Documentação desta feature

```text
specs/002-events-data/
├── brief.md
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── debrief-sources.md
│   ├── donki.md
│   └── events-engine.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Criado por /speckit-tasks
```

### Código-fonte

```text
src/
├── engine/
│   └── events/
│       ├── events.ts
│       └── events.test.ts
├── data/
│   ├── donki.ts
│   ├── donki.test.ts
│   └── snapshots/
│       ├── README.md
│       └── <YYYY-MM>.json
├── features/
│   ├── end/
│   │   ├── EndScreen.tsx
│   │   └── EndScreen.test.tsx
│   └── sources/
│       ├── SourcesScreen.tsx
│       └── SourcesScreen.test.tsx
└── config/
    └── *.json              # Balanceamento e metadados de fonte dos POs

scripts/
└── fetch-donki.ts
```

**Decisão de estrutura**: Manter o projeto único existente com Vite e React. O motor puro de
eventos e o parser DONKI permanecem separados das telas React; as telas usam o estado fornecido
pela store e helpers de apresentação da própria feature. Nenhuma nova área de código de alto
nível será criada.

## Registro de complexidade

Nenhuma violação da constituição precisa de justificativa.
