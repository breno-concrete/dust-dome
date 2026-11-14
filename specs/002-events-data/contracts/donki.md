# Contrato de dados DONKI

## Tipos

```ts
interface SepEvent {
  date: string
  url: string
}

function sepEvents(): SepEvent[]
function pickSepEvent(events: SepEvent[], index: number): SepEvent | null
```

Definidos em `src/data/donki.ts`.

## Comportamento

- `sepEvents()` lê somente dados de snapshots versionados em `src/data/snapshots/`.
- As entradas retornadas contêm uma data utilizável e uma URL DONKI.
- Nenhum acesso à rede é feito em runtime.
- `pickSepEvent([], index)` retorna `null`.
- Para uma entrada não vazia, o mesmo índice seleciona o mesmo evento, inclusive para índices
  maiores que o tamanho da lista, por meio de um ciclo estável.
- Registros inválidos do snapshot são rejeitados ou informados explicitamente; não são convertidos
  em uma fonte inventada.

O motor recebe dados simples `SepEvent` e não conhece o formato do arquivo de snapshot.
