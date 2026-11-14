# Especificação da feature: Eventos e dados da NASA

**Branch da feature**: `data/002-events-data`

**Criado em**: 2026-11-14

**Status**: Rascunho

**Entrada**: User description: "Read specs/002-events-data/brief.md and Part II of the constitution, then specify the Events and NASA data feature."

## Cenários do usuário e testes *(obrigatório)*

### User Story 1 - Vivenciar eventos sazonais determinísticos (Prioridade: P1)

Como jogador, quero que cada estação marciana produza seus eventos ambientais esperados em
horários repetíveis, para que a mesma seed de missão gere o mesmo desafio todas as vezes.

**Por que esta prioridade**: Os eventos sazonais são a base de todos os efeitos de eventos e
ensinam o jogador a se preparar para o clima. O agendamento determinístico também é necessário
para um jogo justo e testes reproduzíveis.

**Teste independente**: Iniciar duas missões com a mesma seed, avançá-las pelas mesmas estações e
comparar tipos, alvos, horários e limpeza de eventos. As duas execuções devem coincidir e nenhum
evento da estação anterior pode continuar ativo.

**Cenários de aceitação**:

1. **Dado** uma missão com seed conhecida e configuração de eventos da estação, **Quando** a
   estação avança, **Então** os horários dos eventos são selecionados deterministicamente dentro
   do intervalo configurado para a estação.
2. **Dado** duas missões com a mesma seed e estado inicial, **Quando** elas recebem as mesmas
   atualizações de tempo, **Então** agendam os mesmos tipos, horários e alvos de eventos.
3. **Dado** um evento ativo no fim de uma estação, **Quando** a estação muda, **Então** o evento
   termina e a nova estação começa apenas com seu próprio agendamento.
4. **Dado** uma estação do ciclo quatro, **Quando** um evento é agendado, **Então** seu intervalo
   e efeito usam as regras de escala máxima definidas para o ciclo quatro.

---

### User Story 2 - Sobreviver a poeira, frio, escuridão e danos de tempestades (Prioridade: P1)

Como jogador, quero que eventos de poeira e frio afetem minha base de forma visível e mecânica,
para que minhas escolhas sobre reparos, limpeza, energia e proteção importem.

**Por que esta prioridade**: Esses eventos são os principais perigos ambientais da missão em Marte
e conectam o sistema de eventos à produção, aos status das estruturas, à energia e à preparação
da tripulação.

**Teste independente**: Fornecer um estado e uma configuração de eventos controlados à lógica de
atualização de eventos, avançar por cada perigo de poeira e de estação e verificar os status das
estruturas, efeitos de produção e energia e restrições de trabalhos.

**Cenários de aceitação**:

1. **Dado** um redemoinho de poeira e painéis solares disponíveis, **Quando** ele ocorre, **Então**
   o número configurado de painéis fica danificado e o efeito de dano é aplicado.
2. **Dado** uma tempestade de poeira local ou densa, **Quando** ela está ativa, **Então** a
   produção solar é reduzida pelo valor configurado durante sua duração.
3. **Dado** uma tempestade densa no ciclo dois ou redemoinhos grandes no ciclo três ou quatro,
   **Quando** o evento aplica seu efeito de entupimento, **Então** filtros, minas e refinarias
   afetados ficam entupidos conforme as regras da estação.
4. **Dado** uma tempestade global de poeira no ciclo três ou quatro, **Quando** ocorre uma
   verificação de curto-circuito, **Então** uma mina ou refinaria de ferro elegível fica em
   curto-circuito e não produz até ser reparada.
5. **Dado** um inverno com escuridão total, **Quando** o evento está ativo, **Então** os painéis
   solares não produzem energia e os trabalhos externos ficam bloqueados durante o inverno.
6. **Dado** que um evento terminou, **Quando** a próxima atualização ocorre, **Então** os efeitos
   temporários da tempestade são removidos, enquanto danos, entupimentos e curtos-circuitos
   persistentes permanecem até o reparo definido.

---

### User Story 3 - Responder a uma tempestade real de radiação (Prioridade: P1)

Como jogador, quero um aviso honesto antes de uma tempestade de radiação e uma ligação clara com
um evento solar real da NASA, para que eu possa abrigar a tripulação e entender a ciência por
trás do perigo.

**Por que esta prioridade**: A radiação é um perigo letal da missão e a feature precisa cumprir o
requisito de ciência real usando um evento NASA DONKI arquivado, sem apresentá-lo como dado ao vivo.

**Teste independente**: Executar uma missão controlada dos ciclos dois, três ou quatro pelas fases
de aviso, atividade e término, verificando resultados de abrigo, trabalhos pausados, seleção
determinística e atribuição DONKI.

**Cenários de aceitação**:

1. **Dado** uma missão do ciclo dois, três ou quatro na primavera, verão ou outono, **Quando** o
   horário seedado do evento de radiação é alcançado, **Então** começa uma fase de aviso de dez
   segundos e identifica o evento DONKI arquivado usado como modelo.
2. **Dado** a fase de aviso da radiação, **Quando** o jogador abriga todos os astronautas ou os
   envia para habitats com abrigo contra radiação, **Então** os trabalhos pausam e os astronautas
   ficam protegidos quando a tempestade atinge a base.
3. **Dado** que a tempestade de radiação está ativa, **Quando** um astronauta está fora ou em um
   habitat sem abrigo contra radiação, **Então** esse astronauta morre conforme as regras da missão.
4. **Dado** que uma tempestade de radiação está ativa pelo tempo configurado, **Quando** a duração
   termina, **Então** a tempestade termina, os trabalhos pausados podem continuar e a próxima
   estação não herda a tempestade ativa.
5. **Dado** um snapshot DONKI com detalhes válidos, **Quando** o jogo apresenta a fonte da
   radiação, **Então** mostra o nome ou a data do evento e um link, classificando os dados como
   arquivados em vez de ao vivo.
6. **Dado** dados de snapshot DONKI inválidos ou indisponíveis, **Quando** a camada de dados tenta
   selecionar um evento, **Então** informa o problema explicitamente em vez de fabricar uma fonte
   ou apresentar silenciosamente um evento não verificado.

---

### User Story 4 - Entender a missão no debrief e nas fontes (Prioridade: P2)

Como jogador, quero que o debrief do fim da missão explique as perdas em linguagem simples e
mostre as fontes científicas, para que eu aprenda por que a base teve sucesso ou falhou.

**Por que esta prioridade**: O debrief transforma falhas em aprendizado e garante que o jogo
apresente referências da NASA e de outras fontes científicas de forma honesta para o público de
7 a 12 anos.

**Teste independente**: Fornecer um log de missão com várias causas e resultados de eventos,
gerar o debrief e as fontes e verificar se cada perda relevante é explicada e cada fonte é
identificada.

**Cenários de aceitação**:

1. **Dado** um log com danos causados por eventos, perdas e impactos em recursos, **Quando** a
   missão termina, **Então** o debrief agrupa os resultados por ciclo ou evento e explica cada
   causa em inglês simples.
2. **Dado** um log de missão sem perdas, **Quando** a missão termina, **Então** o debrief ainda
   explica os eventos ambientais encontrados e por que a base sobreviveu.
3. **Dado** um fato científico ou uma simplificação de gameplay usada por um evento, **Quando** a
   tela de fontes é mostrada, **Então** identifica a base real, fornece o link e marca regras
   simplificadas ou exclusivas do gameplay como simplificações.
4. **Dado** o evento DONKI arquivado da radiação, **Quando** a tela de fontes é mostrada, **Então**
   nomeia o evento e fornece o link da NASA sem alegar que os dados são atuais ou ao vivo.
5. **Dado** um texto de evento ou debrief voltado ao jogador, **Quando** é exibido, **Então** há
   inglês disponível e a redação usa palavras simples adequadas para idades de 7 a 12 anos.

## Casos extremos

- O intervalo seedado pode ser menor que o tempo restante da estação; nenhum evento pode ser
  agendado fora da estação atual.
- Uma estação pode terminar enquanto uma tempestade temporária está ativa; efeitos temporários
  devem ser limpos na mudança, enquanto os status persistentes das estruturas permanecem.
- Um evento de poeira pode selecionar um tipo de estrutura que não existe na base atual; o evento
  não deve criar um alvo inválido nem falhar silenciosamente.
- Uma estrutura pode já estar danificada, entupida ou em curto-circuito quando outro evento a
  seleciona; o status resultante deve seguir as regras configuradas e continuar válido.
- Um aviso de radiação pode começar enquanto astronautas estão fora ou trabalhos estão na fila;
  os trabalhos devem pausar durante a sequência da tempestade e continuar somente quando permitido.
- A missão pode terminar durante um evento; o debrief deve preservar as causas de eventos e
  perdas já registradas no log.
- Um snapshot DONKI pode não conter evento elegível; a camada de dados deve informar a ausência
  explicitamente e não inventar uma citação da NASA.

## Requisitos *(obrigatório)*

### Requisitos funcionais

- **FR-001**: O sistema de eventos DEVE agendar eventos a partir das regras configuradas de ciclo
  e estação, usando a seed da missão e o gerador aleatório seedado do estado.
- **FR-002**: O sistema DEVE produzir agendamentos e seleções de alvos idênticos para seeds,
  estados iniciais, configurações e atualizações de tempo idênticos.
- **FR-003**: O sistema DEVE terminar eventos sazonais ativos na mudança de estação e DEVE impedir
  que efeitos de eventos vazem para outra estação.
- **FR-004**: O sistema DEVE implementar os efeitos configurados de redemoinhos, tempestades de
  poeira locais, densas e globais, frio, escuridão total, entupimento e curto-circuito nos ciclos
  um a quatro.
- **FR-005**: O sistema DEVE preservar status persistentes de estruturas até que a ação de reparo
  ou limpeza correspondente os remova, removendo efeitos temporários ao fim dos eventos.
- **FR-006**: O sistema DEVE aplicar os intervalos e efeitos de escala máxima do ciclo quatro
  definidos pelo cânone de design do jogo.
- **FR-007**: O sistema DEVE agendar no máximo uma tempestade de radiação por ciclo na primavera,
  no verão ou no outono dos ciclos dois a quatro, usando timing seedado.
- **FR-008**: A tempestade de radiação DEVE oferecer uma fase de aviso de dez segundos, uma duração
  ativa configurada e um estado final distinto.
- **FR-009**: Durante uma tempestade de radiação, astronautas fora ou em habitats sem abrigo
  contra radiação DEVEM receber o resultado letal configurado, enquanto astronautas abrigados
  permanecem seguros.
- **FR-010**: Avisos de radiação DEVEM pausar os trabalhos afetados e permitir que continuem
  somente quando a sequência da tempestade permitir.
- **FR-011**: A camada de dados DEVE analisar snapshots NASA DONKI arquivados e fornecer um evento
  real selecionado com seus detalhes identificadores e link da fonte.
- **FR-012**: A camada de dados DEVE oferecer seleção determinística de eventos para um gerador
  seedado fornecido e DEVE informar explicitamente dados de snapshot inválidos ou ausentes.
- **FR-013**: Todo evento e regra científica apresentados ao jogador DEVEM ter uma explicação e
  uma fonte, ou um rótulo claro de simplificação de gameplay.
- **FR-014**: O debrief DEVE derivar causas de eventos e perdas de recursos ou tripulação do log
  da missão, sem inventar resultados.
- **FR-015**: O debrief DEVE explicar toda perda registrada em inglês simples e identificar a
  explicação científica real ou a simplificação de gameplay relacionada.
- **FR-016**: A tela de fontes DEVE distinguir dados arquivados de dados ao vivo e DEVE mostrar a
  citação DONKI real da tempestade de radiação.
- **FR-017**: A implementação DEVE manter a I/O da NASA na camada de dados; o motor de eventos
  DEVE permanecer puro e não pode fazer I/O de rede ou arquivo, usar timers ou aleatoriedade não
  seedada.
- **FR-018**: A feature DEVE permanecer nos caminhos de ownership do DEV A e DEVE solicitar uma
  mudança de contrato compartilhado quando um campo necessário de `GameState` não estiver
  disponível.

### Entidades principais

- **Regra de evento sazonal**: tipo, ciclo e estação, intervalo, duração, efeito, explicação e
  fonte científica configurados para agendar um evento.
- **Evento ativo**: evento agendado com horário de início e fim, fase atual, estado do efeito e
  eventual alvo de estrutura selecionado.
- **Status de estrutura**: condição persistente ou temporária de uma estrutura da base, incluindo
  danificada, entupida ou em curto-circuito.
- **Tempestade de radiação**: fases de aviso, atividade e término de um evento de partículas
  solares, incluindo timing, requisitos de abrigo e citação DONKI.
- **Snapshot DONKI**: registro arquivado de evento da NASA com identificação, data, link e dados
  necessários para modelar uma tempestade de radiação offline.
- **Entrada do log da missão**: evento, efeito, perda ou recuperação registrado para explicar a
  missão no debrief.
- **Fonte científica**: referência nomeada para um fato real de Marte ou do clima espacial, com
  link e indicação de regra real, escalada, simplificada ou exclusiva do jogo.

## Critérios de sucesso *(obrigatório)*

### Resultados mensuráveis

- **SC-001**: 100% das regras de eventos configuradas para ciclo e estação produzem agendamentos e
  seleções de alvos determinísticos em execuções repetidas com a mesma seed.
- **SC-002**: 100% dos efeitos temporários de eventos são removidos no fim do evento ou da estação,
  enquanto cada dano, entupimento ou curto-circuito persistente permanece registrado até sua correção.
- **SC-003**: Todo cenário de aceitação de poeira, frio, escuridão, tempestades globais e radiação
  passa em testes automatizados focados antes da abertura da PR correspondente.
- **SC-004**: Toda tempestade de radiação exibida identifica um evento NASA DONKI arquivado com
  link; nenhuma tempestade é apresentada como dado ao vivo.
- **SC-005**: Um debrief gerado de um log completo contabiliza 100% das mortes da tripulação, perdas
  de estruturas e perdas de recursos registradas com uma causa em linguagem simples.
- **SC-006**: Um revisor consegue rastrear cada regra de evento e simplificação científica até
  uma fonte nomeada ou um rótulo explícito de gameplay na tela de fontes.
- **SC-007**: A verificação completa do projeto passa com a feature integrada, incluindo a
  validação de ownership e a suíte de testes existente.

## Suposições

- O `GameState`, o schema de configuração, a store, os helpers aleatórios seedados, o loop
  `tick` e as ações de reparo ou limpeza existentes fornecem o contrato necessário; campos
  ausentes exigem uma solicitação de alteração de contrato compartilhado, não uma edição do DEV A.
- Os POs fornecem configuração válida em `events.json` e `mission.json`, incluindo regras da
  tempestade de radiação, explicações em inglês e metadados das fontes.
- Os dados NASA DONKI são versionados como snapshot offline e não são buscados em runtime.
- O motor existente controla avanço do tempo, produção, energia, mortes da tripulação e resolução
  de vitória ou derrota; esta feature fornece atualizações de eventos e registra efeitos pelo
  contrato existente.
- A UI do DEV B apresenta alertas e alarmes de radiação; esta feature fornece o estado e os dados
  de fonte necessários para essa UI.
- A cena do DEV C apresenta consequências visuais; esta feature fornece os status e o estado de
  eventos ativos necessários para a cena.
- Os valores de balanceamento dos eventos permanecem em `src/config/*.json` e podem ser alterados
  pelos POs sem mudar os requisitos comportamentais desta especificação.
- A primeira versão exige texto voltado ao jogador em inglês; português é opcional.
