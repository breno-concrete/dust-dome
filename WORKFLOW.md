# Fluxo de trabalho por sprint

Esta página é a fonte da verdade para **horários** e **branches**. Os horários dos `brief.md` e
dos `tasks.md` foram substituídos pela tabela abaixo. As regras do jogo e do projeto continuam na
[constituição](.specify/memory/constitution.md); o dia a dia de PR está no
[CONTRIBUTING.md](CONTRIBUTING.md).

## Resumo

- **1 sprint = a mesma user story em todas as áreas.** Sprint 1 = a US1 de todo mundo.
- **1 user story = 1 branch = 1 sessão do Claude Code = 1 PR para a `develop`.**
- **No fim de cada sprint, uma revisão grande**: demo, aceite dos POs, revisão cruzada e merge da
  `develop` na `main`.
- A `main` só muda no fim de uma sprint, então ela sempre tem um jogo revisado e jogável.

## Branches

```text
main     ●──────────────────────────●──────────────────────────●──── …
          \                        ↑ revisão da sprint 1        ↑ revisão da sprint 2
develop    ●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●
              ↑  ↑  ↑  ↑  ↑  (squash)
              engine/us1-seasons · data/us1-seasonal-events · ui/us1-hud
              scene/us1-grid-models · shared/contract-v2 · content/…
```

| Branch                 | Sai de    | PR para   | Como entra             | Quem faz o merge |
| ---------------------- | --------- | --------- | ---------------------- | ---------------- |
| `main`                 | —         | —         | só pelo PR da sprint   | Breno            |
| `develop` (padrão)     | `main`    | `main`    | **merge commit**       | Breno            |
| `<área>/us<N>-<nome>`  | `develop` | `develop` | squash                 | o autor          |
| `<área>/fix-<nome>`    | `develop` | `develop` | squash                 | o autor          |
| `shared/<nome>`        | `develop` | `develop` | squash, com CODEOWNERS | Breno            |
| `content/<nome>` (POs) | `develop` | `develop` | squash, o outro PO     | o PO autor       |

Áreas: `engine/` (Breno), `data/` (caio), `ui/` (jvsauma), `scene/` (pedrolmelo), `content/`
(POs). O check `ownership` reprova qualquer branch sem um desses prefixos.

Regras:

- Nunca abra PR de story para a `main`. A base padrão do repo já é a `develop`.
- Ninguém faz push direto na `main` nem na `develop`: as duas estão protegidas.
- O PR da sprint (`develop` → `main`) usa **"Create a merge commit"**, nunca squash. O squash
  separa a história das duas branches e o PR da sprint seguinte vem com conflito.

### Primeira vez neste fluxo (todos, uma vez)

```bash
git fetch --prune
git switch develop
git remote set-head origin -a
```

## Horários

| Bloco                                 | Trabalho          | Revisão grande                 |
| ------------------------------------- | ----------------- | ------------------------------ |
| Sprint 1 · US1 e fundações            | sáb 13:15 – 16:00 | 16:00 – 16:45                  |
| Sprint 2 · US2                        | sáb 16:45 – 19:00 | 19:00 – 19:30                  |
| Pausa                                 | sáb 19:30 – 20:15 |                                |
| Sprint 3 · US3                        | sáb 20:15 – 22:30 | 22:30 – 23:00                  |
| Sprint 4 · US4 (e a US5 do engine)    | dom 09:00 – 11:30 | 11:30 – 12:15 (missão inteira) |
| Polimento e balanceamento             | dom 12:15 – 14:00 |                                |
| Congelamento do código                | dom 14:00         |                                |
| Entrega no Space Apps (página e demo) | dom 14:00 – 19:30 | envio até 20:00 (prazo 23:59)  |

Se uma sprint atrasar, a retro da revisão ajusta os horários seguintes nesta tabela (PR `shared/`).

## O que cada um entrega em cada sprint

Números de tarefa do `tasks.md` de cada spec.

| Sprint    | Breno (engine)                                                         | caio (eventos e NASA)                       | jvsauma (interface)                                 | pedrolmelo (cena)                            |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| 1         | US1 estações (T001–T002, T016–T025) e `shared/contract-v2` (T003–T015) | fundação e US1 eventos sazonais (T001–T007) | UI kit e US1 HUD (T001–T015)                        | fundação e US1 grid isométrico (T001–T009)   |
| 2         | US2 economia (T026–T036) e US3 energia (T037–T052)                     | US2 poeira, frio, escuridão (T008–T012)     | US2 construção e melhorias (T016–T021)              | US2 estados visuais, clima, luz (T010–T014)  |
| 3         | US4 ações e trabalhos externos (T053–T067)                             | US3 radiação e DONKI (T013–T019)            | US3 energia, briefings, alarmes (T022–T027)         | US3 minijogo de reparo (T015–T018)           |
| 4         | US5 tripulação, vitória e derrota (T068–T079)                          | US4 debrief e fontes (T020–T027)            | US4 tela inicial, PT/EN, acessibilidade (T028–T032) | US4 som, astronautas, desempenho (T019–T026) |
| Polimento | T080–T083                                                              | T028–T030                                   | T033–T035                                           | T027–T029                                    |

O engine tem duas stories na sprint 2 porque é o caminho crítico do jogo. Se apertar, o caio
(backup do engine) pega a US2 numa branch `engine/us2-economy`.

| Sprint    | athyelbrito (PO de jogo)                                      | Straus23 (PO de ciência)                         |
| --------- | ------------------------------------------------------------- | ------------------------------------------------ |
| 1         | aprovar a Parte II no `shared/contract-v2`; preparar o aceite | ler a spec 002; preparar o aceite da US1 do caio |
| 2         | jogar a `main` da sprint 1; textos da comandante no JSON      | explicações e fontes no JSON                     |
| 3         | jogabilidade de construir e reparar                           | conferir a radiação e a citação do DONKI         |
| 4         | balanceamento                                                 | conferir debrief e fontes                        |
| Polimento | balanceamento final; página do projeto e demo                 | a ciência na página do projeto                   |

Quem revisa quem nos PRs de story: Breno ↔ caio, jvsauma ↔ pedrolmelo, athyelbrito ↔ Straus23
(JSON).

## Durante a sprint

### Dev, a cada user story

1. Partir da `develop` atualizada e abrir uma sessão nova:

   ```bash
   git switch develop && git pull
   git switch -c ui/us1-hud
   claude
   ```

2. **Vermelho.** Só os testes, e ver falhar pelo motivo certo:

   ```text
   /speckit-implement SPECIFY_FEATURE_DIRECTORY=specs/003-game-ui Só as tarefas de TESTE da US1. Rode o arquivo de teste e mostre que falha pelo motivo certo. Não implemente nada ainda.
   ```

   Ler os testes (são a spec em código) e fazer o commit `test(us1): … (red)`.

3. **Verde.** A implementação até os testes passarem:

   ```text
   /speckit-implement Agora as tarefas de IMPLEMENTAÇÃO da US1, até os testes passarem. Depois rode npm run check.
   ```

   Commit `feat(us1): …`. O agente marca as tarefas com `[X]` no `tasks.md`; vai no mesmo PR.

4. Atualizar e conferir tudo:

   ```bash
   git fetch origin && git rebase origin/develop
   npm run check
   ```

5. Abrir o PR (a base já é a `develop`) e pedir o par:

   ```bash
   git push -u origin ui/us1-hud
   gh pr create --reviewer pedrolmelo
   ```

6. CI verde: `gh pr merge --squash`, avisar "merged ui/us1" no grupo e `/clear` na sessão.
7. Revisar o PR do seu par em até 15 minutos. Sem resposta em 15 minutos, o autor faz o merge com
   CI verde e o comentário vira um PR de ajuste.

Sempre passe o `SPECIFY_FEATURE_DIRECTORY` na primeira chamada: o Spec Kit acha a spec pelo
`.specify/feature.json`, que é local e fica fora do git, não pelo nome da branch.

### PO, a cada sprint

1. **No começo:** abrir o `spec.md` de cada área e ler os cenários de aceite (Given / When /
   Then) da US da sprint. É a lista que você confere na revisão.
2. **Durante:** responder as dúvidas dos devs; jogar os PRs abertos quando der
   (`gh pr checkout N && npm ci && npm run dev`); ajustar o JSON pelo github.com (lápis →
   "Create a new branch and start a pull request"; o PR já vai para a `develop` e o outro PO
   aprova).
3. **Na revisão:** aceitar ou recusar cada US pelos cenários de aceite e abrir uma issue para
   cada problema.

### Tech lead (Breno), além da própria story

- Abrir e conduzir a revisão de cada sprint e fazer o merge da `develop` na `main`.
- Mudanças de contrato: PR `shared/` com merge em até 10 minutos; todos fazem `git pull --rebase`.
- `develop` vermelha é prioridade: o autor corrige em 10 minutos ou reverte.

## Revisão da sprint (a grande revisão)

Uns 45 minutos, com o time todo.

1. **Corte (15 minutos antes).** Só entra o que está na `develop` com CI verde. O que não ficou
   pronto não segura a revisão: continua na mesma branch e entra na sprint seguinte.
2. **Atualizar (todos).** `git switch develop && git pull && npm ci && npm run check`.
3. **PR da sprint (Breno).** `gh pr create --base main --head develop --title "Sprint N: US<N> de todas as áreas"`
   com o checklist abaixo. Esperar o CI.
4. **Demo (5 minutos por dev).** `npm run dev` numa tela; cada dev mostra a sua US passando pelos
   cenários de aceite do `spec.md`.
5. **Aceite (POs).** Para cada US, marcar no PR da sprint se os cenários de aceite passaram.
6. **Revisão cruzada de código (10 minutos).** Cada par lê o que o outro entregou na sprint:
   `git diff origin/main...origin/develop -- <pastas da área>`. Testes primeiro, depois contrato e
   regras da área (checklist no [roadmap](https://claude.ai/artifact/Kap142q2TikUnHf96kkak3)).
7. **Bugs e recusas** viram issues com o label `sprint-N`. São a primeira coisa da sprint seguinte.
8. **Decisão (Breno).** CI verde, POs aceitaram e nada quebra o jogo: merge com **"Create a merge
   commit"**. Se uma US quebra o jogo, use o botão **Revert** do PR dela no GitHub (gera um PR de
   reversão para a `develop`), faça o merge da reversão e depois o merge da sprint.
9. **Retro (5 minutos).** O que travou e se os próximos horários precisam mudar.

Checklist para colar no PR da sprint:

```markdown
## Sprint N: US<N> de todas as áreas

- [ ] engine US<N>: aceita por \_\_\_
- [ ] eventos US<N>: aceita por \_\_\_
- [ ] interface US<N>: aceita por \_\_\_
- [ ] cena US<N>: aceita por \_\_\_
- [ ] `npm run check` verde na develop
- [ ] Missão jogada até \_\_\_ sem travar
- [ ] Issues abertas: #…

Merge: "Create a merge commit" (não squash).
```

## CI

- `check` e `ownership` rodam em todo PR, para a `develop` e para a `main`.
- `check` também roda a cada push na `develop` e na `main`.
- O CI de regressão roda a cada merge na `main` e abre issues quando algo falha
  (`gh issue list --label ci-failure`); de hora em hora ele reroda os checks na `develop`.
