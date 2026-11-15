# US3 — Tempestade de radiação e dados DONKI

Resumo da implementação da User Story 3 da spec 002 (área `data/`), para explicar ao time. Segue
o formato de [us1-implementation.md](./us1-implementation.md) e
[us2-implementation.md](./us2-implementation.md), e inclui a seção 4, com as **decisões que
mudaram** em relação ao que a spec, o plano e os documentos das US1 e US2 diziam.

- **Código:**
  - `src/engine/events/events.ts`: `updateRadiationStorm`, `radiationPlan` e `updateEvents`
    (agora clima + radiação).
  - `src/data/donki.ts`: `readSepSnapshot`, `sepEvents`, `sepGroup` e `pickSepEvent`.
  - `scripts/fetch-donki.ts`: busca e grava o snapshot.
  - `src/data/snapshots/2024-05.json`: o snapshot real (14 eventos SEP).
- **Testes:** `src/engine/events/events.test.ts` (bloco de radiação, mais 6 testes do plano
  próprio) e `src/data/donki.test.ts` (39 testes). Os dois arquivos juntos: 128 testes. Suíte
  inteira: 392 testes passando e 2 `it.todo`.
- **Tarefas:** T013–T019 de `tasks.md`.
- **Contrato alterado:** nenhum. Não há campo novo em `GameState`, `GameConfig` nem no schema.

---

## 1. Explicação em 30 segundos

Nos ciclos 2 a 4 chega uma tempestade de radiação por ciclo, em um horário sorteado pela seed, na
primavera, no verão ou no outono. Ela tem três fases:

1. **Aviso** (`warningSeconds`, hoje 10 s). O jogo já sabe qual evento real da NASA inspira a
   tempestade e o guarda em `radiationStorm.basedOn` (data e link do DONKI).
2. **Fase ativa** (`durationSeconds`, hoje 20 s). Quem estiver fora da base ou num habitat sem
   abrigo de radiação morre.
3. **Fim.** `radiationStorm` volta a `null`.

A US3 **só grava** `radiationStorm` e uma entrada no `log`. As mortes e a pausa dos trabalhos já
existem no engine (`crew.ts` e `jobs.ts`), que leem `radiationStorm`. Os dados reais vêm de um
snapshot JSON commitado: o jogo nunca acessa a rede.

---

## 2. O que as funções fazem

### 2.1 `updateEvents` agora tem duas partes

```text
updateEvents = updateRadiationStorm( updateClimate(state) )
```

O clima (US1 e US2) roda primeiro, com o código de antes (só foi renomeado para `updateClimate`).
Depois roda a radiação. A assinatura pública não mudou, então `tick()` continua igual.

### 2.2 `radiationPlan(seed, cycle, config)`: quando a tempestade começa

Função pura e exportada. Devolve as tempestades planejadas de **um ciclo** (`[]` antes de
`fromCycle` e depois do último ciclo). Cada item traz o horário (segundos desde o início do
ciclo), a estação e o estado do gerador que escolhe o evento DONKI.

Como o horário é calculado:

1. **Janelas permitidas.** Para cada estação de `radiationStorm.seasons`, o intervalo em que a
   tempestade pode começar: depois de uma margem no início da estação e cedo o bastante para o
   aviso e a fase ativa terminarem antes do fim da estação.
2. **Fatias.** Com `perCycle` tempestades, a `n`-ésima começa na `n`-ésima fatia do tempo
   permitido. Toda fatia, menos a última, deixa espaço para uma tempestade inteira, então duas
   tempestades nunca se sobrepõem.
3. **Sorteio.** Um `nextRange` dentro da fatia, com os helpers de `rng.ts`, num **fluxo próprio**
   que parte da seed misturada com o ciclo e uma constante fixa (função de mistura do murmur3).

O plano não lê nem grava `state.rng`. Por ser função pura de `(seed, ciclo, config)`, o jogo o
recalcula a cada tick, sem guardar nada no estado.

### 2.3 `updateRadiationStorm(state, config, dt, events)`: as fases

`events` é uma função `() => readonly SepEvent[]`, chamada **só quando uma tempestade vai
começar**. Passo a passo, a cada tick:

1. **Há tempestade e a fase ainda não acabou?** Devolve o mesmo estado.
2. **Está no aviso e o aviso acabou?** Passa para `active`, com `phaseEndsAt` = fim do aviso +
   `durationSeconds`. **Uma fase por tick**: mesmo que o tick seja gigante, o aviso sempre
   aparece e o impacto sempre acontece.
3. **Está ativa e acabou?** Volta a `null`. A próxima tempestade pode começar neste mesmo tick.
4. **Algum início planejado cai em `(elapsed − dt, elapsed]`?** Começa o aviso: escolhe o evento
   DONKI, grava `radiationStorm` e uma entrada no log.
5. Se nada disso aconteceu, devolve a mesma referência de estado.

Os tempos das fases contam do **início planejado**, nunca do tick. Por isso o resultado não
depende do tamanho do `dt`.

### 2.4 Escolha do evento DONKI

O evento citado vem de `sepGroup` mais um `nextIndex` do fluxo da tempestade:

- A lista (na ordem do snapshot) é dividida em **grupos por posição**: o evento `i` pertence ao
  grupo `i % grupos`.
- Número de grupos: `(ciclos − fromCycle + 1) × perCycle`, calculado da config (hoje 3).
- Grupo da tempestade: `(ciclo − fromCycle) × perCycle + n`.
- Os grupos não se cruzam, então **duas tempestades da mesma partida nunca citam o mesmo
  evento**, sem precisar lembrar o que já foi citado.
- Grupo vazio (menos eventos do que grupos): sorteia na lista inteira. Lista vazia: `basedOn` é
  `null`, e nenhuma fonte é inventada.

### 2.5 A camada de dados (`src/data/donki.ts`)

| Função                      | O que faz                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `readSepSnapshot(raw)`      | Pura. Converte `eventTime` e `link` do formato da API em `{ date, url }`, na ordem do snapshot. Nunca lança erro: descarta o registro ruim e o descreve em `problems`. |
| `sepEvents()`               | Lê o snapshot commitado uma vez, guarda em cache, congela a lista e cada evento (`Object.freeze`) e dá `console.warn` com os `problems` só na montagem do cache e só se houver. |
| `sepGroup(events, g, n)`    | Pura. Os eventos nas posições `i % n === g`, na ordem original; grupo vazio devolve a lista inteira.                                                   |
| `pickSepEvent(events, i)`   | O evento na posição `i` (dá a volta no fim da lista); `null` para lista vazia.                                                                         |

Um registro é **válido** quando o `eventTime` tem o formato do DONKI (`2024-05-09T13:59Z`) e é um
momento real (mês 13 e 25 h são rejeitados) e o `link` é uma URL `https://` com host. Todo o resto
é descartado e descrito em `problems`: sem horário, horário inválido, link `http`, link
`javascript:`, registro que não é objeto, `sep` ausente e assim por diante.

### 2.6 O script `scripts/fetch-donki.ts` (T017)

`npm run data:fetch -- 2024-05-01 2024-05-31`:

- Busca `api.nasa.gov/DONKI/SEP`. A chave vem de `NASA_API_KEY` (ambiente) ou do `.env.local` na
  raiz; sem nenhuma das duas usa `DEMO_KEY`. A chave não vai para a URL impressa nem para o
  arquivo (conferido: o snapshot não tem `api_key` nem `DEMO_KEY`).
- Grava `{ range, fetchedAt, sep }`. `flr` e `cme` ficam fora e a chave é omitida, nunca gravada
  como `[]`, que pareceria "não houve erupções".
- Recusa com mensagem clara datas inexistentes, intervalo invertido e intervalo que cruza meses
  (o arquivo é `<AAAA-MM>.json`).

Rodei de verdade e gerou o `2024-05.json`: **14 eventos SEP reais** da grande tempestade solar de
9 a 13 de maio de 2024. Snapshots nunca são editados à mão.

---

## 3. Exemplos da função funcionando

Números obtidos rodando `updateEvents` de verdade, com o `config` atual e o snapshot real, no
primeiro tick em que a tempestade começa. O "início no ciclo" conta do começo da estação.

| Seed | Ciclo | Estação   | Início na estação | Índice do evento | Evento citado (`date`)  |
| ---- | ----- | --------- | ----------------- | ---------------- | ----------------------- |
| 42   | 2     | primavera | 192,5 s           | 0                | 2024-05-09T13:59Z       |
| 42   | 3     | primavera | 224,1 s           | 1                | 2024-05-09T14:25Z       |
| 42   | 4     | outono    | 10,8 s            | 11               | 2024-05-13T16:19Z       |
| 43   | 2     | primavera | 135,4 s           | 9                | 2024-05-13T13:10Z       |
| 43   | 3     | verão     | 35,0 s            | 10               | 2024-05-13T14:00Z       |
| 43   | 4     | outono    | 232,8 s           | 2                | 2024-05-10T12:59Z       |

Três coisas para notar na tabela:

- **Cada partida cita três eventos diferentes.** Os índices ficam um em cada grupo: 0, 1 e 11
  (11 % 3 = 2) na seed 42; 9, 10 e 2 na seed 43. É o cenário 7 da spec.
- **A seed manda em tudo:** a seed 43 tem horários e eventos diferentes dos da seed 42, e a mesma
  seed repete a mesma tabela.
- **A margem funciona.** A menor largada do exemplo (10,8 s, no outono do ciclo 4) fica depois dos
  10 s do `warningSeconds`.

### Exemplo — a entrada do log (seed 42, ciclo 2)

```json
{
  "at": 1392.47,
  "cycle": 2,
  "season": "spring",
  "kind": "radiation_storm",
  "ref": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1",
  "cause": "radiation_storm"
}
```

`at` é o início **planejado** (1392,47 s), não o instante do tick que o percebeu. A entrada é
gravada **uma vez por tempestade, quando o aviso começa**, e não a cada tick nem na passagem para
a fase ativa.

### Exemplo — uma tempestade vista pelo engine inteiro

Com uma base com habitat abrigado e um astronauta fora (teste "when the storm hits…"):

| Momento              | `radiationStorm`                       | O que acontece                                                          |
| -------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Antes do horário     | `null`                                 | Tudo normal.                                                            |
| Início do aviso      | `{ phase: 'warning', basedOn: {…} }`   | Entrada no log. `jobs.ts` não inicia trabalho novo. O jogador pode tocar em "Take shelter". |
| Aviso acaba (+10 s)  | `{ phase: 'active', … }`               | `crew.ts` mata quem está fora ou sem abrigo, com `cause: 'radiation_storm'`. |
| Fase ativa acaba     | `null`                                 | Os trabalhos que esperavam podem começar.                               |

Sem nenhum abrigo na base, **todos** morrem. Se o jogador abriga todos durante o aviso, ninguém
morre.

---

## 4. Decisões que mudaram nesta US

Esta é a parte mais importante para quem leu os documentos anteriores. Algumas decisões dos
documentos da US1 e da US2, e do plano original da spec, **não são mais as que valem**.

| #   | Antes (spec, plano, us1/us2)                                                              | Agora                                                                                                                              | Por que mudou                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | O horário da tempestade fica em `nextEventAt` (us1 §7, us2 §7, data-model).              | **Fora do `nextEventAt`.** O plano vem de `radiationPlan(seed, ciclo, config)`, sem estado.                                         | Os testes da US1 exigem que as chaves de `nextEventAt` sejam só as regras de clima (`events.test.ts:62` e `:219`). Mudar o teste para caber a chave seria enfraquecê-lo. Além disso, o `GameState` não tem outro campo para uma tempestade que ainda não começou.            |
| 2   | Todo sorteio usa `state.rng` e grava o valor de volta no estado (research.md).            | **A radiação tem fluxo próprio** e não toca em `state.rng`. O clima continua com `state.rng`. A exceção está escrita no research.md. | Consequência da decisão 1. Bônus: tempestade e poeira **não deslocam os sorteios uma da outra**, mesmo que o PO mude `perCycle` (testado: o clima de um ciclo inteiro é idêntico com e sem tempestades).                                                                      |
| 3   | A seed da radiação seria a do jogo "pura".                                                | **Seed misturada com o ciclo e uma constante fixa.**                                                                               | A seed pura repetiria os mesmos números do `state.rng` inicial e o primeiro intervalo de poeira ficaria correlacionado com o horário da tempestade. Misturar o ciclo também dá um horário diferente em cada ciclo (testado).                                                    |
| 4   | A tempestade podia começar em qualquer ponto de uma estação permitida.                    | **Nunca nos primeiros `warningSeconds` da estação.**                                                                               | No início de cada estação o briefing da comandante pausa o jogo. O alarme não pode tocar em cima dele. A margem reaproveita `warningSeconds` (nenhum número novo no código). Um valor próprio exigiria campo novo na config, por PR `content/` + `shared/`.                    |
| 5   | Escolher o evento DONKI sorteando na lista inteira com `nextIndex`.                       | **Grupos por posição** (`i % grupos`), um sorteio por grupo.                                                                       | Sorteando na lista inteira, duas tempestades da mesma partida citavam o mesmo evento em cerca de 20% das partidas (14 eventos, 3 tempestades). Os grupos não exigem estado novo nem leitura do log. Custo: cada tempestade escolhe entre 4 ou 5 eventos, e não entre 14.        |
| 6   | `updateRadiationStorm(…, events: SepEvent[])` recebia a lista.                            | **Recebe uma função `() => readonly SepEvent[]`.** Os testes passam `() => fixtures`.                                              | A função é chamada só quando a tempestade vai começar, e o snapshot é lido só então (leitura preguiçosa). Um parâmetro de um único tipo dispensa testar `typeof` e cobrir dois ramos. Esta decisão veio da revisão; custou **3 linhas** nos testes existentes, só para embrulhar as fixtures em `() => …`. |
| 7   | `ref` da entrada `radiation_storm` seria o id do evento.                                  | **`ref` = link do evento DONKI**, ou a palavra `radiation_storm` quando não há evento.                                             | O link deixa a US4 casar a tempestade com o evento real, sem texto novo. O custo é um campo com **dois significados**: o debrief precisa tratar os dois casos. Está registrado em `contracts/events-engine.md` e no T020.                                                        |
| 8   | O log registraria a tempestade no impacto (ideia da revisão).                             | **Uma entrada, no início do aviso.**                                                                                               | O teste exige `entry.at ≈ início` e uma entrada por tempestade. É coerente: o log diz quando o evento começou. Trocar para o impacto exigiria mudar o teste, e essa decisão é do autor dos testes.                                                                               |
| 9   | A fase poderia ser derivada só do `elapsed`, sem estado.                                  | **A fase fica em `radiationStorm`.**                                                                                               | Um tick longo que passa de todo o fim da tempestade ainda deve mostrar o aviso (teste do salto), e o engine (`crew.ts`, `jobs.ts`, `actions.ts`) já lê `radiationStorm`. Derivar só do tempo perderia o aviso nesse caso.                                                       |
| 10  | O snapshot e o script seriam definidos livremente.                                        | **Formato `{ range, fetchedAt, sep }`**; só `sep`; `flr` e `cme` omitidos (nunca `[]`); chave de API só do ambiente ou do `.env.local`. | O jogo só usa SEP. Gravar `flr: []` pareceria "não houve erupções". `cme` pesava cerca de 340 KB num mês e entraria no pacote do jogo. O FLR devolveu 404 na `api.nasa.gov` (causa não confirmada). Está no `src/data/snapshots/README.md`.                                      |

### Efeitos colaterais dessas mudanças em documentos que já existiam

- **us1-implementation.md, seção 4 e seção 7:** dizem que a US3 guardaria o horário em
  `nextEventAt`. **Não é mais verdade** (decisão 1). A preservação das chaves que não são regras
  de clima continua no código da US1 e não causa problema, mas a US3 não usa essa chave.
- **us2-implementation.md, seção 7:** sugeria "radiação depois do laço da US2" por causa da ordem
  do `rng`. Foi seguido na ordem de execução, mas deixou de ser necessário porque a radiação não
  usa `state.rng` (decisão 2).
- **Alterados nesta US:** `data-model.md`, `contracts/events-engine.md`, `research.md` e
  `tasks.md` (T016–T019 marcados e T020 com os dois formatos de `ref`).

---

## 5. Critérios de aceite da US3: situação

| #   | Cenário da spec                                                                              | Situação     | Evidência / observação                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | O horário da seed chega: aviso de 10 s que identifica o evento DONKI                         | **Completo** | Por 12 seeds: `perCycle` tempestades por ciclo, só nas estações permitidas, a partir de `fromCycle`, com `warningSeconds` e `durationSeconds` lidos da config. |
| 2   | Durante o aviso, abrigar a tripulação protege quando a tempestade chega                      | **Completo** | Teste com o engine real (`updateJobs`, `updateCrew`, `bringAllInside`): todos vivos depois. A parte de proteger é do `crew.ts` do Breno; a US3 fornece as fases. |
| 3   | Astronauta fora ou em habitat sem abrigo morre                                               | **Completo** | Com abrigo, só morre quem ficou fora (`cause: 'radiation_storm'`). Sem nenhum abrigo, todos morrem.                                                         |
| 4   | A tempestade acaba e a próxima estação não herda                                             | **Completo** | Volta a `null` no fim da fase ativa, e nunca existe numa estação fora das permitidas. Os trabalhos que esperavam começam depois do fim.                     |
| 5   | Snapshot válido: nome ou data e link, identificado como arquivado                            | **Completo no motor e nos dados; a tela é da US4** | `basedOn` bate com um registro do `2024-05.json`; a mesma seed cita o mesmo evento. O rótulo "arquivado" na tela de fontes é o T025.                       |
| 6   | Snapshot malformado ou indisponível: informar o problema sem fabricar fonte                  | **Completo** | 8 formatos de snapshot corrompido e 12 tipos de registro inválido: nenhum lança erro, todos aparecem em `problems`. Lista vazia: `basedOn` é `null`.        |
| 7   | Tempestades da mesma partida citam eventos diferentes; a mesma seed cita os mesmos           | **Completo** | Com 14 eventos e 12 seeds, os 3 eventos de uma partida sempre diferem. Com 1 ou 2 eventos o jogo não quebra (grupo vazio sorteia na lista inteira).          |

**Resposta direta: a US3 está completa no motor e na camada de dados. O que falta para o jogador
_ver_ a citação está em outras áreas (seção 7).**

---

## 6. O que a US3 ainda NÃO faz

- **Não mostra nada na tela.** O alarme, o botão "Take shelter" e o texto do evento são da
  interface (Dev B). A US3 entrega `radiationStorm.basedOn` com a data e o link.
- **Não mostra "tempestade em X segundos".** Como o horário não fica no estado, o HUD não tem
  como mostrar uma contagem regressiva antes do aviso. É coerente com um alarme surpresa.
- **Não explica nem soma as mortes no debrief.** Isso é a US4 (T020–T025).
- **Não mata ninguém por conta própria.** A morte e a pausa dos trabalhos já estavam no
  engine do Breno. A US3 só liga e desliga as fases.
- **Não busca dados em runtime.** O snapshot é um JSON embutido no pacote, como os JSON de
  configuração.
- **Não tem texto para o jogador.** Quando `basedOn` é `null` (lista vazia), o texto do alerta é
  combinado com o PO de interface, e não pode inventar uma fonte.

---

## 7. Como isso afeta as outras specs

### US4 (debrief e fontes) — mesma área, próxima PR

- A entrada do log tem `kind: 'radiation_storm'`, `cause: 'radiation_storm'` e `ref` com **dois
  significados**: o link do DONKI, ou a palavra `radiation_storm`. Distinguir por
  `startsWith('https://')` é frágil: o ideal é um helper único em `debrief.ts` e um teste
  (T020) para os dois formatos.
- As mortes por radiação continuam sendo `kind: 'death'` com `cause: 'radiation_storm'` (gravadas
  pelo `crew.ts`), então o debrief já consegue explicar a perda.
- A tela de fontes (T025) deve mostrar o evento DONKI como **arquivado**, com data e link. A
  fonte da regra continua em `config.mission.radiationStorm.source`.
- O `CREDITS.md` (T026) precisa da atribuição do snapshot DONKI da NASA.

### Engine (Breno)

- Nada a mudar. `crew.ts`, `jobs.ts` e `actions.ts` já leem `radiationStorm`. A US3 só passou a
  escrevê-lo de verdade.
- Os testes de missão inteira (`mission.test.ts`) continuam verdes: a base preparada tem abrigo e
  ninguém morre.
- Se o time preferir guardar o plano das tempestades no estado (por exemplo para o HUD mostrar
  contagem regressiva), o caminho é um PR `shared/` com campo novo em `GameState`.
- `updateEvents` importa `src/data/donki`. O snapshot é um JSON estático embutido no pacote,
  sem leitura de arquivo em runtime. Se o tech lead considerar isso inaceitável, o caminho
  alternativo é `GameConfig` ganhar a lista (pedido `shared/`).

### Interface (Dev B)

- Para o alarme: `radiationStorm.phase`, `phaseEndsAt` (tempo de jogo em que a fase acaba) e
  `basedOn` (`{ date, url }` ou `null`).
- Com `basedOn: null`, o alerta não pode inventar uma fonte. O texto exato é combinado com o PO.

### Cena (Dev C)

- O `visualState` já usa `radiationStorm?.phase === 'warning'` para o tom de aviso, e agora isso
  passa a acontecer de verdade durante a missão.

### POs

- `fromCycle`, `perCycle`, `seasons`, `warningSeconds` e `durationSeconds` continuam em
  `mission.json`, e **mudar qualquer um muda o jogo sem tocar em código** (os testes trocam esses
  valores e conferem). `perCycle: 0` desliga as tempestades.
- **`warningSeconds` agora também é a margem do início da estação.** Se o PO aumentar o aviso,
  a tempestade passa a começar mais tarde na estação. É um efeito que o PO pode não esperar.
- Se os POs quiserem uma margem independente, é um campo novo na config.
- O Straus23 (PO de ciência) pode conferir a citação: abrir o link de um evento do
  `2024-05.json` no DONKI e comparar com a data.

---

## 8. Riscos e pontos em aberto

1. **`ref` com dois significados.** É a decisão mais frágil: um consumidor que leia `ref` sem
   saber disso mostra a palavra `radiation_storm` como se fosse um link. Mitigação: contrato e T020.
2. **Horário recalculado a cada tick.** `radiationPlan` roda a cada chamada. É barato (poucos
   números por ciclo) e a missão inteira continua dentro do teste de desempenho (2 s), mas é uma
   conta que o estado não guarda.
3. **Plano diferente se a config mudar no meio da partida.** Como o plano é recalculado, trocar
   `radiationStorm` na config durante um jogo desloca as tempestades futuras. Em produção a config
   não muda durante o jogo.
4. **Fase ativa e fim de missão.** Se a missão acaba durante a tempestade, o estado final guarda
   `radiationStorm` ativa. O debrief lê o log e não deve depender dela.
5. **Snapshot de um mês só.** Há 14 eventos para 3 tempestades. Funciona e é a razão do grupo de
   4 ou 5 eventos; se o PO aumentar `perCycle` ou os ciclos, os grupos encolhem e, com menos
   eventos que grupos, um evento pode se repetir (exceção aceita na spec).
6. **Ordem das estações.** O plano assume as estações na ordem do `seasons.json`
   (primavera, verão, outono, inverno). Reordenar o arquivo desloca os horários.
7. **`console.warn` só na primeira leitura.** Um snapshot corrompido avisa uma vez e a
   tempestade cita `null`. O aviso não aparece na tela: só no console do desenvolvedor.
8. **Ambiente no Windows.** O Vitest falha em todos os arquivos se for chamado de um caminho com
   `c:` minúsculo (inclusive Git Bash). Rodar de `C:\Users\caio1\mars-outpost`.
9. **Três linhas de teste existente foram alteradas** (embrulhar as fixtures em `() => …`, decisão
   6). Nenhum teste foi apagado, pulado ou enfraquecido. Vale registrar isso no PR.

---

## 9. Como rodar

```bash
npx vitest run src/engine/events/events.test.ts src/data/donki.test.ts   # 128 testes
npm run check                                                            # format, lint, typecheck, vitest, build
npm run data:fetch -- 2024-05-01 2024-05-31                              # só para atualizar o snapshot (precisa de rede)
```

### Os blocos de testes da US3

**`src/data/donki.test.ts`:**

1. **Snapshot válido:** converte todos os registros do snapshot real, na ordem; mês vazio;
   `flr` e `cme` são ignorados.
2. **Snapshot quebrado:** 8 formas de snapshot corrompido e 12 de registro inválido (sintéticos,
   marcados como tais): nenhum lança erro e cada um vira um `problem`.
3. **`sepGroup`:** divide por posição, sem cruzar grupos; grupo vazio devolve a lista; não muta.
4. **`pickSepEvent`:** mesma posição, mesmo evento; dá a volta; lista vazia dá `null`.
5. **`sepEvents`:** vem do snapshot, lê uma vez, está congelado.
6. **O arquivo do snapshot:** formato `{ range, fetchedAt, sep }`, sem `flr`/`cme` vazios, sem chave
   da API.

**`src/engine/events/events.test.ts`:**

1. **Quando vem:** `perCycle` por ciclo desde `fromCycle`, só nas estações permitidas, horário
   da seed, tudo lido da config.
2. **Aviso, impacto e fim:** durações da config (testado com valores ímpares), próxima estação
   não herda, independente do tamanho do tick, um tick longo nunca pula o aviso.
3. **O evento DONKI:** sempre um dos arquivados, três diferentes por partida, grupos pela
   config, lista curta ou vazia.
4. **Log e pureza:** uma entrada por tempestade, entrada com `at` do início, não muta o estado
   nem a lista, devolve a mesma referência quando não há o que fazer.
5. **Com o engine real:** morte de quem está fora, todos morrem sem abrigo, abrigar durante o
   aviso salva, trabalhos esperam o fim.
6. **Plano próprio:** `radiationPlan` bate com as tempestades vistas, vazio fora dos ciclos,
   horários diferentes por ciclo, margem no início da estação, `state.rng` intacto e clima
   idêntico com e sem tempestades (6 testes).
7. **Integração:** pelo `updateEvents`, o evento citado é um registro do `2024-05.json`.
