# Skills de Modelagem 3D & Review Visual

Estas skills documentam o fluxo de modelagem low-poly em React Three Fiber / Three.js e o loop de autocrítica visual via Puppeteer usados no Mars Outpost (`specs/004-base-scene/`):

- `lowpoly-structure-modeling/SKILL.md` — diretrizes de geometria procedural, silhuetas low-poly, `flatShading`, materiais, prevenção de z-fighting e orçamento de vértices.
- `scene-visual-review/SKILL.md` — loop de captura de screenshots com Puppeteer + Chrome local, rubrica de autocrítica (teto de 10 iterações) e gate de aprovação humana.

## Como usar em outra máquina / área (ex.: tela inicial)

Estes arquivos ficam em `specs/004-base-scene/skills/` para respeitar a regra de `ownership` da área `scene/` no CI. Para ativá-los no seu agente local, copie as pastas para o diretório de skills do seu ambiente:

```bash
mkdir -p ~/.gemini/skills
cp -r specs/004-base-scene/skills/lowpoly-structure-modeling ~/.gemini/skills/
cp -r specs/004-base-scene/skills/scene-visual-review ~/.gemini/skills/
```

> **Dica:** se você estiver usando um agente fora do Snap com Puppeteer, aponte o `executablePath` para o Chrome/Chromium local (ex.: `/usr/bin/google-chrome` ou `~/.cache/puppeteer/chrome/...`) para rodar o loop de screenshots.
