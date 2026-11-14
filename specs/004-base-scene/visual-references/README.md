# Guia de Referência Visual — Cena Isométrica (004-base-scene)

Documento de alinhamento estético entre o design desejado e a implementação técnica em Three.js / React Three Fiber (`src/features/scene/`).

---

## 🎨 Lote 1: Estilo Gráfico Geral (Low-Poly Isométrico Stylized)

Arquivos: `img1 - lote1.jpg`, `img2 - lote1.jpg`, `img3 - lote1.jpg`.

### O que extrair e aplicar no código
1. **Modelagem Low-Poly Limpa e Chanfrada**:
   - Polígonos visíveis bem definidos com sombreamento flat (`flatShading: true` nos materiais `MeshStandardMaterial`).
   - Silhuetas nítidas e amigáveis para crianças de 7 a 12 anos, sem microdetalhes desnecessários ou texturas pesadas.
2. **Paleta de Cores e Iluminação de Marte**:
   - **Solo/Rochas**: Tons quentes de terracota, ferrugem, pêssego queimado e ocre (`#b5532f`, `#c76538`, `#944222`).
   - **Construções**: Contraste alto com módulos brancos/cinza-claro (`#f0f2f5`, `#d9e0e8`), detalhes em laranja de segurança (`#ff7a29`) e verde-menta luminoso para habitats e estufas (`#5bd6a0`).
   - **Iluminação Noturna / Escuridão de Inverno** (inspirado em `img3 - lote1.jpg`): Luz azul/magenta profunda no ambiente contrastando com pontos de luz quentes emitidos pelas cúpulas e janelas.
3. **Mapeamento Técnico**:
   - `Scene.tsx`: Ajuste da luz ambiente (`ambientLight`), direcional (`directionalLight`) e background com base na estação e ciclo (`visualState.ts`).
   - `iso.ts`: Cores do grid e do terreno circundante.

---

## 🏗️ Lote 2: Referência para Construções e Módulos

Arquivos: `img1 - lote2.jpg`, `img2 - lote2.jpg`, `img3 - lote2.jpg`.

### O que extrair e aplicar no código
1. **Estruturas Cilíndricas e Geodésicas**:
   - **Habitats (2×2)**: Cúpulas geodésicas poligonais e tambores cilíndricos brancos com escotilhas e anéis superiores (`img2 - lote2.jpg`).
   - **Estufa Pressionada (2×2)** (`img1 - lote2.jpg`): Cúpula transparente em túnel/arco ou geodésica exibindo interior verde brilhante (vegetação visível mesmo de longe).
   - **Torres, Antenas e Energia** (`img2 - lote2.jpg`): Antenas parabólicas poligonais em treliça metálica, pequenos painéis solares inclinados em arranjos regulares.
   - **Módulos Conectores e Tanques** (`img3 - lote2.jpg`): Cilindros horizontais (tanques de oxigênio/água) e passarelas de ligação modulares.
2. **Mapeamento Técnico**:
   - `src/features/scene/StructureModel.tsx`: Implementação procedural ou `.glb` leve mapeando cada um dos 11 IDs de estruturas (`habitat`, `greenhouse`, `solar_panel`, `ice_melter`, `mine`, etc.) com formas icônicas reconhecíveis à primeira vista.

---

## 🌪️ Lote 3: Ambiente e Reação Adaptativa das Construções

Arquivos: `img1 - lote3.jpg`, `img2 - lote3.jpg`, `img3 - lote3.jpg`.

### O que extrair e aplicar no código
1. **Terreno Acidentado e Rochas em Bloco** (`img3 - lote3.jpg`):
   - Relevo marciano ao redor do grid com falésias em platôs facetados (canyons e crateras de Hellas Planitia).
2. **Adaptação Estrutural ao Terreno** (`img1 - lote3.jpg`):
   - Construções elevadas sobre pilares/palafitas metálicas ajustáveis ao desnível, passarelas suspensas e estruturas subterrâneas/semi-enterradas na rocha (ex.: minas escavadas).
3. **Variações Climáticas e Sazonais** (`img2 - lote3.jpg`):
   - **Primavera/Verão**: Céu claro, sol intenso, sombras recortadas.
   - **Tempestade de Poeira**: Névoa alaranjada/ocre densa que engole as bordas da base (`dustHaze`).
   - **Inverno**: Luz azulada e fria; no inverno severo com falta de aquecimento, formação visível de **geada/cristais brancos** sobre as cúpulas dos habitats.
4. **Mapeamento Técnico**:
   - `src/features/scene/visualState.ts`: Cálculo de `light`, `dustHaze`, `dark`, `frost`.
   - `Scene.tsx`: Neblina de cena (`fogExp2` / `fog`) controlada por `look.dustHaze`.

---

## 👩‍🚀 Lote 4: Fenótipo da Narradora (Comandante Vega)

Arquivo: `img1 - lote4.png`.

### O que extrair e aplicar
1. **Identidade Visual e Fenótipo**:
   - Mulher jovem/adulta, traços latinos/brasileiros.
   - Cabelo castanho escuro curto e ondulado com franja clássica de astronauta.
   - Pele morena / parda.
   - Olhos castanhos expressivos e acolhedores para crianças.
   - Uniforme espacial em tons bege/areia com listras decorativas em vermelho marciano.
2. **Aplicação**:
   - Servirá como referência estrita de fenótipo para os diálogos narrativos do Dev B (`specs/003-game-ui`) e para o avatar dos briefings sazonais da Comandante Vega.

---

## 🖥️ Lote 5: Layout Completo dos Menus e Alvo da Modelagem 3D Final

Arquivo: `img1 - lote5.jpg`.

### O que extrair e aplicar
1. **Layout e Composição da Interface 2D (Expectativa do Time)**:
   - **HUD Superior**: Barra de status compacta com indicador de Sol/Estação/Tempo (`SOL 014 · Ano 01 · Primavera`), controles de velocidade (`Pausa`, `1×`), carteira de materiais (`Hematita`, `Regolito`, `Ferro`) com ícones minimalistas e balanço de energia destacado (`+18 kW`).
   - **Painel Lateral Esquerdo (Suporte à Vida & Tripulação)**: Cartões flutuantes em tons de areia/bege suave (`#f5f1ea`) com cantos arredondados (`border-radius`), barras de progresso horizontais com percentuais para Alimentos, Água e Oxigênio, e status individual dos 4 astronautas com avatar, cargo e saúde/exposição.
   - **Barra de Ações Inferior**: Botões de decisão centralizados e acessíveis (`Visão geral`, `Controle de energia [P]`, `Construir [B]` em tom terracota de destaque).
   - **Controles de Câmera/Navegação**: Controles de zoom flutuantes no canto inferior direito (`- 100% +`).
2. **Alvo Visual da Modelagem 3D (Cena Isométrica Final)**:
   - **Padrão Estético Oficial**: A modelagem vista na imagem representa a meta e o resultado final esperado para o jogo no Three.js / React Three Fiber.
   - **Módulos da Base**: Estruturas cúbicas com chanfros superiores em branco espacial (`#f0f3f6`), frisos em laranja/vermelho de segurança e cúpulas/observatórios no teto.
   - **Tanques Industriais e Torres**: Silos cilíndricos brancos verticais conectados em pares e torre treliçada com antena parabólica/radar direcional.
   - **Matrizes Solares**: Painéis fotovoltaicos azuis escuros em planos inclinados com moldura branca, agrupados em baterias simétricas.
   - **Integração com Terreno**: Terreno em areia/terracota suave com crateras rasas, montanhas e rochas facetadas ao fundo, transmitindo uma atmosfera marciana aconchegante, limpa e convidativa para o público jovem.
