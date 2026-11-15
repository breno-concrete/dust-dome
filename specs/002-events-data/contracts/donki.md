# Contrato de dados DONKI

## Tipos

```ts
interface SepEvent {
  date: string
  url: string
}

function readSepSnapshot(raw: unknown): { events: SepEvent[]; problems: string[] }
function sepEvents(): SepEvent[]
function sepGroup(events: SepEvent[], group: number, groups: number): SepEvent[]
function pickSepEvent(events: SepEvent[], index: number): SepEvent | null
```

`sepGroup` é pura: devolve os eventos cuja posição `i` cumpre `i % groups === group`, na ordem
original; se o grupo ficar vazio, devolve a lista inteira. `pickSepEvent` não muda. A regra de
quantos grupos existem está em [data-model.md](../data-model.md).

`sepEvents()` guarda o resultado em cache na primeira chamada. A lista e cada registro ficam
congelados (`Object.freeze`), para uma mutação acusar erro em vez de contaminar outros testes. O
`console.warn` com os `problems` sai uma só vez, quando o cache é montado, e só se `problems` tiver
itens. A leitura é preguiçosa: acontece na primeira chamada, isto é, quando a primeira tempestade
vai começar.

`readSepSnapshot` é pura: aceita só o formato da API (`eventTime`, `link`), descarta registros
inválidos e os descreve em `problems`. `sepEvents()` a usa sobre o snapshot commitado, devolve só
`events` e emite `console.warn` com os `problems`.

Definidos em `src/data/donki.ts`.

## Comportamento

- `sepEvents()` lê somente dados de snapshots versionados em `src/data/snapshots/`.
- As entradas retornadas contêm uma data utilizável e uma URL do DONKI.
- Nenhum acesso à rede em runtime é realizado.
- `pickSepEvent([], index)` retorna `null`.
- Para uma entrada não vazia, o mesmo índice seleciona o mesmo evento, inclusive para índices
  maiores que o tamanho da lista, por meio de um ciclo estável.
- Registros inválidos do snapshot são rejeitados ou informados explicitamente; não são convertidos
  em uma fonte inventada.

O engine recebe dados `SepEvent` simples e não conhece o formato do arquivo de snapshot.
