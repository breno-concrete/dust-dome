# Pesquisa: Eventos e dados da NASA

## Decisão: Reutilizar o limite existente do engine puro

- **Decisão**: Implementar todo o comportamento de simulação em `src/engine/events/events.ts` por
  meio de `updateEvents(state, config, dt)`.
- **Motivo**: `src/engine/game.ts` já chama essa função depois de `advanceTime` e antes de
  energia, produção, trabalhos, tripulação e resultado. Isso preserva a ordem documentada do
  tick e mantém os efeitos dos eventos observáveis pelos sistemas que consomem `GameState`.
- **Alternativas consideradas**: Adicionar a lógica dos eventos a `game.ts` ignoraria o módulo de
  eventos sob responsabilidade da área; colocá-la na store violaria o limite do engine puro e
  faria os testes determinísticos dependerem do estado do React.

## Decisão: Usar `state.rng` para toda escolha aleatória do clima

- **Decisão**: Usar `nextRange` para selecionar intervalos, `nextIndex` para selecionar
  estruturas e `nextFloat` para a `clogChance`, gravando cada valor RNG retornado no próximo
  estado.
- **Exceção, a tempestade de radiação (US3)**: o horário e o evento DONKI citado vêm de
  `radiationPlan(seed, cycle, config)`, que usa os mesmos helpers de `rng.ts` num fluxo próprio,
  iniciado pela seed misturada com o ciclo e uma constante fixa. Esse fluxo não lê nem grava o
  `state.rng`, então a regra "gravar cada valor no próximo estado" não se aplica a ele: o plano é
  recalculado da seed a cada tick. Motivo: o `GameState` não tem campo para uma tempestade que
  ainda não começou (os testes da US1 reservam `nextEventAt` às regras de clima), e assim
  tempestade e poeira não deslocam os sorteios uma da outra (testado). Custo: o HUD não pode
  mostrar "tempestade em X segundos", o que combina com um alarme surpresa. Sorteio sem repetição (vários painéis): tirar o escolhido da lista de
  elegíveis antes do próximo `nextIndex`. A lista de elegíveis segue a ordem de
  `state.structures`, para o mesmo índice apontar a mesma estrutura.
- **Motivo**: `src/engine/rng.ts` é o gerador com seed estabelecido, e a constituição exige que
  seeds idênticas produzam missões idênticas.
- **Alternativas consideradas**: `Math.random` é proibido; derivar um novo gerador a partir do
  tempo decorrido quebraria a reprodutibilidade.

## Decisão: Tratar as regras de eventos configuradas como fonte do balanceamento

- **Decisão**: Ler ciclo, estação, intervalo, duração e efeitos de `GameConfig.events` e as
  configurações de radiação de `GameConfig.mission.radiationStorm`.
- **Motivo**: `src/config/schema.ts` já modela toda a configuração de eventos, incluindo a escala
  de intervalos do quarto ciclo, efeitos de status, metadados das fontes e tempos da radiação.
- **Alternativas consideradas**: Fixar os números do cânone em TypeScript impediria os POs de
  ajustá-los e violaria a regra de responsabilidade da configuração.

## Decisão: Manter efeitos persistentes e temporários separados

- **Decisão**: Armazenar efeitos temporários ativos em `activeEvents`; armazenar status persistentes
  das estruturas e entradas do log nos campos de estado existentes. Limpar efeitos temporários no
  fim do evento ou da estação sem limpar status de dano, entupimento ou curto-circuito.
- **Motivo**: `visualState.ts` já deriva poeira e luz de `activeEvents`, enquanto o status da
  estrutura é o contrato existente consumido pelo código de produção, reparo e cena.
- **Alternativas consideradas**: Codificar todos os efeitos como status permanentes faria a
  duração das tempestades e a limpeza da estação ficarem incorretas.

## Decisão: Intervalo das tempestades conta do fim da anterior (T1, já na US1)

- **Decisão**: Próxima ocorrência = início da anterior + `durationSeconds` + intervalo. A primeira
  da estação vem um intervalo depois do início da estação (T2).
- **Motivo**: Decisão do PO. Com os valores atuais o verão de 277 s tem 6 tempestades locais
  (início aos 30, 75, 120, 165, 210 e 255 s) e 5 densas (30, 80, 130, 180 e 230 s).
- **Alternativas consideradas**: Contar do início da anterior deixaria só 15 s de sol entre duas
  tempestades locais e 10 s entre duas densas; sortear entre as duas regras foi recusado porque a seed precisa repetir a
  partida.

## Decisão: Aplicar as ocorrências em ordem cronológica, dentro do laço da US1

- **Decisão**: A ocorrência de horário `at` aplica seus efeitos (e consome o RNG) antes de
  `drawAfter` sortear a próxima. Se houver mais de uma regra com ocorrências no mesmo tick, elas
  são aplicadas em ordem de horário.
- **Motivo**: A constituição (VI) exige a mesma missão para a mesma seed. A ordem de consumo do
  RNG não pode depender do tamanho do tick. Hoje cada estação tem no máximo uma regra com
  intervalo, mas a regra protege contra configurações futuras.
- **Alternativas consideradas**: Aplicar por regra, na ordem de `events.json`, mudaria o resultado
  conforme o `dt` quando duas regras disparassem no mesmo tick.

## Decisão: Contar os curtos da tempestade global pela janela do tick

- **Decisão**: Número de curtos no tick = `floor(s / P) − floor(max(0, s − dt) / P)`, com
  `s = secondsIntoSeason` e `P = shortCircuitEverySeconds`. Um sorteio por curto.
- **Motivo**: O período conta do início do verão (T6), não do início do jogo; por isso usa
  `secondsIntoSeason` e não `elapsed`. O `max(0, …)` impede que o resto do tick anterior, na virada
  de estação, conte curtos do verão que ainda não começou ou da estação passada.
- **Alternativas consideradas**: Guardar o próximo curto em `nextEventAt` quebraria o teste da US1
  "schedules every interval rule … and only those", que exige só regras com `intervalSeconds`
  nesse mapa; criar um campo novo exigiria uma alteração de contrato.

## Decisão: Ativar eventos de estação inteira de forma idempotente

- **Decisão**: A cada atualização, para cada regra da estação sem `intervalSeconds`, criar o evento
  ativo se ainda não existir um com o mesmo `ruleId`. Tempestades com duração são removidas quando
  `elapsed >= endsAt`.
- **Motivo**: Não há sinal de "início de estação" no contrato; a limpeza da US1 já remove eventos
  de outra estação, então a nova estação começa vazia e o primeiro tick cria os seus.
- **Alternativas consideradas**: Depender do log `season_start` acoplaria os eventos à ordem de
  escrita do engine.

## Decisão: `cause` do log é o id da regra

- **Decisão**: Entradas `damaged`, `clogged` e `short_circuit` usam o id da regra em `cause`.
- **Motivo**: O debrief (US4) busca nome, explicação e fonte da regra direto na configuração, e os
  POs mudam os textos sem tocar no código.
- **Alternativas consideradas**: Uma chave por tipo de evento (`dust_storm`) perderia a diferença
  entre tempestade local e densa e exigiria uma tabela de textos no código.

## Decisão: Usar snapshots DONKI versionados, nunca acessar a NASA em runtime

- **Decisão**: Completar `sepEvents()` lendo o formato de snapshot versionado descrito em
  `src/data/snapshots/README.md` e manter `pickSepEvent()` determinístico e seguro para `null`.
- **Motivo**: O jogo precisa funcionar offline, e a constituição restringe explicitamente a
  entrada e saída da NASA a `src/data/`. Os metadados da fonte já identificam o NASA DONKI como
  base real.
- **Alternativas consideradas**: Buscar o DONKI durante uma missão tornaria o comportamento
  irreprodutível, exigiria rede e apresentaria dados arquivados incorretamente como atuais.

## Decisão: Dividir os eventos DONKI em grupos por tempestade

- **Decisão**: O evento citado por cada tempestade é sorteado com `nextIndex` só dentro do seu
  grupo (posição `i % grupos`); o número de grupos vem da configuração. Ver
  [data-model.md](data-model.md).
- **Motivo**: Sortear na lista inteira podia citar o mesmo evento em duas tempestades da mesma
  partida (cerca de 20% de chance com 14 eventos e 3 tempestades). Os grupos não se cruzam, não
  exigem estado novo nem o log, e mantêm a seed e o `nextIndex`.
- **Alternativas consideradas**: Lembrar os eventos já citados (depende do log ou de um campo de
  estado do contrato) e sortear sem reposição (exige estado). Custo da escolha: cada tempestade
  escolhe entre 4 ou 5 eventos, não entre 14.
- **Também decidido**: `events.ts` importa `sepEvents()` de `src/data/donki` e a lógica fica numa
  função interna que recebe a lista (ver `contracts/events-engine.md`).

## Decisão: Derivar o debrief de `GameState.log`

- **Decisão**: Adicionar helpers puros locais da feature para agrupar entradas do log, resolver
  textos de causa e coletar fontes; renderizar os resultados nas telas existentes de fim e fontes.
- **Motivo**: `LogEntry` já registra ciclo, estação, tipo, referência e causa opcional, sendo o
  registro autoritativo do que aconteceu. Um helper torna o comportamento testável sem montar toda
  a aplicação.
- **Alternativas consideradas**: Reconstruir perdas a partir das estruturas ou do estoque atual
  omitiria eventos históricos e poderia inventar causas.

## Decisão: Nenhum campo novo de contrato neste plano

- **Decisão**: Usar `activeEvents`, `nextEventAt`, `radiationStorm`, o status das estruturas e
  `log` como definidos atualmente. Se a implementação provar que falta um campo, parar e
  solicitar uma PR de contrato `shared/`.
- **Motivo**: O brief atribui explicitamente esses campos existentes ao DEV A e exige que
  alterações de contrato sejam coordenadas com Breno.
- **Alternativas consideradas**: Editar `src/engine/types.ts`, `src/config/schema.ts` ou
  `src/app/store.ts` a partir da branch de dados violaria as regras de ownership e CI.

## Conclusão da pesquisa

Não há itens `NEEDS CLARIFICATION` pendentes. O repositório já fornece os limites necessários do
engine, da configuração, do RNG, da store, dos testes e dos snapshots; o trabalho de implementação
é concluir o comportamento dos TODOs existentes.
