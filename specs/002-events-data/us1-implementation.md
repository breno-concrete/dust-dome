# US1 — Agendamento determinístico de eventos sazonais

Resumo da implementação da User Story 1 da spec 002 (área `data/`), para explicar ao time.

- **Código:** `src/engine/events/events.ts` (função `updateEvents`)
- **Testes:** `src/engine/events/events.test.ts`, bloco `event scheduling` (13 testes)
- **Tarefas:** T001–T007 de `tasks.md`
- **Contrato alterado:** nenhum. Só usa campos que já existiam em `GameState`.

---

## 1. Explicação em 30 segundos

O jogo precisa que a mesma seed gere sempre o mesmo clima. A US1 faz o relógio do clima:
para cada estação, ela sorteia **quando** cada evento vai acontecer, dentro do intervalo que o
PO escreveu em `events.json`. Ela guarda esse horário em `state.nextEventAt` e, quando o horário
chega, sorteia o próximo.

A US1 **só agenda**. Ela não danifica painel, não suja máquina, não ativa tempestade. Ela deixa
pronta a linha do tempo em que a US2 e a US3 vão pendurar os efeitos.

---

## 2. O que a função faz

`updateEvents(state, config, dt)` roda a cada tick, logo depois de `advanceTime`
(ordem fixa em `tick()`: tempo → **eventos** → energia → produção → trabalhos → tripulação).

Passo a passo:

1. **Descobre onde estamos.** Pega ciclo e estação de `state.time`, a duração da estação em
   `seasons.json` e calcula:
   - `seasonStart = elapsed - secondsIntoSeason`
   - `seasonEnd = seasonStart + durationSeconds`
2. **Escolhe as regras da estação.** Filtra `events.json` por `cycles` contendo o ciclo atual e
   `season` igual à estação atual.
3. **Limpa o que sobrou da estação anterior.** Remove de `activeEvents` e de `nextEventAt`
   tudo que pertence a uma regra que _não_ é do ciclo e da estação atuais. É assim que a troca
   de estação "esvazia" o clima antigo (critério 3).
4. **Sorteia o primeiro horário** de cada regra que tem `intervalSeconds` e ainda não tem chave
   em `nextEventAt`:
   `seasonStart + nextRange(rng, min × fator, max × fator)`.
5. **Reagenda a cada disparo.** Enquanto `nextEventAt <= elapsed`, sorteia o próximo horário
   somando um novo intervalo ao horário anterior (não ao "agora"). Isso faz o horário não
   depender do tamanho do `dt`. Se a regra tem `durationSeconds` (tempestades), o intervalo conta
   do **fim** da ocorrência: próximo = início + duração + intervalo (decisão T1 do PO). A
   primeira ocorrência da estação não espera duração nenhuma.
6. **Limita ao fim da estação.** Nenhum horário passa de `seasonEnd`. Um horário igual ao fim da
   estação significa "não acontece mais nesta estação" e não conta como disparo.
7. **Devolve o estado novo, sem mutar o antigo.** Se nada mudou, devolve a mesma referência do
   estado. Isso é bom para a UI (sem re-render à toa).

O `fator` do passo 4 vale `1` em todos os ciclos, exceto no último ciclo (`seasons.cycles`),
onde vale `mission.finalCycleIntervalFactor`. Nenhum número está no código: o `0.75`, os
intervalos e as durações vêm de `src/config/*.json`.

### Exemplo (valores atuais do config, que o PO pode mudar)

| Situação                                          | Intervalo configurado | Intervalo usado  |
| ------------------------------------------------- | --------------------- | ---------------- |
| Ciclo 1, primavera, redemoinhos (`c1_dust_devils`) | 30–45 s               | 30–45 s          |
| Ciclo 3, primavera, redemoinhos gigantes          | 30–40 s               | 30–40 s          |
| Ciclo 4, primavera, as mesmas regras do ciclo 3   | 30–40 s               | 22,5–30 s (×0,75) |

---

## 3. Exemplos da função funcionando no jogo

Todos os números abaixo foram obtidos rodando a função de verdade com o `config` atual: pelo
`tick()` do engine nos exemplos 1 a 3, e com estados montados à mão nos exemplos 4 a 6 (porque a
troca de estação do `advanceTime` ainda não existe). Os tempos estão em **segundos de jogo contados do início da estação**, para
ficar legível. Por dentro, o `nextEventAt` guarda o tempo absoluto (`elapsed`), então
"39,02 s" na primavera que começa em `elapsed = 500` fica guardado como `539,02` (exemplo 4).

> **O que o jogador vê hoje, só com a US1?** Nada. O jogo ainda não sabe _o que_ fazer quando o
> horário chega. O que existe é o **relógio**: o engine já sabe _quando_ cada evento vai
> acontecer, e esse "quando" é sempre o mesmo para a mesma seed. Os efeitos chegam na US2.

### Exemplo 1 — Uma primavera inteira do ciclo 1 (seed 42)

Regra: `c1_dust_devils`, intervalo de 30 a 45 s, primavera com 255 s.

| Tempo na estação | O que `updateEvents` faz                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| 0 s → 1º tick    | A regra ainda não tem horário. Sorteia o primeiro: **`nextEventAt = 39,02 s`**. O `state.rng` avança.     |
| 39,02 s          | Horário chegou: sorteia o próximo → **75,74 s** (intervalo de 36,72 s, dentro de 30–45).                   |
| 75,74 s          | Sorteia o próximo → **118,53 s** (intervalo de 42,79 s).                                                  |
| 118,53 s         | Sorteia o próximo → **158,57 s** (intervalo de 40,04 s).                                                  |
| 158,57 s         | Sorteia o próximo → **191,20 s** (intervalo de 32,63 s).                                                  |
| 191,20 s         | Sorteia o próximo → **229,10 s** (intervalo de 37,90 s).                                                  |
| 229,10 s         | Sorteia o próximo, mas ele cairia depois dos 255 s da estação. **Limita ao fim: `nextEventAt = 255 s`.** |
| 255 s            | É o fim da estação. O horário 255 s não conta como disparo: a estação termina antes.                      |

Resultado: **6 redemoinhos** nessa primavera, em 39,02 / 75,74 / 118,53 / 158,57 / 191,20 /
229,10 s. Cada intervalo ficou entre 30 e 45 s, como o PO escreveu em `events.json`.

### Exemplo 2 — A seed manda; o `dt` não

Mesma missão, mesma primavera, mesma seed 42, mas o jogo rodando em passos diferentes:

| Forma de avançar o tempo                          | Horários dos 6 redemoinhos (s)                    |
| ------------------------------------------------- | ------------------------------------------------- |
| `tick` de 1 s                                     | 39,02 · 75,74 · 118,53 · 158,57 · 191,20 · 229,10 |
| `tick` de 0,25 s (jogo em câmera lenta)           | 39,02 · 75,74 · 118,53 · 158,57 · 191,20 · 229,10 |
| **Um único salto** de 200 s (caso extremo)        | o próximo horário agendado já fica em **229,10 s** |
| Seed **43** (outra missão), `tick` de 1 s         | 45,00 · 79,14 · 117,08 · 147,97 · 178,92 · 220,09 · 250,74 |

Duas conclusões para o time:

- **Mesma seed = mesmo clima**, não importa a velocidade do jogo nem o tamanho do `tick`. É o
  que deixa o jogo justo e os testes reproduzíveis.
- **Seed diferente = clima diferente.** A seed 43 tem 7 redemoinhos, e não 6.

No salto de 200 s, a função "alcançou" cinco horários de uma vez (39,02 → 75,74 → 118,53 →
158,57 → 191,20 → 229,10) dentro de uma só chamada. O resultado final é o mesmo do jogo
rodando passo a passo.

> **Atenção para a US2:** hoje esses cinco disparos são descartados, porque a US1 só
> reagenda. A US2 vai precisar aplicar o efeito de cada um deles dentro desse mesmo laço.

### Exemplo 3 — Ciclo 3 contra ciclo 4 (mesma seed 42, mesma regra)

A regra `c3_dust_devils` vale para os ciclos 3 e 4. No ciclo 4 o jogo fica mais difícil porque
os intervalos são multiplicados por `finalCycleIntervalFactor` (0,75 hoje).

| Ciclo | Intervalo usado | Horários dos redemoinhos na primavera (s)                                   | Quantos |
| ----- | --------------- | --------------------------------------------------------------------------- | ------- |
| 3     | 30–40 s         | 36,01 · 70,49 · 109,02 · 145,72 · 177,46 · 212,73 · 245,46                  | 7       |
| 4     | 22,5–30 s       | 27,01 · 52,87 · 81,76 · 109,29 · 133,10 · 159,55 · 184,10 · 211,28 · 240,27 | 9       |

O primeiro horário do ciclo 4 (27,01 s) é exatamente `36,01 × 0,75`. A mesma seed "tira a mesma
carta", só que numa escala menor. Resultado para o jogador: **dois redemoinhos a mais** na
mesma estação, sem nenhuma regra nova no código.

### Exemplo 4 — A estação muda: o clima antigo some

Cenário: ciclo 1, a primavera começou em `elapsed = 500` e a seed é 42. A primavera dura 255 s,
então o verão começa em `elapsed = 755`.

| Momento                    | `nextEventAt`                | `activeEvents`                        |
| -------------------------- | ---------------------------- | ------------------------------------- |
| Primavera, 1 s depois do início | `{ c1_dust_devils: 539,02 }` | vazio                                 |
| (cenário) um redemoinho ainda ativo | `{ c1_dust_devils: 539,02 }` | `[ c1_dust_devils ]`                  |
| Verão, 1º tick (`elapsed = 756`)  | `{ c1_local_storm: 785 }`    | **vazio**                             |

O que aconteceu no 1º tick do verão:

1. `c1_dust_devils` não é regra do verão do ciclo 1: sai do `nextEventAt` e do `activeEvents`.
2. `c1_local_storm` (tempestade local, de 30 s em 30 s) não tinha horário: sorteia o primeiro,
   `755 + 30 = 785`. Como o intervalo é `[30, 30]`, o resultado é sempre exatamente 30 s.
3. A nova estação começa **só com a própria agenda**.

Se havia um painel `damaged` por causa do redemoinho, ele **continua `damaged`**: o status
persistente da estrutura só some com reparo (FR-005). O que some é o evento ativo.

### Exemplo 5 — Estações sem nada para agendar

No outono do ciclo 1 só existe "Esfriando" (`c1_cold_autumn`), que dura a estação toda e não
tem `intervalSeconds`. Resultado de `updateEvents` nesse outono:

- `nextEventAt` fica vazio (`{}`);
- o `state.rng` **não é consumido**;
- se vier do verão com algum evento ativo, ele é removido.

É a mesma regra do exemplo 4, só que sem horário novo para sortear. A ativação formal dessas
regras de estação inteira (frio, escuridão, tempestade global) fica para a US2.

### Exemplo 6 — O fim da estação nunca é ultrapassado

Teste de estresse com um intervalo absurdo (`[9999, 99999]` segundos) numa primavera de 255 s:

| Chamada                    | `nextEventAt`        |
| -------------------------- | -------------------- |
| Primeiro tick da estação   | `{ c1_dust_devils: 255 }` (o fim da estação) |
| Quando a estação chega aos 255 s | continua `255`, sem sortear nada novo |

O horário sorteado cairia muito depois do fim da estação, então foi limitado a 255. E como 255
é o fim, a função não o trata como uma ocorrência: nenhum sorteio extra e nenhum evento
"fantasma" na virada.

### Exemplo 7 — Como a US2 vai usar isso (ilustrativo, ainda não implementado)

O laço de reagendamento é o lugar onde a US2 encaixa os efeitos. O desenho esperado:

```ts
while (at <= elapsed && at < seasonEnd) {
  // US2: aplicar a ocorrência que aconteceu em `at`
  //   - dust_devil: escolher painéis com state.rng e marcá-los como 'damaged'
  //   - dust_storm: criar um ActiveEvent com endsAt = at + durationSeconds
  at = drawAfter(rule, at) // US1: sorteia o próximo (início + duração + intervalo)
}
```

Com a seed 42 no exemplo 1, o primeiro redemoinho acontece em 39,02 s. Se a US2 escolher o painel
com `nextIndex(state.rng, painéis.length)`, o alvo também será sempre o mesmo para a mesma seed,
porque o `rng` é o mesmo que a US1 já avança. Essa escolha de alvo é decisão da US2, não da US1.

---

## 4. Decisões de design (e por quê)

| Decisão                                                                           | Motivo                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horários **absolutos** (`state.time.elapsed`), contados do início da estação      | O contrato de `nextEventAt` já é "próximo tempo de jogo em que a regra dispara".                                                                                                                                  |
| Reagendar a partir do horário anterior, não do `elapsed`                          | O resultado não depende de como o tempo é fatiado em ticks. Verifiquei na mão, pelo `tick()` real, com passos de 0,25 s, 1 s e 5 s: os horários são idênticos.                                                     |
| **Clamp** no fim da estação (decisão sua, tomada nesta sessão)                    | A spec proíbe agendar fora da estação, e não existe campo de contrato para "sem mais ocorrências". Guardar o instante do fim e não tratá-lo como disparo resolve sem alterar o contrato.                           |
| Regras **sem** `intervalSeconds` não entram em `nextEventAt`                      | Frio, escuridão e tempestade global duram a estação inteira. Ativá-las é efeito, então fica na US2.                                                                                                               |
| Troca de estação **inferida** pelas regras que não pertencem à estação atual      | Não há campo `agendadoPara` no `GameState`, e o plano diz para não pedir campo novo. Funciona porque duas estações seguidas nunca compartilham regra (cada regra tem uma só estação).                              |
| Chaves de `nextEventAt` que **não** são regras de clima são preservadas           | A US3 vai guardar o horário da tempestade de radiação no mesmo mapa. A US1 não pode apagá-lo.                                                                                                                     |
| Ordem de sorteio = ordem das regras em `events.json`                              | Determinismo. Hoje cada estação tem no máximo uma regra com intervalo, então a ordem ainda não importa, mas a regra fica fixada.                                                                                  |

---

## 5. Critérios de aceite da US1: situação

| #   | Critério                                                                | Situação               | Evidência / observação                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Horários sorteados dentro do intervalo configurado da estação           | **Completo**           | Testado para todos os ciclos e estações, 40 seeds, incluindo intervalo de pontas iguais (`[30,30]` dá exatamente 30) e o reagendamento após um disparo.                                                                    |
| 2   | Mesma seed e mesmos `dt` dão os mesmos tipos, horários e **alvos**      | **Completo em tipos e horários; alvos ficam para a US2** | Testado com 7 passos de `dt` diferentes. Ainda não existe "alvo": quem escolhe o painel ou a máquina é a US2.                                                                                                              |
| 3   | Evento ativo some na troca de estação; a nova começa só com a sua agenda | **Completo no `updateEvents`**, com uma dependência | Testado com estados montados à mão (spring→summer, autumn→winter, winter→ciclo 2). Estruturas já danificadas ficam como estão (FR-005). Na prática depende de o `advanceTime` do Breno trocar a estação, o que ainda é stub. |
| 4   | Ciclo 4 usa as regras de escala máxima                                  | **Completo no intervalo; efeito fica para a US2** | O intervalo é multiplicado por `finalCycleIntervalFactor`, e o teste confirma que a mesma seed dá exatamente `fator ×` o deslocamento do ciclo anterior. O efeito (tempestade global a −80%) é da US2.                       |
| —   | Caso extremo: nada agendado fora da estação                             | **Completo**           | Teste com intervalo gigante: o horário vira exatamente o fim da estação, e nenhum sorteio extra acontece depois.                                                                                                          |

**Resposta direta: o agendamento da US1 está completo. O que a spec descreve como "alvos" e
"efeito" no ciclo 4 não existe ainda porque pertence à US2.**

---

## 6. O que a US1 ainda NÃO faz

- **Não registra que uma ocorrência aconteceu.** Quando o horário chega, a função só sorteia o
  próximo. Ninguém é avisado de que "agora houve um redemoinho". A US2 vai precisar de um
  gancho nesse ponto (ver seção 7).
- **Não ativa eventos de estação inteira** (frio, escuridão, tempestade global).
- **Não cria `ActiveEvent`**, não escreve no `log`, não mexe em estruturas, tripulação ou
  trabalhos.
- **Não faz a troca de estação.** Quem avança estação e ciclo é o `advanceTime` (Breno), ainda
  stub. Por isso os testes de troca montam o `GameState` já na estação nova.

---

## 7. Como isso ajuda as outras specs

### US2 (poeira, frio, escuridão) — mesma área, próxima PR

- O laço `while (at <= elapsed && at < seasonEnd)` é **uma iteração por ocorrência**. A US2
  coloca ali dentro "aplica o efeito da regra" (danificar painel, entupir, abrir uma tempestade
  de `durationSeconds`). Não precisa de um segundo relógio.
- O mesmo `state.rng` que a US1 já avança serve para escolher o alvo (`nextIndex`). A seed
  continua mandando em tudo.
- A limpeza de `activeEvents` na troca de estação já existe. A US2 só precisa cuidar do
  `endsAt` das tempestades temporárias dentro da estação.
- Para frio, escuridão e tempestade global, a US2 ativa a regra no início da estação. A US1
  já deixa claro quais regras são essas: as que não têm `intervalSeconds`.

### US3 (tempestade de radiação) — mesma área

- Usa o mesmo mapa `nextEventAt` para o horário da tempestade, e a US1 já não apaga chaves que
  não são regras de clima.
- Reaproveita o mesmo padrão: horário sorteado com `nextRange` e `state.rng`, limitado à
  estação.

### US4 (debrief e fontes) — mesma área

- O debrief lê o `log`. A US1 não escreve nele, mas fixa a base de que a US2 e a US3 escrevem
  entradas em horários reproduzíveis, então o debrief de uma mesma seed sai sempre igual.

### Outros devs

- **Breno (engine):** o `advanceTime` precisa trocar a estação e o ciclo e manter
  `secondsIntoSeason` com o resto da divisão (sem perder tempo). A US1 já assume isso e
  funciona com `elapsed - secondsIntoSeason` como início da estação.
- **Cena:** o `visualState` (`src/features/scene/`) lê `activeEvents` para o clima visual. Com a
  US1, esse vetor passa a ser esvaziado na troca de estação, então nenhum efeito visual do clima
  antigo vaza para a estação nova.
- **POs:** mudar intervalos em `events.json` ou `finalCycleIntervalFactor` em `mission.json`
  muda o jogo sem tocar em código.

---

## 8. Riscos e pontos em aberto

1. **Dependência do `advanceTime`.** Até o Breno entregar a troca de estação, o cenário 3 só é
   verificado por estados montados à mão. Vale um teste de integração via `tick()` depois que
   ele entrar.
2. **Inferência da troca de estação.** Se algum dia duas estações seguidas passarem a
   compartilhar a mesma regra, a limpeza deixa de detectar a troca. Hoje o schema (uma
   `season` por regra) impede isso. Se virar um problema, a saída é um campo novo no contrato,
   via PR `shared/`.
3. **Dois ou mais eventos com intervalo na mesma estação.** O config atual tem no máximo um por
   estação. Se os POs adicionarem outro, o uso do mesmo gerador faz a ordem de sorteio
   depender do momento em que cada um dispara. Continua determinístico para os mesmos `dt`,
   mas é bom saber.
4. **Verificação manual não commitada.** A independência do fatiamento de `dt` (seção 4) foi
   conferida com um teste temporário que foi descartado. Se o time quiser garantir isso para
   sempre, é um bom candidato a teste permanente.

---

## 9. Como rodar

```bash
npx vitest run src/engine/events/events.test.ts   # 13 testes da US1 + 10 it.todo (US2/US3)
npm run check                                     # format, lint, typecheck, vitest, build
```

> Dica para quem usa Git Bash no Windows: o Vitest falhou aqui com
> `Cannot read properties of undefined (reading 'config')` e passou normalmente no PowerShell.

### Os 13 testes, em uma linha cada

1. Agenda exatamente as regras com intervalo do ciclo e da estação atuais, e só elas.
2. Todo horário sorteado fica dentro do intervalo (40 seeds, todos os ciclos e estações).
3. Intervalo de pontas iguais dá exatamente esse valor.
4. O estado do gerador (`rng`) avança e é gravado.
5. Depois de um disparo, o próximo horário fica dentro do intervalo.
6. Sem disparo devido, o agendamento e o `rng` não mudam.
7. Nunca agenda além do fim da estação.
8. Não muta o estado recebido.
9. Mesma seed e mesmos `dt` dão os mesmos horários; seeds diferentes divergem.
10. Na troca de estação, esvazia `activeEvents` e o agendamento antigo (estruturas danificadas
    permanecem).
11. Esvazia eventos de estação inteira quando a estação seguinte não tem nada a agendar.
12. Novo ciclo começa com agenda própria.
13. Último ciclo multiplica os intervalos por `finalCycleIntervalFactor`.
