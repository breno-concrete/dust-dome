# Início rápido: Eventos e dados da NASA

## Pré-requisitos

- Node.js `>=22.18`
- Dependências instaladas com o lockfile do repositório
- Branch de trabalho com o prefixo `data/`

## Validação focada

Executar os testes de eventos:

```powershell
npx vitest run src\engine\events\events.test.ts
```

Resultado esperado: testes de agendamento, poeira, escuridão, tempestade global e tempestade de
radiação passam.

Executar os testes DONKI:

```powershell
npx vitest run src\data\donki.test.ts
```

Resultado esperado: passam os testes de leitura do snapshot, seleção determinística e dados vazios.

Executar os testes de tela quando a US4 estiver implementada:

```powershell
npx vitest run src\features\end\EndScreen.test.tsx src\features\sources\SourcesScreen.test.tsx
```

Resultado esperado: o debrief contabiliza os resultados registrados e a tela de fontes rotula
ciência, valores do jogo, simplificações e dados DONKI arquivados.

## Validação do snapshot de dados

Usar o script existente somente ao atualizar um intervalo arquivado explicitamente aprovado:

```powershell
npm run data:fetch -- 2024-05-01 2024-05-31
```

O snapshot resultante deve ser versionado em `src/data/snapshots/`, revisado quanto aos campos SEP
esperados e nunca buscado pelo navegador em runtime.

## Validação completa

Antes de cada PR de story:

```powershell
npm run check
```

Resultado esperado: formatação, lint, verificação de tipos, todos os testes e build passam. O job
de ownership é verificado separadamente pelo CI antes do merge.

## Checklist de cenários manuais

1. Iniciar duas missões com a mesma seed e avançá-las pela mesma estação; comparar horários e
   alvos dos eventos.
2. Observar uma tempestade de poeira e confirmar que sua redução solar termina com a tempestade.
3. Confirmar que estruturas danificadas, entupidas e em curto-circuito permanecem assim até serem
   reparadas ou limpas.
4. Alcançar um aviso de radiação, abrigar a tripulação e confirmar que a tempestade nomeia um
   evento DONKI arquivado.
5. Terminar uma missão com perdas no log e confirmar que o debrief explica cada causa.
