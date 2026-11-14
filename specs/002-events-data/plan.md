# Plano de implementação: Eventos e dados da NASA

**Branch**: `data/002-events-data` | **Data**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação da feature em `/specs/002-events-data/spec.md`

## Resumo

Implementar o ciclo de eventos climáticos de Marte com seed, a seleção de eventos DONKI
arquivados da NASA e a experiência de debrief e fontes da missão. O engine de eventos continuará
sendo uma transição de estado pura chamada por `tick()` depois do avanço do tempo, usando somente
`state.rng` para agendamento e alvos e aplicando efeitos configurados aos campos existentes de
`GameState`. A camada de dados lerá snapshots DONKI versionados offline, enquanto o debrief e a
apresentação das fontes consumirão o contrato existente da store e os metadados da configuração.

## Contexto técnico

**Linguagem/versão**: TypeScript, TypeScript 7.0.2 do repositório

**Dependências principais**: Vitest para testes do engine e dos dados, React e Testing Library
para as telas, Zod para o schema existente de configuração e Zustand para a store. Nenhuma
dependência nova.

**Armazenamento**: Configuração JSON estática em `src/config/*.json` e snapshots DONKI
versionados em `src/data/snapshots/`; nenhum banco ou acesso de rede em runtime.

**Testes**: Testes unitários focados para `src/engine/events/events.test.ts` e
`src/data/donki.test.ts`; testes da Testing Library em jsdom para as telas de fim e fontes;
validação final com `npm run check`.

**Plataforma-alvo**: Navegadores desktop e mobile, com funcionamento offline por meio de dados
versionados.

**Tipo de projeto**: Aplicação web React com Vite e engine de simulação puro.

**Metas de desempenho**: As atualizações de eventos permanecem limitadas pelas regras
configuradas, pelos eventos ativos e pelas estruturas da base em cada tick de um segundo; nenhum
processamento de eventos pode exigir rede ou acesso a arquivos.

**Restrições**: Preservar o contrato existente de `GameState`, a determinismo por seed, o engine
puro, os limites de ownership, os textos voltados ao jogador em inglês e o modelo existente de
configuração JSON. Todos os valores de balanceamento permanecem em `src/config/*.json`.

**Escala/escopo**: Quatro ciclos, quatro estações por ciclo, uma base 12x12, as estruturas e a
tripulação configuradas, uma tempestade de radiação por ciclo elegível e as quatro user stories
da especificação.

## Verificação da constituição

*GATE: Deve passar antes da pesquisa da Fase 0. Verificar novamente após o design da Fase 1.*

- **Ownership**: PASSA. Os caminhos de implementação estão limitados a `src/engine/events/`,
  `src/data/`, `scripts/`, `src/features/sources/` e `src/features/end/`. A documentação fica
  dentro de `specs/002-events-data/`.
- **Engine puro**: PASSA. `updateEvents` recebe estado, configuração e tempo decorrido; não fará
  fetch, leitura de arquivos, uso de timers ou chamada de `Math.random`.
- **Missão com seed**: PASSA. O agendamento e a seleção de alvos consomem os helpers de RNG
  existentes e gravam o estado RNG retornado no próximo estado.
- **Ciência real**: PASSA. Os dados DONKI são um snapshot offline, e cada evento/fonte mantém
  seu tipo e URL de origem.
- **Testes primeiro**: PASSA. Os casos `it.todo` existentes são o plano de testes acordado e
  serão implementados story por story antes do código de produção.
- **Contratos**: PASSA sem alteração de contrato planejada. Os campos existentes de `GameState`,
  `ActiveEvent` e `RadiationStorm` cobrem a feature; qualquer campo ausente deve virar uma
  alteração separada em `shared/`.
- **Sem dependências/configuração novas**: PASSA. O plano não adiciona pacotes nem altera a
  configuração do projeto.
- **Escopo da PR**: PASSA. Cada user story será uma PR pequena e separada.

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
├── change-requests.md       # Pedidos a outras áreas (decisões do PO de 2026-11-14)
├── us1-implementation.md
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
    └── *.json              # Valores e metadados de fonte sob responsabilidade dos POs

scripts/
└── fetch-donki.ts
```

**Decisão estrutural**: Manter o projeto React com Vite existente. O engine de eventos puro e o
parser DONKI permanecem separados do React; as telas usam o estado fornecido pela store e helpers
de apresentação locais da feature. Nenhuma nova área de código de alto nível é introduzida.

## Acompanhamento de complexidade

Nenhuma violação da constituição exige justificativa.
