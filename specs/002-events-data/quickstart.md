# Início rápido: Eventos e dados da NASA

## Pré-requisitos

- Node.js `>=22.18`
- Dependências instaladas com o lockfile do repositório
- Branch de trabalho com o prefixo `data/`

## Validação focada

Execute os testes de eventos:

```powershell
npx vitest run src\engine\events\events.test.ts
```

Resultado esperado: os testes de agendamento, poeira, escuridão, tempestade global e tempestade
de radiação passam.

Execute os testes do DONKI:

```powershell
npx vitest run src\data\donki.test.ts
```

Resultado esperado: os testes de análise do snapshot, seleção determinística e comportamento para
dados vazios passam.

Execute os testes das telas quando a US4 estiver implementada:

```powershell
npx vitest run src\features\end\EndScreen.test.tsx src\features\sources\SourcesScreen.test.tsx
```

Resultado esperado: o debrief contabiliza os resultados registrados e a tela de fontes identifica
ciência, valores do jogo, simplificações e dados DONKI arquivados.

## Validação do snapshot de dados

Use o script existente somente ao atualizar um intervalo de arquivo explicitamente aprovado:

Coloque a chave de api.nasa.gov no arquivo `.env.local` na raiz do projeto (ele já é ignorado
pelo git, pela regra `*.local`; nunca use `.env` sem confirmar que está ignorado):

```text
NASA_API_KEY=<sua chave>
```

```powershell
npm run data:fetch -- 2024-05-01 2024-05-31
```

O script lê `NASA_API_KEY` da variável de ambiente ou, se ela não existir, do `.env.local`; sem
chave, usa `DEMO_KEY` (limite baixo). O intervalo deve ficar dentro de um único mês; o script
recusa o que cruza meses. A chave nunca vai para o repositório.

O snapshot resultante deve ser versionado em `src/data/snapshots/`, revisado quanto aos campos SEP
esperados e nunca buscado pelo navegador em runtime.

## Validação completa

Antes de cada PR de story:

```powershell
npm run check
```

Resultado esperado: formatação, lint, verificação de tipos, todos os testes e o build passam. O
job de ownership é verificado separadamente pelo CI antes do merge.

## Checklist de cenários manuais

1. Inicie duas missões com a mesma seed e avance-as pela mesma estação; compare os horários e
   alvos dos eventos.
2. Observe uma tempestade de poeira e confirme que sua redução solar termina quando a tempestade
   acaba.
3. No verão do ciclo 1, confirme que a primeira tempestade local começa 30 s depois do início da
   estação e que a próxima só começa 30 s depois do fim da anterior (6 tempestades no verão com os
   valores atuais; 5 densas no ciclo 2).
4. Na primavera do ciclo 2, confirme que cada redemoinho danifica no máximo um painel e às vezes
   entope um gerador de oxigênio; um painel ou gerador com filtro nunca é atingido.
5. No verão do ciclo 3, confirme um curto a cada 45 s, sempre numa mina ou refinaria sem filtro, e
   que a limpeza fica bloqueada o verão inteiro enquanto construir e reparar continuam.
6. No inverno do ciclo 2, confirme que os painéis caem a 0 kW desde o primeiro segundo e que os
   trabalhos externos ficam bloqueados.
7. Confirme que estruturas danificadas, entupidas e em curto permanecem assim até serem reparadas
   ou limpas, e que uma mina entupida que entra em curto volta a funcionar normal depois do reparo.
8. Chegue a um aviso de radiação, abrigue a tripulação e confirme que a tempestade nomeia um
   evento DONKI arquivado.
9. Termine uma missão com perdas registradas e confirme que o debrief explica cada causa.
