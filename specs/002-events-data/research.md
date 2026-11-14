# Pesquisa: Eventos e dados da NASA

## Decisão: Reutilizar o limite existente do motor puro

- **Decisão**: Implementar todo o comportamento de simulação em
  `src/engine/events/events.ts`, por meio de `updateEvents(state, config, dt)`.
- **Justificativa**: `src/engine/game.ts` já chama essa função depois de `advanceTime` e antes de
  energia, produção, trabalhos, tripulação e resultado. Isso preserva a ordem documentada do
  tick e mantém os efeitos de eventos observáveis pelos sistemas que consomem `GameState`.
- **Alternativas consideradas**: Adicionar a lógica de eventos a `game.ts` ignoraria o módulo de
  eventos sob responsabilidade do DEV A; colocá-la na store violaria o limite do motor puro e
  faria os testes determinísticos dependerem do estado React.

## Decisão: Usar `state.rng` para toda escolha aleatória

- **Decisão**: Usar `nextRange` para selecionar intervalos e `nextIndex` para selecionar
  estruturas e eventos DONKI, gravando cada valor RNG retornado no próximo estado.
- **Justificativa**: `src/engine/rng.ts` é o gerador seedado estabelecido e a constituição exige
  que seeds idênticas produzam missões idênticas.
- **Alternativas consideradas**: `Math.random` é proibido; derivar um novo gerador do tempo
  decorrido quebraria a reprodutibilidade.

## Decisão: Tratar as regras configuradas como fonte do balanceamento

- **Decisão**: Ler ciclo, estação, intervalo, duração e efeitos de `GameConfig.events` e as
  configurações de radiação de `GameConfig.mission.radiationStorm`.
- **Justificativa**: `src/config/schema.ts` já modela a configuração completa de eventos, incluindo
  escala do intervalo no ciclo quatro, efeitos de status, metadados de fonte e timing da radiação.
- **Alternativas consideradas**: Codificar números do cânone diretamente em TypeScript impediria o
  ajuste pelos POs e violaria a regra de ownership da configuração.

## Decisão: Manter efeitos persistentes e temporários separados

- **Decisão**: Armazenar efeitos temporários ativos em `activeEvents`; armazenar status
  persistentes das estruturas e entradas do log nos campos existentes do estado. Limpar efeitos
  temporários no fim do evento ou da estação sem limpar danos, entupimentos ou curtos-circuitos.
- **Justificativa**: `visualState.ts` já deriva poeira e luz de `activeEvents`, enquanto o status
  da estrutura é o contrato existente consumido pelo código de produção, reparo e cena.
- **Alternativas consideradas**: Codificar todos os efeitos como status permanentes faria a duração
  da tempestade e a limpeza da estação ficarem incorretas.

## Decisão: Usar snapshots DONKI versionados, nunca acesso à NASA em runtime

- **Decisão**: Completar `sepEvents()` usando o formato de snapshot descrito em
  `src/data/snapshots/README.md` e manter `pickSepEvent()` determinístico e seguro para valores
  nulos.
- **Justificativa**: O jogo precisa funcionar offline e a constituição restringe a I/O da NASA à
  `src/data/`. Os metadados de fonte já identificam NASA DONKI como a base real.
- **Alternativas consideradas**: Buscar DONKI durante a missão tornaria o comportamento
  não reproduzível, exigiria rede e apresentaria dados arquivados incorretamente como atuais.

## Decisão: Derivar o debrief de `GameState.log`

- **Decisão**: Adicionar helpers puros da feature para agrupar entradas do log, resolver textos de
  causa e coletar fontes; renderizar os resultados nas telas existentes de fim e fontes.
- **Justificativa**: `LogEntry` já registra ciclo, estação, tipo, referência e causa opcional, sendo
  o registro autoritativo do que aconteceu. Um helper permite testar o comportamento sem montar
  toda a aplicação.
- **Alternativas consideradas**: Reconstituir perdas a partir das estruturas ou do estoque atual
  omitiria eventos históricos e poderia inventar causas.

## Decisão: Nenhum campo novo de contrato neste plano

- **Decisão**: Usar `activeEvents`, `nextEventAt`, `radiationStorm`, status de estrutura e `log`
  como já definidos. Se a implementação provar que falta um campo, parar e solicitar uma PR de
  contrato em `shared/`.
- **Justificativa**: O brief atribui explicitamente esses campos ao DEV A e exige que mudanças de
  contrato sejam coordenadas com Breno.
- **Alternativas consideradas**: Editar `src/engine/types.ts`, `src/config/schema.ts` ou
  `src/app/store.ts` na branch de dados violaria ownership e as regras do CI.

## Conclusão da pesquisa

Não há itens `NEEDS CLARIFICATION` pendentes. O repositório já fornece os limites necessários do
motor, configuração, RNG, store, testes e snapshots; o trabalho de implementação é completar
comportamentalmente os TODOs existentes.
