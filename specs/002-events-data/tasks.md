---

description: "Lista de tarefas para Eventos e Dados da NASA"
---

# Tarefas: Eventos e Dados da NASA

**Entrada**: Documentos de design em `/specs/002-events-data/`

**Pré-requisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Testes**: Os testes são exigidos pela especificação da feature e pela constituição do projeto.
Toda story começa com um teste focado que falha antes da implementação.

**Organização**: As tarefas são agrupadas por user story para que cada uma possa ser implementada
e validada como um incremento independente.

## Fase 1: Preparação

**Objetivo**: Confirmar a configuração existente do projeto; esta feature não precisa de novas
dependências nem de alterações de configuração.

- [x] T001 Verificar os comandos existentes do Vitest, TypeScript, React Testing Library e `npm run check` em `package.json` antes do trabalho das stories.

---

## Fase 2: Fundação

**Objetivo**: Confirmar que os contratos compartilhados e a configuração existentes são
suficientes antes de editar os arquivos do DEV A.

- [x] T002 Verificar os contratos existentes de eventos, radiação, status de estruturas, log e RNG determinístico em `src/engine/types.ts`, `src/config/schema.ts`, `src/config/events.json` e `src/config/mission.json`; parar e solicitar uma alteração de contrato em `shared/` se faltar algum campo necessário.

**Checkpoint**: Os contratos e a configuração existentes foram confirmados; nenhuma alteração de
código-fonte de fundação é necessária.

---

## Fase 3: User Story 1 - Eventos sazonais determinísticos (Prioridade: P1) 🎯 MVP

**Objetivo**: Agendar deterministicamente todos os eventos configurados dentro do ciclo e da
estação atuais, aplicar a escala do ciclo quatro e remover eventos ativos na mudança de estação.

**Teste independente**: Executar os testes de agendamento em `src/engine/events/events.test.ts`
com seeds idênticos e mudanças de estação controladas; todos os horários dos eventos e resultados
de limpeza devem ser repetíveis.

### Testes da User Story 1

> **TDD**: Escreva estes testes primeiro e confirme que falham pelo comportamento ausente esperado.

- [x] T003 [US1] Substituir os casos `it.todo` de agendamento em `src/engine/events/events.test.ts` por testes para cada regra atual, limites dos intervalos com seed, escala do intervalo no ciclo quatro, igualdade para a mesma seed e limpeza na mudança de estação.
- [x] T004 [US1] Executar `npx vitest run src/engine/events/events.test.ts` e registrar que os novos testes de agendamento da US1 falham porque `updateEvents` ainda é um no-op.

### Implementação da User Story 1

- [x] T005 [US1] Implementar a seleção das regras do ciclo e da estação atuais e o agendamento inicial de `nextEventAt` em `src/engine/events/events.ts`, usando `nextRange` e gravando o estado RNG retornado.
- [x] T006 [US1] Implementar o agendamento de eventos repetidos, os limites dos intervalos, `finalCycleIntervalFactor` no ciclo quatro, atualizações imutáveis de estado e a remoção de `activeEvents` na mudança de estação em `src/engine/events/events.ts`.
- [x] T007 [US1] Executar `npx vitest run src/engine/events/events.test.ts` e confirmar que todos os testes de agendamento da US1 passam sem enfraquecer ou pular nenhum teste.

**Checkpoint**: A US1 é testável de forma independente e fornece a linha do tempo determinística
de eventos necessária para as stories seguintes.

---

## Fase 4: User Story 2 - Poeira, frio, escuridão e danos de tempestades (Prioridade: P1)

**Objetivo**: Aplicar os efeitos configurados de poeira e das estações à produção solar, aos
status das estruturas e à disponibilidade de trabalhos externos, preservando a diferença entre
estado temporário e persistente.

**Teste independente**: Executar os testes de eventos de poeira em
`src/engine/events/events.test.ts` usando estruturas, upgrades, estações e durações de eventos
controlados.

**Dependência**: Requer o comportamento de agendamento e limpeza da US1 em
`src/engine/events/events.ts`.

### Preparação da User Story 2

- [x] T007a [US2] Alinhar `spec.md`, `data-model.md`, `research.md` e `contracts/events-engine.md` às respostas do PO de 2026-11-14 e registrar em `change-requests.md` o que depende de outras áreas.

### Testes da User Story 2

> **TDD**: Escreva estes testes primeiro e confirme que falham pelo comportamento ausente esperado.
> Os testes leem os valores da configuração (ou de uma regra montada no teste), nunca números fixos.
> Os cenários citados são os da US2 em `spec.md`.

- [x] T008a [US2] Redemoinho (cenário 1): danifica até `damagePanels` painéis sem repetição; só painéis prontos, sem filtro e `active`; com menos elegíveis, danifica os que houver; sem elegíveis, nada muda além do RNG.
- [x] T008b [US2] Entupimento (cenário 2): `clogChance` sorteada antes dos alvos (ausente = 100%); um alvo por tipo listado; filtro, construção e outro status excluem do sorteio; tipo sem alvo é ignorado sem afetar os demais.
- [x] T008c [US2] Tempestade com duração (cenário 3): evento ativo com o `solarFactor` da regra e `endsAt` = início + `durationSeconds`; removido quando `elapsed >= endsAt` e na troca de estação.
- [x] T008d [US2] Tempestade global (cenário 4): ativa o verão inteiro (`endsAt` null); um curto por `shortCircuitEverySeconds` contado do início do verão; sorteio único entre mina e refinaria sem curto (entupida pode); sem elegível, perde; mesmo número de curtos com ticks de tamanhos diferentes; período sem fator do ciclo 4; resto do tick na virada de estação não conta.
- [x] T008e [US2] Escuridão e frio (cenários 5 e 6): ativos desde o primeiro tick da estação, criados uma única vez; escuridão copia `solarFactor` e `blocksExternalJobs` da regra; frio tem `solarFactor` 1 e não bloqueia.
- [x] T008f [US2] Prioridade e log (cenários 7 a 9): curto substitui entupido, nunca o contrário; uma entrada de log por estrutura atingida com `ref` e `cause` = id da regra; status persistem após o fim do evento; filtro instalado depois não cura.
- [x] T008g [US2] Determinismo: mesma seed e mesmos passos de tempo dão os mesmos alvos; o estado recebido não é mutado.
- [x] T009 [US2] Executar `npx vitest run src/engine/events/events.test.ts` e registrar que os novos testes de poeira da US2 falham pelos efeitos e transições de status ausentes.

### Implementação da User Story 2

- [x] T010 [US2] Implementar em `src/engine/events/events.ts` os efeitos das ocorrências agendadas, dentro do laço da US1 e antes de `drawAfter`: sorteio de painéis sem repetição, `clogChance` e um alvo por tipo, elegibilidade, prioridade de status e log.
- [x] T011 [US2] Implementar em `src/engine/events/events.ts` os eventos ativos: tempestades com `endsAt`, expiração, ativação idempotente dos eventos de estação inteira (global, escuridão, frio) e os curtos da tempestade global pela janela de `secondsIntoSeason`.
- [x] T012 [US2] Executar `npx vitest run src/engine/events/events.test.ts` e confirmar que os testes das US1 e US2 passam juntos, incluindo a limpeza de efeitos temporários e a persistência dos status das estruturas.

**Checkpoint**: A US2 é testável de forma independente com o agendador da US1 e demonstra os
perigos ambientais configurados.

---

## Fase 5: User Story 3 - Tempestade de radiação e dados DONKI (Prioridade: P1)

**Objetivo**: Fornecer fases determinísticas de aviso e atividade da tempestade de radiação,
baseadas em um snapshot DONKI da NASA versionado, com resultados corretos de abrigo e atribuição
da fonte.

**Teste independente**: Executar os testes de radiação em `src/engine/events/events.test.ts` e os
testes DONKI em `src/data/donki.test.ts`, usando um snapshot versionado e estados controlados com
seed.

**Dependência**: Requer o comportamento de agendamento da US1; os testes do parser DONKI e das
fases do motor podem ser escritos em paralelo antes da integração.

### Testes da User Story 3

> **TDD**: Escreva estes testes primeiro e confirme que falham pelo comportamento ausente esperado.

- [x] T013 [P] [US3] Substituir os casos `it.todo` de tempestade de radiação em `src/engine/events/events.test.ts` por testes de estações permitidas, quantidade por ciclo, duração do aviso, duração ativa, resultados de abrigo, trabalhos pausados e citação DONKI. Os testes da lógica chamam a função interna `updateRadiationStorm(state, config, dt, events)` com uma lista de fixtures, sem mocks. Incluir: com 14 eventos e várias seeds, as tempestades dos ciclos 2, 3 e 4 citam 3 eventos diferentes; a mesma seed cita os mesmos eventos; com 1 ou 2 eventos não quebra (grupo vazio usa a lista inteira); com lista vazia, `basedOn` é `null`; o número de grupos vem da config (`fromCycle`, `perCycle`, `cycles`). Incluir também um teste de integração que passa por `updateEvents` e confere que `basedOn` bate (`date` e `url`) com um dos registros de `2024-05.json` e que a mesma seed devolve o mesmo evento. Esse teste só passa depois do T016, que fornece o fixture.
- [x] T014 [P] [US3] Substituir os casos `it.todo` de DONKI em `src/data/donki.test.ts` por testes de leitura do snapshot, seleção estável por índice com seed e comportamento para snapshot vazio ou inválido. Incluir: `readSepSnapshot(raw)` converte `eventTime` e `link` em `{ date, url }`; mês vazio (`sep: []`) devolve `events: []` e `problems: []`; snapshot corrompido, ou registro sem horário válido ou sem link `https://`, devolve `problems` preenchido, descarta o registro ruim e não lança erro. Os casos ruins são sintéticos e marcados como tal; o caso válido usa o fixture real. Incluir também: `sepGroup` divide a lista por posição (`i % grupos`), na ordem original, sem cruzar grupos; grupo vazio devolve a lista inteira; `sepEvents()` devolve a lista em cache, congelada (mutar lança erro); `readSepSnapshot` mantém a ordem do snapshot. Os problemas de um snapshot corrompido são conferidos em `problems` na função pura, sem depender do `console.warn`.
- [x] T015 [US3] Executar `npx vitest run src/engine/events/events.test.ts src/data/donki.test.ts` e registrar que os novos testes da US3 falham antes da implementação.
 
### Implementação da User Story 3

- [x] T016 [US3] Implementar a leitura do snapshot SEP versionado e a seleção determinística segura para valores nulos em `src/data/donki.ts`, com um fixture aprovado em `src/data/snapshots/2024-05.json`. A validação fica na função pura `readSepSnapshot(raw: unknown): { events: SepEvent[]; problems: string[] }`; `sepEvents()` a chama sobre o snapshot commitado, devolve só `events`, guarda o resultado em cache na primeira chamada (lista e registros congelados com `Object.freeze`) e emite `console.warn` com os `problems` uma só vez, ao montar o cache, e só se houver problemas. Implementar também `sepGroup(events, group, groups)`. `SepEvent` continua `{ date, url }`. Fazer este T016 antes do T018 (o teste de integração do T013 depende do fixture).
- [x] T017 [US3] Completar o fluxo aprovado de busca e gravação offline do snapshot DONKI em `scripts/fetch-donki.ts`, gravando `{ range, fetchedAt, sep }`; `flr` e `cme` são opcionais e ficam fora (o jogo só lê `sep`), omitindo as chaves em vez de gravar `[]`; o parser ignora essas chaves se existirem. Nunca buscar dados durante o jogo. Usar `api.nasa.gov` com a chave `NASA_API_KEY`, lida da variável de ambiente ou, se ela não existir, do arquivo `.env.local` na raiz via `process.loadEnvFile('.env.local')` do Node (sem dependência nova e sem mexer no `package.json`); sem chave, usar `DEMO_KEY`. O `.env.local` já é ignorado pelo git (`*.local` no `.gitignore`), e a chave nunca vai para a URL registrada nem para o snapshot, e recusar com erro claro um intervalo que cruze meses (o arquivo é `<AAAA-MM>.json`).
- [x] T018 [US3] Implementar o agendamento de uma tempestade de radiação por ciclo, as transições aviso-atividade, a atribuição DONKI, as verificações de abrigo, a pausa de trabalhos, os resultados letais, o log e a reinicialização ao fim da tempestade em `src/engine/events/events.ts`. A lógica fica na função interna `updateRadiationStorm(state, config, dt, events: SepEvent[])`; `updateEvents` mantém a assinatura, importa `sepEvents()` de `src/data/donki` e a chama só quando uma tempestade vai começar. O evento citado vem de `sepGroup` (número de grupos calculado da config) com um `nextIndex` da seed.
- [x] T019 [US3] Executar `npx vitest run src/engine/events/events.test.ts src/data/donki.test.ts` e confirmar que todos os testes das US1, US2 e US3 passam juntos.

**Checkpoint**: A US3 é testável de forma independente e prova que o comportamento de radiação é
determinístico, offline e atribuído honestamente a um evento NASA arquivado.

---

## Fase 6: User Story 4 - Debrief e fontes (Prioridade: P2)

**Objetivo**: Explicar o histórico registrado da missão e mostrar cada fonte real ou simplificação
de gameplay em português claro.

**Teste independente**: Renderizar as telas de fim e de fontes com estados controlados da store e
verificar se perdas registradas, explicações, classificações e rótulos DONKI arquivados aparecem.

**Dependência**: Usa o log e os metadados de fonte estabelecidos pelas US1-US3, mas seus helpers
de apresentação podem ser testados independentemente com estados criados manualmente.

### Testes da User Story 4

> **TDD**: Escreva estes testes primeiro e confirme que falham pelo comportamento ausente esperado.

- [x] T020 [P] [US4] Adicionar testes de comportamento em `src/features/end/EndScreen.test.tsx` para missões vencidas e perdidas, agrupamento por ciclo/estação, cada causa de perda registrada, debriefs sem perdas e reinício usando a store real. Incluir a entrada `radiation_storm` nos dois formatos de `ref`: com a `url` do evento DONKI citado e com a palavra `radiation_storm` (sem evento), que não pode virar uma citação inventada.
- [x] T021 [P] [US4] Adicionar testes de comportamento em `src/features/sources/SourcesScreen.test.tsx` para fontes deduplicadas, classificações científicas, rótulo DONKI arquivado e texto voltado ao jogador em inglês.
- [x] T022 [US4] Executar `npx vitest run src/features/end/EndScreen.test.tsx src/features/sources/SourcesScreen.test.tsx` e registrar que os novos testes da US4 falham antes da implementação. Registro: `npx vitest run src/features/end src/features/sources` dá 62 testes, 56 falhando por asserção (esqueletos `debrief.ts` e `sources.ts` devolvem vazio; as telas ainda não têm o debrief nem o rótulo de arquivado). Os 6 que passam guardam comportamento que já existe e deve continuar: tela vazia sem partida, botão "Back", link único por URL, rótulo de classificação e os dois casos em que `donkiCitation` devolve `null`.

### Implementação da User Story 4

- [ ] T023 [US4] Adicionar helpers puros de agrupamento do debrief e resolução de causas em `src/features/end/debrief.ts`, derivando todas as explicações de `GameState.log`, do texto da configuração e de rótulos explícitos de simplificação.
- [ ] T024 [US4] Atualizar `src/features/end/EndScreen.tsx` para renderizar o debrief em linguagem simples, preservar o resultado e a ação de reinício existentes e não inventar perdas ausentes no log.
- [ ] T025 [US4] Atualizar `src/features/sources/SourcesScreen.tsx` para exibir fontes deduplicadas, rótulos real/scaled/simplification/game-value e o status DONKI arquivado, preservando a navegação existente.
- [ ] T026 [US4] Adicionar a atribuição de dados/NASA do DEV A à seção do DEV A em `CREDITS.md` para o snapshot DONKI versionado e o uso das fontes relacionadas.
- [ ] T027 [US4] Executar `npx vitest run src/features/end/EndScreen.test.tsx src/features/sources/SourcesScreen.test.tsx` e confirmar que os testes da US4 passam sem alterar os testes de outras áreas.

**Checkpoint**: A US4 é testável de forma independente e a missão explica tanto o sucesso quanto
o fracasso com atribuição científica honesta.

---

## Fase 7: Polimento e preocupações transversais

**Objetivo**: Validar a feature completa, a documentação, a propriedade dos arquivos e os
limites de entrega.

- [ ] T028 [P] Revisar `specs/002-events-data/quickstart.md`, `specs/002-events-data/data-model.md` e `specs/002-events-data/contracts/` em relação ao comportamento implementado e atualizar somente a documentação diretamente relacionada.
- [ ] T029 Executar `npm run check` na raiz do repositório usando os scripts em `package.json` e corrigir somente falhas causadas pela implementação de Eventos e Dados da NASA.
- [ ] T030 Executar a validação de ownership do CI para a branch `data/us4-debrief-sources` e confirmar que todo arquivo-fonte alterado está dentro dos caminhos do DEV A listados em `CONTRIBUTING.md`.

---

## Dependências e ordem de execução

### Dependências entre fases

- **Preparação (Fase 1)**: Sem dependências de código; confirma as ferramentas existentes.
- **Fundação (Fase 2)**: Depende da preparação e bloqueia as stories até que o contrato
  compartilhado seja confirmado.
- **US1 (Fase 3)**: Depende da fundação; é o MVP.
- **US2 (Fase 4)**: Depende do agendamento e da limpeza da US1.
- **US3 (Fase 5)**: Depende do agendamento da US1; os testes e o parser DONKI podem começar em
  paralelo, mas a integração da radiação depende do agendador.
- **US4 (Fase 6)**: Depende do comportamento de log/fontes das US1-US3; os testes de apresentação
  podem começar com estados criados manualmente.
- **Polimento (Fase 7)**: Depende de todas as stories selecionadas.

### Dependências entre User Stories

```text
Fundação -> US1 -> US2
                  \-> US3 -> US4
```

A US4 pode testar seus helpers puros de debrief e fontes de forma independente, mas a experiência
completa de ponta a ponta é validada depois que a US3 fornece os registros de radiação e a
atribuição DONKI.

### Dentro de cada User Story

1. Escrever os testes de comportamento focados.
2. Executar os arquivos de teste focados e confirmar a falha vermelha esperada.
3. Implementar o comportamento mínimo nos arquivos da área indicados.
4. Executar novamente os testes focados até ficarem verdes.
5. Parar no checkpoint antes de abrir a PR da story.

## Oportunidades de paralelismo

- T013 e T014 podem ser escritos em paralelo porque alteram arquivos de teste diferentes.
- T020 e T021 podem ser escritos em paralelo porque alteram arquivos de teste de telas diferentes.
- T016 e T017 podem ser desenvolvidos em paralelo depois que o formato do snapshot DONKI for
  acordado, mas o fixture `src/data/snapshots/2024-05.json` só é gerado quando o script do T017
  funciona (snapshots nunca são editados à mão). Os testes do parser (T014) usam registros
  sintéticos até o fixture existir; o teste de integração do T013 e o T018 esperam o fixture.
- PRs de stories diferentes podem ser preparados por desenvolvedores diferentes somente depois
  que suas dependências forem integradas; alterações compartilhadas em `src/engine/events/events.ts`
  devem continuar serializadas.

## Exemplo de paralelismo: User Story 3

```text
Task A: T013 testes do comportamento de radiação em src/engine/events/events.test.ts
Task B: T014 testes do parser DONKI em src/data/donki.test.ts
```

## Exemplo de paralelismo: User Story 4

```text
Task A: T020 testes da tela de debrief em src/features/end/EndScreen.test.tsx
Task B: T021 testes da tela de fontes em src/features/sources/SourcesScreen.test.tsx
```

## Estratégia de implementação

### MVP primeiro (somente User Story 1)

1. Completar T001-T002.
2. Completar T003-T007 usando o ciclo TDD red/green.
3. Validar independentemente o agendamento determinístico e a limpeza da estação.
4. Abrir a PR da US1 antes de começar a US2.

### Entrega incremental

1. US1: agendamento e limpeza determinísticos.
2. US2: poeira, frio, escuridão e efeitos nas estruturas.
3. US3: fases de radiação e dados DONKI arquivados.
4. US4: debrief e fontes.
5. Executar a validação completa antes de integrar a feature.

### Regras de entrega

- Uma user story por PR.
- Manter cada PR perto ou abaixo de 300 linhas alteradas.
- Nunca editar arquivos fora dos caminhos de ownership do DEV A, exceto a seção do DEV A em
  `CREDITS.md`.
- Se uma tarefa revelar um campo de contrato ausente, pausar e abrir uma solicitação de contrato
  `shared/` em vez de editar `src/engine/types.ts`, `src/config/schema.ts` ou `src/app/store.ts`.
