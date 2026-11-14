# US2 — Poeira, frio, escuridão e danos de tempestades

Resumo da implementação da User Story 2 da spec 002 (área `data/`), para explicar ao time.

- **Código:** `src/engine/events/events.ts` (função `updateEvents`, ~200 linhas novas)
- **Testes:** `src/engine/events/events.test.ts`, 43 testes novos em 7 blocos (T008a–g), escritos
  antes da implementação (red). Total do arquivo: 59 testes + 4 `it.todo` da US3.
- **Tarefas:** T007a–T012 de `tasks.md`
- **PR:** #30 (`data/us2-dust-cold-darkness` → `develop`)
- **Contrato alterado:** nenhum. Só usa campos que já existiam em `GameState` e em `events.json`.

---

## 1. Explicação em 30 segundos

A US1 criou o relógio: _quando_ cada evento acontece. A US2 faz o que acontece **quando o relógio
bate**. Quatro coisas:

1. **Estruturas mudam de status.** Redemoinhos danificam painéis; poeira entope máquinas; a
   tempestade global dá curto em minas e refinarias. O status fica na estrutura até alguém
   consertar ou limpar.
2. **Tempestades viram eventos ativos** com hora de fim (`endsAt`). Frio, escuridão e tempestade
   global viram eventos ativos que duram a estação inteira.
3. **Tudo vai para o log**, uma entrada por estrutura atingida, com a causa.
4. **Tudo é determinístico.** Os alvos saem do mesmo `state.rng` da US1; mesma seed, mesmos
   alvos, qualquer que seja o tamanho do tick.

A US2 **só escreve** `activeEvents`, `structures[].status` e `log`. Quem **lê** isso para reduzir
a produção solar, bloquear a limpeza ou bloquear trabalhos externos é o engine (Breno).

---

## 2. O que a função faz

`updateEvents(state, config, dt)` continua sendo chamada a cada tick, depois de `advanceTime`.
Os passos 1 a 3 e 7 são da US1; os demais são novos.

1. **Descobre onde estamos** (ciclo, estação, início e fim da estação).
2. **Escolhe as regras da estação** atual.
3. **Limpa o que sobrou da estação anterior** em `activeEvents` e `nextEventAt`.
4. **Ativa os eventos de estação inteira** (regras sem `intervalSeconds`: frio, escuridão,
   tempestade global). Se a regra ainda não tem evento ativo, cria um com `endsAt: null`. Como a
   checagem é "já existe?", ele é criado **uma única vez**, mesmo que a função rode mil vezes.
5. **Sorteia o primeiro horário** das regras com intervalo (US1).
6. **Monta a lista dos curtos-circuitos** da tempestade global que caem dentro deste tick (ver
   seção 4).
7. **Aplica as ocorrências vencidas em ordem cronológica.** Um laço pega sempre a ocorrência mais
   antiga que já venceu, entre todas as regras e os curtos, aplica o efeito e, se for uma regra
   com intervalo, sorteia o próximo horário (`drawAfter`, US1). Empate no mesmo instante: vale a
   ordem das regras em `events.json`.
8. **Remove as tempestades que acabaram** (`endsAt <= elapsed`).
9. **Devolve o estado novo**, sem mutar o antigo. Se nada mudou, devolve a mesma referência.

### O efeito de uma ocorrência (`occur`)

| Parte da regra         | O que acontece                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `damagePanels: N`      | Sorteia até N painéis **sem repetição** entre os elegíveis e marca `damaged`. Com menos elegíveis, danifica os que houver; sem nenhum, perde. |
| `clog` + `clogChance`  | Sorteia a chance **uma vez**, antes dos alvos (ausente = 100%). Se passar, sorteia **um alvo de cada tipo** listado e marca `clogged`.      |
| `durationSeconds`      | Cria um evento ativo com `endsAt = início + durationSeconds`, `solarFactor` e `blocksExternalJobs` copiados da regra.                       |

### Quem pode ser atingido

- **Painel solar** = qualquer estrutura com `power.kind === 'solar'` em `structures.json`.
- **Filtro** = qualquer upgrade com `effect === 'dust_filters'` em `upgrades.json`.
- **Pronta** = status diferente de `building`. **Elegível** = pronta, sem filtro e, para
  redemoinho e entupimento, também em bom estado (`active`).
- **Curto-circuito** é mais permissivo: pode cair numa estrutura entupida (o curto é mais grave).
  Nunca cai numa estrutura em construção, com filtro ou que já está em curto.

### Prioridade de status

`short_circuit` (3) > `damaged` (2) > `clogged` (1) > `active` (0). Uma função `hit` só troca o
status se o novo for **mais grave** que o atual. Por isso um entupimento nunca desfaz um curto, e
um curto sempre substitui um entupimento. Cada estrutura tem um status só.

### Sem números no código

Fator solar, chance de entupir, quantidade de painéis, período dos curtos, tipos de estrutura: tudo
vem de `events.json`, `structures.json` e `upgrades.json`. Os únicos valores no código são os
**neutros**: `solarFactor` ausente vale `1`, `blocksExternalJobs` ausente vale `false`, e uma
tolerância de ponto flutuante de `1e-9` ao contar períodos.

---

## 3. Exemplos da função funcionando

Todos os números abaixo vieram de rodar a função de verdade com o `config` atual, seed 42, num
estado montado à mão (6 painéis, 2 geradores de oxigênio, 2 minas, 2 refinarias, nenhum filtro) e
ticks de 1 s. Os segundos são contados do início da estação; como o tick é de 1 s, o "37 s" abaixo
é o tick em que o redemoinho de 36,01 s (da US1) foi visto.

### Exemplo 1 — Redemoinhos gigantes, ciclo 3, primavera

Regra `c3_dust_devils`: 2 painéis danificados e um gerador, uma mina e uma refinaria entupidos,
com 100% de chance.

| Tick | Log (kind `ref`, `cause` = regra)                                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 37 s | `damaged` solar_panel-3 · `damaged` solar_panel-6 · `clogged` oxygen_generator-1 · `clogged` mine-2 · `clogged` iron_refinery-1                                 |
| 73 s | `damaged` solar_panel-5 · `damaged` solar_panel-2 · `clogged` oxygen_generator-2 · `clogged` mine-1 · `clogged` iron_refinery-2                                 |

Cada redemoinho gera **5 entradas de log**: 2 painéis diferentes + 3 máquinas, uma de cada tipo.
No segundo redemoinho os painéis 3 e 6 já estavam danificados e **não entram no sorteio**: caem
outros dois (5 e 2). O mesmo vale para as máquinas: o gerador 1 já estava entupido, então foi
sorteado o 2. Com os 2 geradores, 2 minas e 2 refinarias gastos, um terceiro redemoinho não
entupiria mais nada (cada tipo ficaria sem alvo elegível e seria ignorado).

### Exemplo 2 — Tempestade global, ciclo 3, verão

Regra `c3_global_storm`: `shortCircuitEverySeconds: 45`, tipos `mine` e `iron_refinery`.

| Tick  | O que acontece                                                                  |
| ----- | ------------------------------------------------------------------------------- |
| 1 s   | Evento ativo `global_dust_storm`, `endsAt: null`, `solarFactor: 0,2`            |
| 45 s  | `short_circuit` iron_refinery-1                                                 |
| 90 s  | `short_circuit` mine-2                                                          |
| 135 s | `short_circuit` iron_refinery-2                                                 |

Os curtos caem em 45, 90 e 135 s, contados do **início do verão**, não de quando o jogador abriu o
jogo. A cada 45 s o sorteio é entre as minas e refinarias elegíveis (os 4 candidatos), e nenhuma
estrutura de outro tipo é tocada. No ciclo 4 o período continua 45 s: o fator de 0,75 só vale
para `intervalSeconds` (FR-006).

### Exemplo 3 — Tempestade local, ciclo 1, verão

Regra `c1_local_storm`: intervalo 30 s, duração 15 s, `solarFactor: 0,6`.

| Tick  | Evento ativo                                  |
| ----- | --------------------------------------------- |
| 30 s  | Começa: `dust_storm`, `endsAt` = 45           |
| 45 s  | Acaba (o tempo alcançou `endsAt`)             |
| 75 s  | Começa a próxima: 45 + 30 s de intervalo, `endsAt` = 90 |
| 90 s  | Acaba                                         |
| 120 s | Começa a terceira, `endsAt` = 135             |

É a decisão T1 do PO: o intervalo conta do **fim** da tempestade anterior, então o ritmo é
30 s de espera + 15 s de tempestade = uma tempestade a cada 45 s.

### Exemplo 4 — O tamanho do tick não muda o resultado

Mesmo cenário do exemplo 2 (ciclo 3, verão, seed 42), 200 s de jogo, avançando em ticks de 1 s e
em ticks de 50 s:

| Tick   | Estruturas em curto                                       |
| ------ | --------------------------------------------------------- |
| 1 s    | mine-1 · mine-2 · iron_refinery-1 · iron_refinery-2       |
| 50 s   | mine-1 · mine-2 · iron_refinery-1 · iron_refinery-2       |

O resultado é igual: `true` na comparação das estruturas. Um tick de 50 s cobre uma ou duas
ocorrências de uma vez, e o laço do passo 7 as aplica uma a uma, na ordem, com o mesmo `rng`.

### Exemplo 5 — Eventos de estação inteira no primeiro tick

| Cenário             | `activeEvents` no primeiro tick                              |
| ------------------- | ------------------------------------------------------------ |
| Ciclo 1, outono     | `cold`, `solarFactor` 1, `blocksExternalJobs` `false`        |
| Ciclo 2, inverno    | `darkness`, `solarFactor` **1**, `blocksExternalJobs` `true` |
| Ciclo 3, inverno    | `darkness`, `solarFactor` **1**, `blocksExternalJobs` `true` |
| Ciclo 3, verão      | `global_dust_storm`, `solarFactor` 0,2, `blocksExternalJobs` `false` |

> **Atenção ao `solarFactor` 1 da escuridão.** Hoje as regras `c2_dark_winter` e `c3_dark_winter`
> não têm `solarFactor` em `effects`, então o evento sai com o valor neutro 1 e **os painéis
> continuariam produzindo no inverno**. A spec manda 0. O código já copia o valor da regra: basta
> o PO aplicar o **CR-1** (`"solarFactor": 0` nas duas regras). Os testes não dependem disso
> porque montam a própria regra de escuridão.

---

## 4. Decisões de design (e por quê)

| Decisão                                                                                        | Motivo                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uma única linha do tempo para ocorrências e curtos, apanhando sempre a mais antiga             | Garante a ordem cronológica quando um tick grande cobre várias ocorrências: o `rng` é consumido sempre na mesma ordem, então o resultado não depende do `dt`.                              |
| Curtos calculados pela janela `(max(0, secondsIntoSeason − dt), secondsIntoSeason]`            | Sem guardar nada no estado (nenhum campo novo no contrato). O `max(0, …)` faz o resto de um tick que cruzou a virada de estação **não** contar curtos da estação nova.                    |
| Curtos não usam `nextEventAt` nem o fator do ciclo 4                                           | O período é fixo (45 s) e a spec diz que o ciclo 4 não o escala. Contar do início da estação dispensa estado.                                                                              |
| Último curto exclui o instante exato do fim da estação                                         | Uma ocorrência no fim da estação não acontece: a estação acaba antes (mesmo critério do clamp da US1).                                                                                   |
| `clogChance` sorteada **antes** dos alvos, uma vez por ocorrência                              | Decisão do PO: os tipos entopem juntos ou nenhum. Também fixa a ordem de consumo do `rng`.                                                                                                |
| Entupimento só em estrutura `active` (CR-6, **pendente do PO**)                                | Assim todo entupimento sorteado tem efeito, como o sorteio de painéis. Se o PO decidir o contrário, a mudança é só o filtro `healthy` no código.                                          |
| Id do evento ativo = `<regra>@<instante>`                                                      | Determinístico e único por ocorrência; não precisa de `state.nextId`, que é do engine.                                                                                                     |
| Evento ativo só quando a regra tem `durationSeconds` (ocorrência) ou não tem intervalo (estação) | Redemoinho é instantâneo: danifica e não deixa evento ativo. Tempestade de poeira local/densa tem duração e vira evento.                                                                 |
| Painel e filtro identificados pela config, não por id                                          | A constituição proíbe números de balanceamento no código; ids como `solar_panel` e `dust_filters` seriam o mesmo problema se o PO renomear.                                               |
| Status persistente não é tocado na troca de estação                                            | FR-005: dano, entupimento e curto ficam até reparo ou limpeza. Só os eventos ativos são limpos.                                                                                          |

---

## 5. Critérios de aceite da US2: situação

| #   | Critério                                                                              | Situação     | Evidência / observação                                                                                                                       |
| --- | ------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Redemoinho: até `damagePanels` painéis elegíveis, sem repetição                        | **Completo** | 40 seeds; menos elegíveis, todos; nenhum elegível, perde; filtro, construção e outro status ficam de fora.                                    |
| 2   | `clog`: chance antes, um alvo por tipo, tipo sem alvo ignorado                         | **Completo** | Chance 0, 0,5 (todos ou nenhum) e ausente; tipo desconhecido ignorado sem afetar os outros.                                                    |
| 3   | Tempestade com duração: evento ativo com `endsAt`, próxima conta do fim                | **Completo** | `endsAt` = início + duração; removida em `elapsed >= endsAt` e na troca de estação; tempestade inteira dentro de um tick ainda entope.        |
| 4   | Tempestade global: ativa o verão, curtos a cada 45 s do início do verão                | **Completo** | Mesmo resultado com ticks de 1, 7, 45 e total; sem elegível a ocorrência se perde; ciclo 4 sem fator; resto do tick na virada não conta.      |
| 5   | Escuridão: ativa desde o primeiro tick, copia `solarFactor` e `blocksExternalJobs`     | **Completo no código; config depende do CR-1** | Testado com regra montada. Com a config atual o `solarFactor` sai 1 (ver exemplo 5).                                       |
| 6   | Frio: ativo, sem efeito mecânico                                                       | **Completo** | `solarFactor` 1, sem bloqueio, criado uma vez.                                                                                                |
| 7   | Prioridade curto > danificado > entupido                                              | **Completo** | Curto substitui entupido; entupimento posterior não desfaz o curto.                                                                           |
| 8   | Log por estrutura atingida, `ref` e `cause`                                           | **Completo** | Uma entrada por estrutura; entradas anteriores do log preservadas.                                                                            |
| 9   | Eventos temporários somem; status persistem; filtro posterior não cura               | **Completo** | Estruturas iguais depois de duas trocas de estação; filtro instalado depois não muda status.                                                  |

**Resposta direta: a US2 está completa no `updateEvents`. O que falta para o jogador _sentir_ os
efeitos está em outras áreas (seção 7).**

---

## 6. O que a US2 ainda NÃO faz

- **Não reduz a produção solar.** O evento ativo tem `solarFactor`, mas quem multiplica é o
  engine (`power.test.ts` ainda tem um `it.todo` para isso). Até lá, tempestade e escuridão não
  mudam a energia.
- **Não bloqueia a limpeza** durante tempestade de poeira, nem os trabalhos externos no inverno.
- **Não conserta curto-circuito**: o reparo precisa levar a estrutura de `short_circuit` a
  `active`.
- **Não mata ninguém.** Nem o frio extremo do inverno (ciclos 3 e 4), nem a radiação (US3).
- **Não cuida da tempestade de radiação.** Continua o `TODO(Dev A, US3)` no código.
- **Não tem textos do jogador.** Nomes e explicações já estão no `events.json`; mostrar isso é
  UI (Dev B) e debrief (US4).

---

## 7. Como isso ajuda as outras specs

### US3 (tempestade de radiação) — mesma área

- Pode usar o mesmo padrão: horário em `nextEventAt` com chave própria (a US1 já não apaga chaves
  que não são regras de clima), sorteios com o `rng` do estado.
- **Cuidado com a ordem do `rng`.** A US2 consome o `rng` dentro do laço de ocorrências. Se a
  radiação sortear no mesmo `updateEvents`, a ordem das duas partes precisa ficar fixa (sugestão:
  radiação depois do laço da US2) para os resultados não mudarem.
- Reaproveita `activeEvents`, `startEvent` e o jeito de escrever no `log`.
- A morte por radiação vai para o log com `kind: 'death'` e `cause: 'radiation_storm'`, sem
  conflito com as entradas da US2.

### US4 (debrief e fontes)

- O debrief lê `log`. Cada `damaged`, `clogged` e `short_circuit` agora traz `ref` (a
  estrutura) e `cause` (o **id da regra**, por exemplo `c3_global_storm`). Dá para buscar a regra
  em `events.json` e usar o `explain` e a `source` dela, sem texto novo no código.
- Como o `cause` é o id da regra, o debrief pode agrupar por regra, ciclo ou estação.

### Engine (Breno) — CR-5

| O que o engine precisa fazer                                                  | Onde está o dado                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Multiplicar a produção solar pelo menor `solarFactor` ativo                   | `activeEvents[].solarFactor`                           |
| `clean` recusar com tempestade de poeira ativa (`dust_storm`/`global_dust_storm`) | `activeEvents[].kind`                              |
| Recusar trabalhos externos e pausar o em andamento                            | `activeEvents[].blocksExternalJobs`                    |
| Reparo de `short_circuit` leva a `active`                                     | `structures[].status`                                  |
| Matar quem está em habitat sem isolamento no 1º instante do inverno (ciclos 3 e 4) | `activeEvents` com `kind: 'darkness'`            |

Tudo isso só **lê** o que a US2 grava; nenhum campo de contrato novo é necessário.

### POs

- **CR-1:** `"solarFactor": 0` em `c2_dark_winter` e `c3_dark_winter`. Sem isso o inverno não
  apaga os painéis.
- **CR-6:** o entupimento pode cair numa estrutura já entupida ou em curto? Hoje a resposta
  implementada é "não".
- Mudar `damagePanels`, `clogChance`, `solarFactor`, `shortCircuitEverySeconds` ou os tipos em
  `events.json` muda o jogo sem tocar em código.

### Cena (Dev C)

- O `visualState` pode ler `activeEvents` (tempestade, escuridão, frio) e `structures[].status`
  (painel danificado, máquina entupida ou em curto) para mostrar as consequências.

---

## 8. Riscos e pontos em aberto

1. **Sem o CR-1, a escuridão não zera os painéis.** Os testes passam, mas o inverno do jogo real
   ficaria fácil demais até o PO ajustar o JSON.
2. **CR-6 pendente.** Se o PO aceitar entupir estruturas já entupidas ou em curto, a regra de
   alvo muda e os testes de elegibilidade do entupimento também (precisa de nova autorização).
3. **Efeitos só aparecem com o engine integrado.** Até o CR-5 ser feito, o jogo só mostra o status
   das estruturas e o log, não a queda de energia.
4. **A troca de estação ainda depende do `advanceTime`.** Os testes de limpeza montam o estado já
   na estação nova. Vale um teste de integração via `tick()` quando o engine trocar a estação de
   verdade.
5. **Dois ajustes de teste feitos na revisão.** O teste da US1 sobre limpar eventos de estação
   inteira contradizia o cenário 6 da US2 (o inverno do ciclo 1 tem frio ativo), e o teste de
   determinismo comparava um estado que satura. Ambos foram corrigidos com autorização; os
   motivos estão no PR #30.
6. **Ambiente no Windows.** O Vitest falha em todos os arquivos se for chamado de um caminho com
   `c:` minúsculo (inclusive Git Bash). Rodar de `C:\Users\caio1\mars-outpost`.

---

## 9. Como rodar

```bash
npx vitest run src/engine/events/events.test.ts   # 59 testes + 4 it.todo (US3)
npm run check                                     # format, lint, typecheck, vitest, build
```

### Os 7 blocos de testes da US2

1. **Redemoinhos (cenário 1):** painéis sem repetição, só elegíveis, sorteio varia com a seed.
2. **Entupimento (cenário 2):** um alvo por tipo, `clogChance` (0, ausente, todos ou nenhum),
   filtro, construção e status excluem.
3. **Tempestades com duração (cenário 3):** `endsAt`, expiração, id por ocorrência,
   tempestade que começa e acaba dentro de um tick.
4. **Tempestade global (cenário 4):** ativa o verão, curtos no ritmo certo para qualquer tick,
   sem elegível a ocorrência se perde, ciclo 4, virada de estação.
5. **Escuridão e frio (cenários 5 e 6):** ativos no primeiro tick, criados uma vez, cópia dos
   campos da regra.
6. **Prioridade, log e persistência (cenários 7 a 9):** curto > entupido, uma entrada por
   estrutura, status sobrevive à troca de estação, filtro depois não cura.
7. **Determinismo:** mesma seed, mesmos alvos; ordem cronológica entre regras; estado recebido
   não é mutado.
