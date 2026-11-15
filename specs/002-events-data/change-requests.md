# Pedidos de alteração para outras áreas (US2)

Origem: respostas do PO de 2026-11-14 (documento "Respostas do PO cruzadas com o repositório").
A área `data/` não edita estes arquivos (CLAUDE.md, "Hard rules"). Cada pedido traz o texto
proposto, para quem for aplicar.

| # | Para quem | Arquivo | Bloqueia a US2? |
|---|---|---|---|
| CR-1 | POs (`content/`) | `src/config/events.json` | Não (o teste usa uma regra montada até lá) |
| CR-2 | POs (`content/`) | `src/config/events.json` | Não |
| CR-3 | POs + tech lead (`shared/`) | `.specify/memory/constitution.md` | Não |
| CR-4 | POs | `docs/textos_do_jogo_mars_outpost_comandante_vega.md` | Não |
| CR-5 | Breno (`engine/`) | engine core e `specs/001-engine-core/` | Não; o jogo só fica completo com ele |
| CR-6 | PO | decisão pendente | Não (padrão adotado); confirmar antes do teste T008b |

## CR-1 — `solarFactor` da escuridão na configuração

**O quê:** acrescentar `"solarFactor": 0` em `effects` de `c2_dark_winter` e `c3_dark_winter`.

**Por quê:** a US2 copia o `solarFactor` da regra para o evento ativo (E3). Sem o campo, o 0 teria
que ficar fixo no código, o que a constituição proíbe (I: "Code never hard-codes balance values").
O schema já aceita `solarFactor` entre 0 e 1.

```json
"effects": {
  "solarFactor": 0,
  "blocksExternalJobs": true
}
```

## CR-2 — Texto de `c3_dark_winter` (F2)

**O quê:** o `explain` só fala de isolamento. Pela decisão F2, a regra de escuridão explica também o
frio e a falta de sol, como já faz `c2_dark_winter`.

```json
"explain": {
  "en": "No sunlight reaches the panels and the cold is extreme. Only insulated habitats survive this winter.",
  "pt": "Nenhuma luz chega aos painéis e o frio é extremo. Só módulos com isolamento sobrevivem a este inverno."
}
```

## CR-3 — Constituição, Parte II (versão 3.0.0 → 3.1.0)

Mudanças de texto que registram as decisões do PO. Os números não mudam.

**II.2, linha "Extreme cold":**

> At the start of winter in cycles 3 and 4, astronauts in a habitat without thermal insulation die
> immediately, with no grace period.

**II.6, linha "Dust filters & shields", coluna Effect, acrescentar:**

> Installing it later does not fix a structure that is already clogged, damaged or
> short-circuited; it only protects from then on.

**II.9, item "Winter, cycles 2–4":**

> **Winter, cycles 2–4:** all external jobs (build, upgrade, repair, clean, demolish) are blocked
> from the first second of winter. A job in progress pauses: the astronaut comes back inside and
> the job waits in the queue until spring. Production inside the base continues.

**II.10, depois da tabela:**

> - A structure has one state at a time. Priority: short-circuited > damaged > clogged; a milder
>   state never replaces a worse one. Repairing a short circuit returns the structure to normal,
>   without the clog it may have had before.
> - Only structures that are finished and have no dust filters can be hit.

**II.10, item "Cleaning":**

> **Cleaning** takes one astronaut outside for 10 s and is not possible while a dust storm is
> active (15 s local, 20 s dense, the whole summer for a global storm). Building, upgrading and
> repairing go on during storms.

**II.11, tabelas:**

| Onde | Texto atual | Texto proposto |
|---|---|---|
| Ciclo 1, verão | every 30 s, lasting 15 s | lasting 15 s; the next starts 30 s after the previous one ends (first one 30 s into summer) |
| Ciclo 2, primavera | 50% chance to clog the oxygen generators' filters | 50% chance to clog one oxygen generator |
| Ciclo 2, verão | every 30 s, lasting 20 s … each storm clogs mines and iron refineries | lasting 20 s; the next starts 30 s after the previous one ends … each storm clogs one mine and one iron refinery |
| Ciclo 3, primavera | clogs oxygen generators, mines and iron refineries | clogs one oxygen generator, one mine and one iron refinery |
| Ciclo 3, verão | every 45 s a random mine or iron refinery short-circuits | every 45 s from the start of summer, one random mine or iron refinery short-circuits (none eligible: nothing happens) |

**II.11, ciclo 4:**

> Same as cycle 3 at maximum scale: dust devil intervals × 0.75; the global dust storm still
> reduces panels by 80% and still short-circuits every 45 s.

Também atualizar o "Sync Impact Report" no topo do arquivo.

## CR-4 — Textos da Comandante Vega

Arquivo `docs/textos_do_jogo_mars_outpost_comandante_vega.md`:

- **F4:** a seção 5, "Aviso de transição antes do ciclo 3 (fim do ciclo 2)", deve entrar no
  briefing da primavera do ciclo 3 (seção 4), como manda a constituição II.12.
- **F3:** a mensagem de derrota por frio (seção 6, item 3) e o relatório final (seção 7) podem
  dizer que a perda acontece no primeiro instante do inverno.
- **Fora das decisões do PO, mas desatualizado em relação à constituição 3.0.0:** a ficha da
  tempestade solar (seção 3, item 10) e as mensagens 1 e 2 da seção 6 falam em astronauta "ferido
  por uma estação" e em morte por exposição de 100%. Na constituição a tempestade mata quem está
  sem abrigo, e a exposição nunca mata. Afeta US3 e US4.

## CR-5 — Engine (Breno)

A US2 grava `activeEvents`, status e log; o engine precisa ler e agir:

| Decisão | O que o engine faz | Sprint sugerida |
|---|---|---|
| — | Multiplicar a produção solar pelo menor `solarFactor` ativo (`power.test.ts` já tem o `it.todo`) | 2 |
| T4, T5 | `clean` recusa com tempestade de poeira ativa (`dust_storm` ou `global_dust_storm`); construir, melhorar e reparar seguem | 3 |
| E1, E2 | Com evento ativo de `blocksExternalJobs`, recusar novos trabalhos externos; o trabalho em andamento pausa, o astronauta volta e o trabalho fica na fila até a primavera | 3 |
| R6 | Reparo de `short_circuit` leva a estrutura a `active` | 2 |
| F3 | No primeiro tick do inverno dos ciclos ≥ `insulationRequiredFromCycle`, matar os astronautas em habitat sem isolamento, sem carência, com log `death` e `cause: "cold"` | 4 |

`specs/001-engine-core/contracts/engine-api.md` deve registrar o comportamento de E2 (trabalho em
andamento) e de R6.

## CR-6 — Decisão pendente do PO

**Pergunta:** o sorteio do entupimento (R3, R4, T3) considera estruturas já entupidas ou em curto?

**Padrão adotado na spec até a resposta:** não. Só estruturas em bom estado (`active`) entram no
sorteio, como no sorteio de painéis (R2). Assim, todo entupimento sorteado tem efeito.

**Alternativa:** sim. O sorteio pode cair numa estrutura já entupida ou em curto, e então não tem
efeito (R5). O jogo fica um pouco mais leve.
