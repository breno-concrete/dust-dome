---
name: scene-visual-review
description: >-
  Loop de autocrítica visual e aprovação humana para modelos 3D e cena isométrica
  do Mars Outpost. Use após alterar StructureModel.tsx, Terrain.tsx ou Scene.tsx.
---

# Scene Visual Review & Self-Critique Loop

Baseada em `threejs-visual-validation` (`scottstts/Threejs-Awesome-Graphics-Agent-Skills`, MIT)
e `threejs-aaa-graphics-builder` / `visual-scorecard.md` (`majidmanzarpour/threejs-game-skills`, MIT).

## 1. Fluxo Obrigatório (Teto: 10 iterações por modelo)

Para cada estrutura ou ajuste de cena:
1. **Ler referências**: consultar `specs/004-base-scene/visual-references/README.md` e as imagens em `specs/004-base-scene/visual-references/`.
2. **Implementar / Ajustar**: editar o modelo isolado (`StructureModel.tsx` ou `Terrain.tsx`).
3. **Capturar screenshots determinísticos** (via Puppeteer/Playwright no navegador real com WebGL):
   - Vista isométrica padrão (ângulo 0 e rotação 90°/180°).
   - Vista aproximada (near/detail) para checar encaixes e faces.
   - Vista afastada (zoom mínimo) para checar leitura de silhueta e ausência de void.
4. **Autocrítica com Rubrica Fixa** (preencher explicitamente antes de aprovar):
   - [ ] **Silhueta distinta**: reconhecível sem depender de texto ou só de cor?
   - [ ] **Fidelidade às referências**: está no nível estético de `visual-references/`?
   - [ ] **Geometria limpa**: zero z-fighting, zero arestas/vértices se atravessando sem motivo, zero peças flutuando?
   - [ ] **Paleta e leitura**: contraste branco/cinza + acento laranja/menta coerente com Marte?
   - [ ] **Orçamento**: `flatShading` ativo, baixo custo de triângulos/draw calls?
5. **Loop**: se qualquer item falhar, corrigir e repetir (**máximo 10 iterações**). Se atingir 10 iterações sem passar, parar e reportar exatamente o bloqueio.
6. **Aprovação Humana (Gate)**: ao passar na autocrítica, apresentar ao Pedro:
   - Screenshot do modelo gerado em 2–3 ângulos + comparação com a referência usada.
   - Rubrica preenchida.
   - Aguardar decisão: **Aceitar** (segue para o próximo modelo) ou **Recusar com sugestões** (registra feedback e volta ao loop).

## 2. Falhas Automáticas (Rejeição Imediata)

- Caixa/cilindro genérico com brilho passando por prédio finalizado.
- Z-fighting visível em qualquer ângulo de rotação (0°, 90°, 180°, 270°).
- Estrutura vazando para fora do seu footprint `1×1` ou `2×2`.
- Void visível nas bordas da tela em zoom mínimo ou pan no canto do grid.
- Aprovar baseado apenas em código ou testes sem inspecionar o render real.
