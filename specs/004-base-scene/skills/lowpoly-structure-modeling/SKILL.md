---
name: lowpoly-structure-modeling
description: >-
  Modelagem 3D low-poly em React Three Fiber / Three.js para o projeto Mars Outpost.
  Use ao criar ou refinar os modelos das 11 estruturas, o terreno de Hellas Planitia
  e props ambientais, evitando z-fighting e silhuetas genéricas.
---

# Low-Poly Structure & Environment Modeling (Mars Outpost)

Baseada nas referências curadas de `CloudAI-X/threejs-skills` (MIT),
`scottstts/Threejs-Awesome-Graphics-Agent-Skills` (MIT) e
`majidmanzarpour/threejs-game-skills` (MIT), adaptadas ao orçamento e estética do Mars Outpost.

## 1. Regras Estéticas Inegociáveis

1. **Silhouette First (`authoring-recipes.md`)**:
   - Cada estrutura deve ser reconhecível apenas pela silhueta escura, antes de cor ou brilho.
   - Uma caixa com dois cilindros e um brilho é um placeholder, não um modelo final.
   - Componha cada estrutura com: **massa principal + forma secundária funcional + detalhes de leitura** (dutos, aletas, antenas, escotilhas, tanques, suportes, treliças).
2. **Low-Poly Limpo (`threejs-geometry`)**:
   - `flatShading: true` em todos os materiais `MeshStandardMaterial`.
   - Use `ExtrudeGeometry` (com `bevelEnabled: true`), `LatheGeometry`, `TubeGeometry` e prismas de poucos segmentos (`6`–`10` lados) para criar chanfros e perfis ricos sem explodir polígonos.
   - Evite esferas de 32 segmentos ou cubos puros sem chanfro/detalhe.
3. **Zero Z-Fighting e Faces Coplanares (`threejs-procedural-geometry`)**:
   - **Proibido** sobrepor faces coplanares no mesmo plano.
   - Use folga explícita (`>= 0.01` unidades) quando uma peça apoia ou sobressai em outra, ou construa um perfil contínuo.
   - Peças que se encaixam devem compartilhar a mesma constante de dimensão (datum), nunca ajustes visuais soltos.
4. **Paleta e Escala Marciana (`visual-references/README.md`)**:
   - Casco principal: branco/cinza-claro (`#f0f2f5`, `#d9e0e8`) com base metálica escura (`#2e3846`).
   - Acentos funcionais: laranja de segurança (`#ff7a29`), verde-menta para vida/energia (`#5bd6a0`), azul solar (`#1e3a5f`), azul água (`#63c5da`).
   - **Footprints**: `1×1` cabe confortavelmente dentro de `0.88 × 0.88`; `2×2` dentro de `1.84 × 1.84`, assentado sobre plataforma/palafitas (`y = 0` no solo).

## 2. Receitas por Categoria de Estrutura

- **Habitats e Estufa (`2×2`)**:
  - `habitat`: cúpula geodésica chanfrada/segmentada com anel estrutural, túnel de airlock, escotilha com visor e módulo de suporte lateral.
  - `greenhouse`: base pressurizada anelar + arcos estruturais externos + cúpula translúcida revelando canteiros internos verdes bem visíveis à distância.
- **Energia**:
  - `solar_panel` (`1×1`): mastro articulado com base triangular + painéis inclinados com moldura chanfrada e grade divisória.
  - `battery` (`1×1`): rack com células cilíndricas verticais, barramento superior e indicador de carga.
  - `nuclear_reactor` (`2×2`): vaso blindado central + 4 aletas radiadoras simétricas em treliça/placa chanfrada + colar de resfriamento.
- **Extração e Produção**:
  - `mine` (`2×2`): área escavada em rocha marciana + pórtico/torre em treliça + guindaste e esteira de minério.
  - `oxygen_generator` (`1×1`): estilo MOXIE com módulo compressor, filtro de entrada e tanques esféricos/cilíndricos de O₂ conectados por duto (`TubeGeometry`).
  - `ice_melter` (`1×1`): broca/extrator térmico + tanque isolado com anel aquecedor laranja + reservatório de água.
  - `iron_refinery` (`2×2`): galpão de fundição + alto-forno cônico + chaminés com anéis + núcleo térmico.
  - `repair_workshop` (`1×1`): oficina modular com teto chanfrado, guincho externo e bancada/braço mecânico.
  - `steel_factory` (`2×2`): nave industrial + tanques horizontais pressurizados (Lote 2) + tubulação aérea + claraboia/exaustor.

## 3. Ambiente de Hellas Planitia (Terreno e Sem Void)

- **Crateras reais (`threejs-procedural-planets`)**: cratera tem **piso rebaixado, parede inclinada e borda elevada (rim)** — nunca apenas um círculo escuro pintado.
- **Terreno amplo**: malha ampla (ex.: `160×160`+) com relevo facetado ao redor do grid `12×12`, falésias/platôs em degraus e `fog` combinando com o horizonte para eliminar qualquer void em zoom mínimo e pan extremo.
- **Props instanciados (`threejs-performance`)**: usar `InstancedMesh` / `<Instances>` para rochas, pedregulhos e formações variadas em escala e rotação sem aumentar draw calls.

## 4. Orçamento e Arquitetura R3F

- Manter modelos + texturas totais bem abaixo de **5 MB** (Constituição V).
- Reutilizar geometrias e materiais estáticos fora dos componentes ou via `useMemo`; nunca alocar vetores/geometrias dentro de `useFrame`.
- Manter cada uma das 11 estruturas com contagem baixa de triângulos (alvo ~150–600 triângulos por estrutura).
