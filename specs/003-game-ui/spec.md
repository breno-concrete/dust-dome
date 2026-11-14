# Especificação de Funcionalidade: UI 2D do Jogo e Kit de UI

**Branch da Funcionalidade**: `ui/003-game-ui`

**Criado em**: 2026-11-14

**Status**: Rascunho (Draft)

**Entrada**: Descrição do usuário: "SPECIFY_FEATURE_DIRECTORY=specs/003-game-ui Read specs/003-game-ui/brief.md and the constitution, and specify it."

## Cenários de Usuário e Testes *(obrigatório)*

### História de Usuário 1 - HUD de Status da Missão e Sinais Vitais (Prioridade: P1)

Como um jogador (astronauta júnior de 7 a 12 anos), preciso monitorar as reservas vitais de suporte à vida (Oxigênio, Água, Alimento), o balanço de energia (produção e demanda), os materiais de construção na carteira, a saúde e exposição à radiação da tripulação, além de controlar a velocidade da missão a qualquer momento através de uma tela principal (HUD) clara e intuitiva.

**Por que esta prioridade**: O monitoramento das reservas vitais e do fornecimento de energia compõe o ciclo central de sobrevivência em Mars Outpost. Sem um HUD visível e compreensível exibindo os níveis atuais em relação às metas de vitória, o jogador não consegue avaliar riscos imediatos nem tomar decisões de sobrevivência.

**Teste Independente**: Pode ser totalmente testado fornecendo estados de jogo simulados com diferentes níveis de estoque, balanços de energia e índices de exposição dos astronautas. Entrega um painel de status funcional onde as barras vitais mostram metas e piscam alertas, o medidor de energia reflete superávit/déficit, os materiais são contabilizados, a exposição da tripulação é exibida e os botões de velocidade ajustam o ritmo da missão.

**Cenários de Aceitação**:

1. **Dado** uma missão em andamento, **Quando** o jogador observa o HUD superior, **Então** os medidores de reserva de Oxigênio, Água e Alimento exibem os estoques atuais acompanhados de suas metas de vitória da colônia (16 U de Oxigênio, 32 U de Água, 16 U de Alimento).
2. **Dado** que qualquer reserva vital caia abaixo da necessidade de uma estação para a tripulação (4 U de Oxigênio, 8 U de Água ou 4 U de Alimento para 4 astronautas), **Quando** o HUD atualizar, **Então** a barra da respectiva reserva pisca e exibe um ícone de alerta de alta visibilidade associado a texto.
3. **Dado** que a produção de energia seja inferior à demanda da base, **Quando** o medidor de energia exibir o balanço, **Então** o déficit é indicado com sinal negativo, símbolo de alerta explícito e estilo visual de aviso.
4. **Dado** materiais de construção armazenados no inventário, **Quando** o jogador visualiza a carteira de recursos, **Então** as quantidades de Hematita, Regolito, Ferro, Aço e Peças de Reparo são exibidas com ícones gráficos nítidos e rótulos de texto legíveis.
5. **Dado** um astronauta executando tarefas na superfície marciana, **Quando** sua exposição individual à radiação atingir ou ultrapassar 75%, **Então** o indicador do astronauta pisca e um alerta orienta o jogador a recolhê-lo para o módulo habitacional.
6. **Dado** a missão em velocidade padrão (1×), **Quando** o jogador aciona 2×, 4× ou Pausa, **Então** o ritmo da missão se ajusta imediatamente e o botão de velocidade selecionado fica destacado visualmente como ativo.

---

### História de Usuário 2 - Interface de Construção da Base e Melhorias (Prioridade: P2)

Como jogador, preciso navegar pelas estruturas marcianas disponíveis, consultar seus custos de recursos e contexto científico educativo, iniciar a colocação no grid da colônia e instalar melhorias nas estruturas existentes.

**Por que esta prioridade**: A sobrevivência e expansão da base exigem a construção de geradores de suporte de vida, minas, usinas de energia e proteções contra intempéries. O jogador precisa compreender os custos e os conceitos científicos reais antes de gastar recursos.

**Teste Independente**: Pode ser testado apresentando o catálogo de construções e melhorias com diferentes saldos na carteira. Entrega cartões interativos agrupados por nível tecnológico, fichas informativas com fatos da ciência de Marte, feedback automático de recursos insuficientes, ativação de modo de posicionamento e menus de melhorias específicos para a estrutura selecionada.

**Cenários de Aceitação**:

1. **Dado** o menu de construção aberto, **Quando** o jogador navega pelas estruturas, **Então** as construções são agrupadas claramente por nível tecnológico: Nível 1 (recursos brutos: Hematita/Regolito), Nível 2 (metais processados: Ferro) e Nível 3 (ligas avançadas e reator nuclear: Aço).
2. **Dado** que o jogador não possui materiais suficientes para uma estrutura, **Quando** visualiza o cartão da estrutura, **Então** a opção de construir permanece desabilitada e informa explicitamente a quantidade faltante de cada recurso (ex.: "Faltam 5 Hematita").
3. **Dado** que o jogador inspeciona ou seleciona qualquer cartão de estrutura ou melhoria, **Quando** lê a ficha informativa, **Então** uma descrição educativa em linguagem simples explica como ela opera e sua base na ciência real de exploração espacial (ex.: MOXIE para oxigênio, extração de gelo subterrâneo em Hellas Planitia).
4. **Dado** que o jogador clica em uma estrutura disponível para compra, **Quando** o processo de construção se inicia, **Então** o modo de posicionamento é ativado e um botão visível de "Cancelar" permite sair sem gastar materiais.
5. **Dado** que o jogador seleciona uma estrutura já construída na colônia, **Quando** o painel de melhorias se abre, **Então** apenas as melhorias compatíveis com aquele tipo de estrutura são listadas (ex.: Isolamento Térmico e Abrigo de Radiação para Habitats; Filtros de Poeira para usinas industriais), exibindo seus custos e efeitos.

---

### História de Usuário 3 - Gestão da Rede Elétrica, Briefings da Comandante e Alarmes de Radiação (Prioridade: P3)

Como jogador, preciso ajustar os modos de operação elétrica das estruturas durante períodos de escassez energética, receber orientações estratégicas sazonais da Comandante Vega e executar procedimentos de abrigo imediato diante de tempestades solares letais.

**Por que esta prioridade**: Marte apresenta grandes variações sazonais de luz solar e eventos súbitos de clima espacial. O jogador precisa balancear energia para evitar apagões, aprender sobre os ciclos marcianos e proteger a tripulação de fatalidades imediatas.

**Teste Independente**: Pode ser testado simulando chaves de energia, transições de estação e eventos solares. Entrega chaves de operação funcionais por tipo de instalação, caixas de diálogo narrativas pausadas com conteúdo educativo sazonal e um alerta com contagem regressiva de 10 segundos acionando o abrigo da tripulação em um clique.

**Cenários de Aceitação**:

1. **Dado** o painel de gestão de energia, **Quando** o jogador acessa os tipos de estruturas operáveis (Mina, Gerador de Oxigênio, Derretedor de Gelo, Refinaria de Ferro, Estufa, Oficina de Reparos, Fábrica de Aço), **Então** cada tipo oferece chaves mutuamente exclusivas de Desligado (Off), Mínimo (Min) e Máximo (Max), atualizando a demanda de energia da base.
2. **Dado** o início de uma nova estação marciana, **Quando** ocorre a transição de estação, **Então** a passagem do tempo é pausada automaticamente e a caixa de diálogo da Comandante Vega se abre, explicando as condições climáticas daquela estação e oferecendo conselhos práticos.
3. **Dado** que a missão se aproxima da transição para o Ano 3 (Ciclo 3), **Quando** a Comandante Vega realiza o briefing, **Então** a mensagem traz um aviso explícito sobre o frio extremo que se aproxima no inverno e recomenda instalar isolamento térmico nos habitats.
4. **Dado** a ocorrência de uma tempestade de radiação (evento de partículas solares), **Quando** o alarme de 10 segundos dispara, **Então** surge uma notificação de emergência informando o evento real da NASA DONKI e um botão de ação rápida "Abrigar Tripulação" para direcionar todos os astronautas aos módulos protegidos.

---

### História de Usuário 4 - Tela Inicial, Suporte Bilíngue, Layout Responsivo e Acessibilidade (Prioridade: P4)

Como um estudante, educador ou jovem jogador, preciso iniciar missões a partir de uma tela inicial amigável, consultar as fontes científicas do projeto, alternar facilmente entre inglês e português, jogar em dispositivos móveis ou computadores escolares e interagir confortavelmente usando recursos de acessibilidade.

**Por que esta prioridade**: Atende aos requisitos do NASA Space Apps Challenge de acessibilidade, disponibilidade em múltiplos idiomas (inglês obrigatório e português como opção), navegação móvel e transparência no uso de dados científicos para escolas e famílias.

**Teste Independente**: Pode ser testado em diferentes larguras de tela (computador, tablet, celular) e nos dois idiomas. Entrega interface fluida com alvos de toque de no mínimo 44px, tradução imediata entre EN e PT em todos os componentes, foco de teclado visível e descrições acessíveis.

**Cenários de Aceitação**:

1. **Dado** o jogador na Tela Inicial, **Quando** seleciona "Começar missão", **Então** uma nova missão se inicia; **Quando** seleciona "De onde vem a ciência?", **Então** é direcionado para a tela de créditos e fontes científicas.
2. **Dado** o botão de idioma acionado em qualquer momento do jogo ou tela inicial, **Quando** a alternância entre Português e Inglês ocorre, **Então** todos os textos da interface, HUD, briefings, fichas educativas e botões são traduzidos instantaneamente sem recarregar a página e sem perder o progresso.
3. **Dado** o acesso por celular ou tela compacta, **Quando** o jogador interage com o HUD e menus, **Então** a interface se adapta responsivamente sem cortes horizontais, os textos permanecem legíveis e os botões mantêm o tamanho mínimo de toque de 44×44 pixels CSS.
4. **Dado** o uso de leitores de tela ou navegação por teclado, **Quando** o jogador percorre os controles e indicadores, **Então** todos os elementos interativos possuem nomes acessíveis, estados descritivos (ativo, selecionado, desabilitado), foco evidente e as informações nunca dependem exclusivamente de cor para serem compreendidas.

---

### Casos de Borda (Edge Cases)

- **Reserva Zerada**: Se uma reserva vital chegar a zero, o HUD exibe um alerta piscante com contagem regressiva indicando os 15 segundos de tolerância antes da perda do primeiro astronauta.
- **Alertas Múltiplos e Simultâneos**: Caso ocorram concomitantemente um alarme de radiação, reserva baixa e déficit energético, o sistema prioriza emergências com risco de morte imediata (como o alarme de radiação) no topo visual da interface.
- **Bloqueio de Saída Externa no Inverno**: Durante o inverno dos Ciclos 2 a 4, quando trabalhos externos ficam bloqueados pelo frio e escuridão, tentativas de construir ou melhorar estruturas informam com clareza que atividades externas estão suspensas no inverno marciano.
- **Execução Sem Gráficos 3D**: Se o navegador ou dispositivo escolar não puder renderizar a cena 3D, a interface 2D permite realizar todas as tarefas essenciais (construir na próxima vaga livre, ajustar energia, abrigar tripulação) garantindo uma experiência jogável de ponta a ponta.
- **Cliques Repetitivos Rápidos**: Ações consecutivas em botões de velocidade, chaves de energia ou compras tratam transições de estado de forma confiável, impedindo inconsistências visuais ou comandos duplicados.
- **Fim da Missão (Vitória / Derrota)**: Ao término do inverno do Ciclo 4 ou na morte de todos os 4 astronautas, os painéis de decisão encerram suas ações e exibem o resultado final sem bloquear as estatísticas da missão.

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **FR-001**: O HUD DEVE exibir em tempo real contadores e barras visuais para as três reservas vitais: Oxigênio, Água e Alimento.
- **FR-002**: Os medidores vitais do HUD DEVEM exibir marcas de alvo correspondentes aos requisitos de vitória para a chegada dos 16 colonos (16 U de Oxigênio, 32 U de Água, 16 U de Alimento).
- **FR-003**: Os medidores vitais do HUD DEVEM acionar animação de pulso/alerta sempre que o estoque cair abaixo do consumo de uma estação para a tripulação (4 U Oxigênio, 8 U Água, 4 U Alimento).
- **FR-004**: O HUD DEVE exibir o balanço líquido de energia em quilowatts (kW), mostrando sinal positivo para superávit e sinal negativo com estilo de alerta para déficits.
- **FR-005**: O HUD DEVE disponibilizar botões persistentes de controle de tempo: Pausa (0×), Normal (1×), Rápido (2×) e Muito Rápido (4×), indicando claramente o modo ativo.
- **FR-006**: O HUD DEVE apresentar o tempo da missão indicando o Ano marciano (Ciclos 1 a 4), a estação do ano (Primavera, Verão, Outono, Inverno) e o tempo restante da estação.
- **FR-007**: O HUD DEVE exibir a carteira de materiais com as quantidades exatas de Hematita, Regolito, Ferro, Aço e Peças de Reparo, associando cada recurso a um ícone e nome textual.
- **FR-008**: O HUD DEVE exibir a lista dos 4 membros da tripulação, informando se estão vivos, abrigados no habitat ou em trabalho externo na superfície.
- **FR-009**: O HUD DEVE apresentar o nível de exposição à radiação de cada astronauta (0% a 100%), disparando aviso visual e textual quando atingir 75% ou mais.
- **FR-010**: O menu de construção DEVE agrupar as estruturas em três níveis tecnológicos: Nível 1 (Recursos Brutos/Básicos), Nível 2 (Processamento/Indústria) e Nível 3 (Avançado/Energia Nuclear).
- **FR-011**: Os cartões do menu de construção DEVEM detalhar os custos em materiais, consumo ou geração de energia e a produção sazonal de cada estrutura.
- **FR-012**: O menu de construção DEVE desabilitar o botão de compra de estruturas que o jogador não possa pagar, especificando os recursos e quantidades em falta.
- **FR-013**: O menu de construção DEVE exibir uma ficha informativa educativa para cada estrutura e melhoria, detalhando seu funcionamento e a ciência real da NASA associada.
- **FR-014**: O menu de construção DEVE permitir entrar no modo de colocação ao escolher uma estrutura disponível e fornecer botão claro de "Cancelar" para abortar a ação.
- **FR-015**: A interface DEVE exibir painel de melhorias ao selecionar uma estrutura construída, apresentando somente melhorias compatíveis com o tipo daquela estrutura, acompanhadas de custos e efeitos.
- **FR-016**: O painel de energia DEVE fornecer chaves individuais (Desligado, Mínimo, Máximo) para cada tipo de estrutura chaveável (Mina, Oxigênio, Derretedor de Gelo, Refinaria de Ferro, Estufa, Oficina, Fábrica de Aço).
- **FR-017**: A interface DEVE exibir a caixa de diálogo com o briefing da Comandante Vega no início de cada estação, pausando o tempo de jogo até que o jogador avance.
- **FR-018**: Os briefings da Comandante Vega DEVEM trazer textos educativos específicos para cada ciclo e estação, incluindo aviso prévio obrigatório antes do Ano 3 sobre o frio extremo do inverno e a necessidade de isolamento térmico.
- **FR-019**: O sistema de alerta DEVE exibir uma contagem regressiva de 10 segundos em tempestades de radiação solar, indicando o evento real da NASA DONKI e um botão rápido de "Abrigar Tripulação".
- **FR-020**: A interface DEVE dispor de um Kit de UI reutilizável com Botões, Barras de Recursos, Cartões, Modais, Ícones e padrões de estilo (tokens) consistentes.
- **FR-021**: A interface DEVE oferecer suporte bilíngue completo em Inglês (obrigatório/padrão) e Português, permitindo troca imediata em qualquer tela sem perda de estado.
- **FR-022**: A interface DEVE conter uma Tela Inicial que permita iniciar missões, acessar as fontes científicas e alternar o idioma.
- **FR-023**: A interface DEVE ser responsiva para navegadores de computadores, tablets e smartphones, assegurando alvos de clique/toque de no mínimo 44×44 pixels CSS.
- **FR-024**: Todos os componentes da interface DEVEM seguir requisitos de acessibilidade: contraste mínimo de texto de 4.5:1, navegação por teclado, rótulos para leitores de tela e nunca usar cor como único elemento de diferenciação.
- **FR-025**: A interface 2D DEVE permitir jogar uma missão completa de forma autônoma: caso a visualização 3D não carregue, o jogador consegue posicionar estruturas, gerenciar energia, receber avisos e concluir a missão apenas com a UI 2D.

### Entidades Principais

- **Medidor de Reserva Vital**: Monitora recursos de sobrevivência (Oxigênio, Água, Alimento). Contém quantidade atual, taxa de consumo, meta de vitória, patamar de alerta e estado de aviso ativo.
- **Indicador de Rede Elétrica**: Monitora a energia da base. Contém geração total (kW), consumo total (kW), saldo líquido (kW), reserva de baterias e estado de contingência/apagão.
- **Carteira de Recursos**: Contabiliza materiais de expansão e manutenção. Armazena quantidades de Hematita, Regolito, Ferro, Aço e Peças de Reparo.
- **Ficha de Membro da Tripulação**: Registra o estado individual de cada astronauta. Contém identificador, status vital (vivo/falecido), localização (abrigado/em atividade externa), tarefa em andamento e percentual de exposição à radiação (0%–100%).
- **Item de Catálogo de Estruturas / Melhorias**: Representa um item construível. Contém nome, nível tecnológico (1 a 3), composição de custos, perfil de consumo de energia, taxas de produção sazonais, melhorias permitidas e texto explicativo da ciência associada.
- **Ajuste de Chave de Energia**: Define a intensidade de operação por categoria de instalação (Desligado / Mínimo / Máximo).
- **Briefing da Comandante**: Mensagem narrativa de orientação. Contém identificador do ciclo e da estação, título, texto sobre os fenômenos marcianos e recomendação tática.
- **Notificação de Alerta de Emergência**: Notificação para situações de perigo agudo (Tempestade de Radiação, Falta de Suporte à Vida). Contém tipo de perigo, tempo limite de contagem, descrição, registro científico de apoio (NASA DONKI) e ações imediatas recomendadas.
- **Componentes do Kit de UI**: Conjunto de elementos padronizados (`Button`, `ResourceBar`, `Card`, `Modal`, `Icon` e tokens de design) utilizados uniformemente em toda a aplicação.

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: 100% das reservas vitais (Oxigênio, Água, Alimento), saldo de energia e materiais da carteira ficam visíveis na tela em menos de 1 segundo após o início da missão.
- **SC-002**: Um jogador de 7 a 12 anos consegue identificar se uma estrutura cabe no orçamento e ver os recursos em falta em menos de 3 segundos, sem precisar tentar cliques frustrados.
- **SC-003**: Diante do alerta de tempestade de radiação, a opção de abrigar toda a tripulação pode ser acionada com apenas um clique em até 5 segundos após a notificação surgir.
- **SC-004**: 100% dos textos da interface (HUD, menus de construção, energia, briefings e janelas de diálogo) alternam entre Inglês e Português imediatamente ao toque do botão de idioma, sem recarregar o navegador.
- **SC-005**: Todos os botões, cartões interativos e seletores oferecem áreas de toque de pelo menos 44×44 pixels CSS e mantêm taxa de contraste compatível com WCAG AA (mínimo de 4.5:1 para textos regulares).
- **SC-006**: O ciclo completo de jogo (iniciar missão, gerenciar reservas vitais, construir todos os 3 níveis de estruturas, aplicar melhorias, gerenciar chaves de energia, ler briefings, responder a alertas e alcançar vitória ou derrota) é 100% executável através da UI 2D, mesmo quando o módulo de renderização 3D estiver desabilitado.

## Premissas

- **Integração com Estado e Simulação**: A interface 2D consome os estados, avanços de tempo e comandos a partir da central de estado e seletores da aplicação, sem duplicar regras de cálculo dentro dos componentes visuais.
- **Fonte dos Dados Educativos e Balanceamento**: Todos os valores numéricos de balanceamento, custos de edifícios, taxas de produção, textos educativos e parâmetros de estações são carregados a partir dos arquivos de configuração JSON definidos para o projeto, sem valores fixos embutidos no código da UI.
- **Alertas Sonoros e Visuais**: Efeitos sonoros atuam como complemento; todos os alertas e alarmes de emergência contam com representação visual completa e autônoma, garantindo jogabilidade em computadores sem som ou para pessoas com deficiência auditiva.
- **Idioma Padrão**: O inglês permanece como idioma inicial padrão para atender aos avaliadores do NASA Space Apps Challenge, enquanto o português está disponível por alternância imediata.
- **Linguagem Apropriada para Crianças**: Os textos são redigidos em vocabulário claro e direto para a faixa de 7 a 12 anos, explicando termos técnicos da exploração espacial (como "regolito", "sol", "MOXIE") no momento em que aparecem.
