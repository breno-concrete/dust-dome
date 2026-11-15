# Especificação da feature: Eventos e dados da NASA

**Branch da feature**: `data/002-events-data`

**Criada em**: 2026-11-14

**Status**: Rascunho

**Entrada**: Descrição do usuário: "Leia specs/002-events-data/brief.md e a Parte II da
constituição e especifique a feature de Eventos e dados da NASA."

## Cenários do usuário e testes *(obrigatório)*

### User Story 1 - Vivenciar eventos sazonais determinísticos (Prioridade: P1)

Como jogador, quero que cada estação marciana produza seus eventos ambientais esperados em
horários repetíveis, para que a mesma seed de missão sempre ofereça o mesmo desafio.

**Por que esta prioridade**: Eventos sazonais são a base de todos os efeitos de eventos e ajudam o
jogador a aprender a se preparar para o clima. O agendamento determinístico também é necessário
para um jogo justo e testes reproduzíveis.

**Teste independente**: Iniciar duas missões com a mesma seed, avançá-las pelas mesmas estações e
comparar tipos de evento, alvos, horários e limpeza da estação. As duas execuções devem coincidir,
e nenhum evento da estação anterior pode continuar ativo.

**Cenários de aceite**:

1. **Dado** uma missão com seed conhecida e a configuração de eventos de uma estação, **quando**
   a estação avançar, **então** os horários dos eventos são selecionados deterministicamente
   dentro do intervalo configurado para a estação. A primeira ocorrência vem um intervalo depois
   do início da estação; nas regras com duração (tempestades), cada intervalo seguinte conta do
   **fim** da ocorrência anterior (início + duração + intervalo).
2. **Dado** duas missões com a mesma seed e estado inicial, **quando** receberem as mesmas
   atualizações de tempo, **então** elas agendarão os mesmos tipos de evento, horários e alvos.
3. **Dado** um evento ativo no fim de uma estação, **quando** a estação mudar, **então** o evento
   terminará e a nova estação começará somente com seu próprio agendamento.
4. **Dado** uma estação do quarto ciclo, **quando** um evento for agendado, **então** seu intervalo
   e efeito usarão as regras de escala máxima definidas para o quarto ciclo.

---

### User Story 2 - Sobreviver a poeira, frio, escuridão e danos de tempestades (Prioridade: P1)

Como jogador, quero que eventos de poeira e frio afetem minha base de forma visível e mecânica,
para que minhas escolhas sobre reparos, limpeza, energia e proteção sejam importantes.

**Por que esta prioridade**: Esses eventos são os principais perigos ambientais da missão em Marte
e conectam o sistema de eventos à produção, ao status das estruturas, à energia e à preparação
da tripulação.

**Teste independente**: Fornecer um estado e uma configuração de eventos controlados à lógica de
atualização, avançar por cada perigo de poeira e sazonal e verificar os status resultantes das
estruturas, os efeitos na produção e na energia e as restrições de trabalhos.

**Cenários de aceite**:

Termos usados nos cenários:

- **Pronta**: estrutura cuja construção terminou (status diferente de `building`).
- **Em bom estado**: status `active` (nem danificada, nem entupida, nem em curto).
- **Sem filtro**: sem o upgrade `dust_filters` instalado.
- **Elegível**: pronta, sem filtro e em bom estado, salvo quando o cenário disser outra coisa.

1. **Dado** um redemoinho de poeira, **quando** ele ocorrer, **então** até `damagePanels` painéis
   solares elegíveis, sorteados sem repetição, ficarão `damaged`. Se houver menos painéis
   elegíveis que `damagePanels`, todos os elegíveis serão danificados; se não houver nenhum, o dano
   se perde. Painéis com filtro, em construção ou já com outro status nunca entram no sorteio.
2. **Dado** uma regra com `clog` (redemoinhos dos ciclos dois a quatro, tempestade densa do ciclo
   dois), **quando** a ocorrência acontecer, **então** primeiro se sorteia a `clogChance` (ausente
   vale 100%). Se passar, **um** alvo de **cada** tipo listado em `clog` é sorteado entre as
   estruturas elegíveis desse tipo e fica `clogged`. Um tipo sem estrutura elegível é ignorado sem
   erro. No ciclo dois isso entope no máximo um gerador de oxigênio por redemoinho; nos ciclos três
   e quatro, no máximo um gerador, uma mina e uma refinaria; na tempestade densa, no máximo uma
   mina e uma refinaria.
3. **Dado** uma tempestade de poeira local ou densa, **quando** ela começar, **então** um evento
   ativo com o `solarFactor` da regra durará `durationSeconds` e será removido quando o tempo de jogo
   alcançar o fim. A próxima tempestade começa um intervalo depois desse fim. Enquanto a
   tempestade estiver ativa, só a limpeza fica proibida; construir, melhorar e reparar continuam.
4. **Dado** uma tempestade de poeira global no ciclo três ou quatro, **quando** o verão começar,
   **então** um evento ativo com o `solarFactor` da regra valerá o verão inteiro (limpeza proibida
   o verão inteiro). A cada `shortCircuitEverySeconds` contados do início do verão (o primeiro aos
   45 s com os valores atuais), **uma** estrutura é sorteada entre as minas e refinarias prontas,
   sem filtro e sem curto (uma entupida pode ser sorteada) e fica `short_circuit`. Sem nenhuma
   elegível, aquela ocorrência se perde. O fator do ciclo quatro (`finalCycleIntervalFactor`) não
   muda esse período.
5. **Dado** o inverno dos ciclos dois a quatro, **quando** o primeiro tick do inverno acontecer,
   **então** um evento ativo de escuridão com o `solarFactor` da regra (0, painéis sem produção) e
   `blocksExternalJobs` verdadeiro valerá o inverno inteiro. A mesma regra representa o frio
   severo; não existe um evento de frio separado nesses invernos.
6. **Dado** uma estação com regra de frio (outono dos ciclos um a quatro e inverno do ciclo um),
   **quando** a estação começar, **então** um evento ativo de frio sem efeito mecânico
   (`solarFactor` 1, sem bloqueio) valerá a estação inteira, só para o HUD e o debrief. O custo do
   frio vem das tabelas de aquecimento do engine.
7. **Dado** uma estrutura que já tem um status, **quando** um evento tentar aplicar outro,
   **então** vale a prioridade curto-circuito > danificado > entupido: o status mais grave
   substitui o mais leve, e o mais leve nunca substitui o mais grave. Cada estrutura tem um único
   status.
8. **Dado** que um evento danificou, entupiu ou pôs em curto uma estrutura, **quando** isso
   acontecer, **então** uma entrada é acrescentada ao log da missão (`damaged`, `clogged` ou
   `short_circuit`) com o id da estrutura em `ref` e o id da regra em `cause`.
9. **Dado** que um evento terminou ou a estação mudou, **quando** a próxima atualização ocorrer,
   **então** os eventos ativos temporários são removidos, enquanto danos, entupimentos e curtos
   continuam até o reparo ou a limpeza. Instalar o filtro depois não cura um status existente; só
   protege dali em diante.

---

### User Story 3 - Reagir a uma tempestade de radiação real (Prioridade: P1)

Como jogador, quero receber um aviso honesto antes de uma tempestade de radiação e uma conexão
clara com um evento solar real da NASA, para que eu possa abrigar a tripulação e entender a
ciência por trás do perigo.

**Por que esta prioridade**: Radiação é um perigo letal da missão, e a feature deve cumprir o
requisito de ciência real usando um evento DONKI arquivado da NASA sem fingir que os dados estão
ao vivo.

**Teste independente**: Executar uma missão controlada dos ciclos dois, três ou quatro pelas fases
de aviso, atividade e término e verificar resultados de abrigo, trabalhos pausados, seleção
determinística e atribuição ao DONKI.

**Cenários de aceite**:

1. **Dado** uma missão do ciclo dois, três ou quatro na primavera, verão ou outono, **quando** o
   horário do evento de radiação com seed for alcançado, **então** uma fase de aviso de dez
   segundos começará e identificará o evento DONKI arquivado usado como modelo.
2. **Dado** a fase de aviso da radiação, **quando** o jogador abrigar todos os astronautas ou os
   enviar para habitats com abrigos de radiação, **então** os trabalhos pausarão e os astronautas
   estarão protegidos quando a tempestade atingir a base.
3. **Dado** uma tempestade de radiação ativa, **quando** um astronauta estiver fora ou em um
   habitat sem abrigo de radiação, **então** esse astronauta morrerá conforme as regras da missão.
4. **Dado** que a tempestade de radiação está ativa durante sua duração configurada, **quando** a
   duração terminar, **então** a tempestade acabará, os trabalhos pausados poderão voltar e a
   próxima estação não herdará a tempestade ativa.
5. **Dado** um snapshot DONKI com detalhes válidos, **quando** o jogo apresentar a fonte da
   radiação, **então** mostrará o nome ou a data do evento e um link da fonte, identificando os
   dados como arquivados em vez de atuais.
6. **Dado** um snapshot DONKI malformado ou indisponível, **quando** a camada de dados tentar
   selecionar um evento, **então** informará explicitamente o problema em vez de fabricar uma
   fonte ou apresentar silenciosamente um evento não verificado.
7. **Dado** um snapshot DONKI com eventos suficientes e uma missão que sofre uma tempestade de
   radiação em cada ciclo de 2 a 4, **quando** as tempestades da mesma partida citarem seu evento
   DONKI, **então** cada tempestade citará um evento diferente das outras, e a mesma seed citará
   os mesmos eventos em toda partida.

---

### User Story 4 - Entender a missão no debrief e nas fontes (Prioridade: P2)

Como jogador, quero que o debrief da missão explique as perdas com palavras simples e mostre as
fontes científicas, para que eu aprenda por que a base teve sucesso ou falhou.

**Por que esta prioridade**: O debrief transforma falhas em aprendizado e garante que o jogo
apresente referências da NASA e da ciência com honestidade para seu público de 7 a 12 anos.

**Teste independente**: Fornecer um log de missão com várias causas e resultados de eventos,
gerar o conteúdo do debrief e das fontes e verificar se cada perda relevante é explicada e cada
fonte é identificada.

**Cenários de aceite**:

1. **Dado** um log de missão com danos, perdas e impactos em recursos causados por eventos,
   **quando** a missão terminar, **então** o debrief agrupará os resultados por ciclo ou evento e
   explicará cada causa em inglês simples.
2. **Dado** um log de missão sem perdas, **quando** a missão terminar, **então** o debrief ainda
   explicará os eventos ambientais encontrados e por que a base sobreviveu.
3. **Dado** um fato científico ou uma simplificação do jogo usada por um evento, **quando** a
   tela de fontes for exibida, **então** ela identificará a base real, terá um link para a fonte e
   marcará regras simplificadas ou exclusivas do jogo como simplificações.
4. **Dado** o evento de radiação DONKI arquivado, **quando** a tela de fontes for exibida,
   **então** ela nomeará o evento e fornecerá seu link da NASA sem afirmar que os dados são atuais
   ou ao vivo. O nome é o rótulo "NASA DONKI solar event (archived)" mais o id tirado do fim do
   link; a data do evento não aparece na tela, porque só `src/data/` a conhece e um componente não
   importa essa camada. Sem partida em andamento, a tela mostra só a fonte genérica do DONKI,
   marcada como "archived snapshot".
5. **Dado** um texto de evento ou debrief voltado ao jogador, **quando** for exibido, **então**
   haverá versão em inglês e as palavras serão simples o suficiente para idades de 7 a 12 anos.

## Casos extremos

- O intervalo com seed pode ser menor que o tempo restante na estação; nenhum evento pode ser
  agendado fora da estação atual.
- Uma estação pode terminar enquanto uma tempestade temporária está ativa; efeitos temporários
  devem ser limpos no limite, enquanto status persistentes das estruturas permanecem.
- Um evento de poeira pode listar um tipo de estrutura que não existe ou não tem estrutura
  elegível; aquele alvo se perde sem erro, e os outros tipos da mesma ocorrência continuam valendo.
- Uma mina ou refinaria entupida pode entrar em curto (o curto é mais grave); uma estrutura em
  curto nunca volta a entupida por um evento. Quando o curto é reparado, a estrutura volta a
  `active`, sem o entupimento anterior (regra do engine).
- Um tick grande (velocidade 4× ou atraso do navegador) pode cobrir mais de uma ocorrência; elas
  são aplicadas em ordem cronológica, para a mesma seed dar o mesmo resultado qualquer que seja o
  tamanho do tick.
- Na virada de estação, o tempo que sobra do tick anterior não pode contar curtos-circuitos da
  estação passada.
- Um evento de estação inteira (frio, escuridão, tempestade global) é criado uma única vez por
  estação, mesmo que a atualização rode muitas vezes.
- Um aviso de radiação pode começar enquanto astronautas estão fora ou trabalhos estão na fila;
  os trabalhos devem pausar durante a sequência da tempestade e voltar somente quando permitido.
- A missão pode terminar durante um evento; o debrief deve preservar as causas de eventos e perdas
  já registradas no log.
- Um snapshot DONKI pode não conter evento elegível; a camada de dados deve informar a ausência
  explicitamente e não inventar uma citação da NASA.
- Um snapshot DONKI com menos eventos do que tempestades na partida: a tempestade cujo grupo ficar
  vazio sorteia na lista inteira e pode repetir um evento já citado. É uma exceção aceita, só para
  essa tempestade; com a lista vazia, a citação é nula.

## Requisitos *(obrigatório)*

### Requisitos funcionais

- **FR-001**: O sistema de eventos DEVE agendar eventos a partir das regras configuradas de ciclo
  e estação usando a seed da missão e o gerador aleatório com seed do estado.
- **FR-002**: O sistema DEVE produzir agendamentos e seleções de alvos idênticos para seeds,
  estados iniciais, configurações e atualizações de tempo idênticos.
- **FR-003**: O sistema DEVE terminar eventos sazonais ativos no limite da estação e IMPEDIR que
  seus efeitos vazem para outra estação.
- **FR-004**: O sistema DEVE implementar os efeitos configurados de redemoinhos, tempestades
  locais, tempestades densas e globais, frio, escuridão total, entupimentos e curtos nos ciclos
  um a quatro, com os alvos e limites dos cenários 1 a 6 da US2.
- **FR-004a**: Cada estrutura DEVE ter um único status, e um evento NÃO DEVE substituir um status
  mais grave por um mais leve (curto-circuito > danificado > entupido).
- **FR-004b**: Eventos de estação inteira (frio, escuridão, tempestade global) DEVEM estar ativos
  desde o primeiro tick da estação; tempestades com duração DEVEM expirar em início + duração.
- **FR-004c**: Todo dano, entupimento e curto-circuito causado por um evento DEVE gerar uma entrada
  no log da missão, com a estrutura em `ref` e o id da regra em `cause`.
- **FR-004d**: O sistema de eventos NÃO DEVE fixar números de balanceamento no código: fatores
  solares, chances, quantidades e períodos vêm de `src/config/*.json`.
- **FR-005**: O sistema DEVE preservar status persistentes das estruturas até que a ação
  correspondente de reparo ou limpeza os remova, removendo efeitos temporários ao fim dos eventos.
- **FR-006**: O sistema DEVE aplicar os intervalos de escala máxima do ciclo quatro (só em regras
  com `intervalSeconds`, hoje só os redemoinhos) e os efeitos de tempestade global definidos pelo
  cânone do jogo. O período de curto-circuito da tempestade global não é escalado.
- **FR-007**: O sistema DEVE agendar no máximo uma tempestade de radiação por ciclo na primavera,
  verão ou outono dos ciclos dois a quatro, usando horário com seed.
- **FR-008**: A tempestade de radiação DEVE oferecer uma fase de aviso de dez segundos, uma duração
  ativa configurada e um estado final distinto.
- **FR-009**: Durante uma tempestade de radiação, astronautas fora ou em habitats sem abrigo DEVEM
  receber o resultado letal configurado, enquanto astronautas abrigados permanecem seguros.
- **FR-010**: Avisos de radiação DEVEM pausar trabalhos afetados e permitir que voltem somente
  quando a sequência da tempestade permitir.
- **FR-011**: A camada de dados DEVE analisar snapshots arquivados do NASA DONKI e fornecer um
  evento real selecionado com seus detalhes identificadores e link da fonte.
- **FR-012**: A camada de dados DEVE expor seleção determinística de eventos para um gerador com
  seed fornecido e informar explicitamente dados inválidos ou ausentes do snapshot. As
  tempestades de uma mesma partida DEVEM citar eventos diferentes sempre que o snapshot tiver
  eventos suficientes, sem guardar estado novo no jogo.
- **FR-013**: Todo evento e regra científica apresentada ao jogador DEVE ter uma explicação e uma
  fonte ou um rótulo claro de simplificação de gameplay.
- **FR-014**: O debrief DEVE derivar suas causas de eventos e perdas de recursos ou tripulação do
  log da missão, sem inventar resultados.
- **FR-015**: O debrief DEVE explicar toda perda registrada em inglês simples e identificar a
  explicação científica real ou a simplificação do jogo relacionada.
- **FR-016**: A tela de fontes DEVE distinguir dados arquivados de dados atuais e exibir a citação
  DONKI real da tempestade de radiação.
- **FR-017**: A implementação DEVE manter o I/O da NASA na camada de dados; o engine de eventos
  DEVE permanecer puro e não realizar rede ou leitura de arquivos, usar timers ou aleatoriedade
  sem seed.
- **FR-018**: A feature DEVE permanecer nos caminhos de ownership do DEV A e solicitar alteração
  de contrato compartilhado quando um campo necessário de `GameState` não estiver disponível.

### Entidades principais

- **Regra de evento sazonal**: tipo de evento, ciclo e estação, intervalo, duração, efeito,
  explicação e fonte científica configurados, usados para agendar um evento.
- **Evento ativo**: ocorrência que está afetando a base agora: regra de origem, tipo, horário de fim
  (ou a estação inteira), fator solar e bloqueio de trabalhos externos. Os alvos de estrutura não
  ficam no evento ativo: viram status das estruturas e entradas do log.
- **Status da estrutura**: condição persistente de uma estrutura da base: danificada, entupida ou
  em curto, com prioridade curto > danificado > entupido.
- **Tempestade de radiação**: fases de aviso, ativa e encerrada de um evento de partículas solares,
  incluindo horários, requisitos de abrigo e citação DONKI.
- **Snapshot DONKI**: registro arquivado de evento da NASA com identificação, data, link da fonte
  e dados necessários para modelar uma tempestade de radiação offline.
- **Entrada do log da missão**: evento, efeito, perda ou recuperação registrada e usada para
  explicar a missão no debrief.
- **Fonte científica**: referência nomeada para um fato real de Marte ou do clima espacial, com
  link e indicação de regra real, escalada, simplificada ou exclusiva do jogo.

## Critérios de sucesso *(obrigatório)*

### Resultados mensuráveis

- **SC-001**: 100% das regras de eventos configuradas para ciclo e estação produzem somente
  agendamentos e seleções de alvos determinísticos em execuções repetidas com a mesma seed.
- **SC-002**: 100% dos efeitos temporários são removidos ao fim do evento ou da estação, enquanto
  todo dano, entupimento ou curto persistente permanece registrado até sua correção definida.
- **SC-003**: Todo cenário de aceite de poeira, frio, escuridão, tempestades globais e radiação
  passa em testes automatizados focados antes da abertura da PR da story correspondente.
- **SC-004**: Toda tempestade de radiação exibida identifica um evento DONKI arquivado com link da
  fonte; nenhuma tempestade é apresentada como dado atual.
- **SC-005**: Um debrief gerado a partir de um log completo contabiliza 100% das mortes registradas
  da tripulação, perdas de estruturas e perdas de recursos com uma causa em linguagem simples.
- **SC-006**: Um revisor consegue rastrear cada regra de evento e simplificação científica até
  uma fonte nomeada ou um rótulo explícito de gameplay na tela de fontes.
- **SC-007**: A verificação completa do projeto passa com a feature integrada, incluindo validação
  de ownership e a suíte de testes existente do repositório.

## Premissas

- O `GameState`, schema de configuração, store, helpers aleatórios com seed, loop de tick e ações
  de reparo ou limpeza existentes fornecem o contrato necessário; campos ausentes exigem uma
  solicitação de alteração em `shared/`, não uma edição do DEV A.
- Os POs fornecem configurações válidas de `events.json` e `mission.json`, incluindo regras da
  tempestade de radiação, explicações em inglês e metadados das fontes.
- Os dados DONKI da NASA são um snapshot offline versionado e não são buscados em runtime.
- O engine existente é responsável pelo avanço do tempo, produção, energia, mortes da tripulação
  e resultado de vitória ou derrota; esta feature fornece atualizações de eventos e registra os
  efeitos no contrato existente.
- A interface existente do DEV B apresenta alertas e alarmes de radiação; esta feature fornece os
  dados de estado e fontes necessários para essa interface.
- A cena existente do DEV C apresenta consequências visuais; esta feature fornece os status e o
  estado de eventos ativos necessários para a cena.
- Valores de balanceamento dos eventos permanecem em `src/config/*.json` e podem ser alterados
  pelos POs sem mudar os requisitos comportamentais desta especificação.
- A primeira versão exige textos voltados ao jogador em inglês; português é opcional.
- As regras de eventos seguem as respostas do PO de 2026-11-14 (R1–R6, T1–T7, E1–E4, F1–F4,
  C1–C4). O que depende de outras áreas está em [change-requests.md](./change-requests.md).
- O sorteio de entupimento considera só estruturas em bom estado, como o sorteio de painéis (R2).
  **Pendente de confirmação do PO**; se o PO decidir incluir estruturas já entupidas ou em curto, o
  sorteio pode cair numa estrutura já pior e não ter efeito (R5).
- Para que o `solarFactor` da escuridão (0) venha da configuração, `c2_dark_winter` e
  `c3_dark_winter` precisam ganhar `"solarFactor": 0` em `effects` (pedido aos POs). Até lá, os
  testes usam uma regra montada no próprio teste. Regras sem `solarFactor` valem 1, um valor
  neutro e não de balanceamento.

### Fora do escopo da US2 (engine, Breno)

A US2 só grava `activeEvents`, status das estruturas e log. O engine lê esses dados e é dono de:

- bloquear a limpeza enquanto houver tempestade de poeira ativa, sem bloquear construir, melhorar
  ou reparar;
- bloquear todos os trabalhos externos quando um evento ativo tiver `blocksExternalJobs`: o
  trabalho em andamento pausa, o astronauta volta e o trabalho espera na fila até a primavera;
- multiplicar a produção solar pelo `solarFactor` dos eventos ativos;
- levar a estrutura a `active` quando um curto-circuito for reparado;
- matar, no primeiro instante do inverno dos ciclos 3 e 4, os astronautas em habitat sem
  isolamento térmico, sem carência.
