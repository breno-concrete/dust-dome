// Owner: Dev A. Every real-science source the game uses, labeled honestly
// (constitution II, II.13). TODO(Dev A, US4): group by topic, add facts and dates.
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { DataSource } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'

const strings = {
  title: { en: 'The real science in this game', pt: 'A ciência real deste jogo' },
  back: { en: 'Back', pt: 'Voltar' },
}

const KIND = {
  real: 'real value',
  scaled: 'real value, scaled to game time',
  simplification: 'game simplification',
  game_value: 'game value',
} as const

function allSources(): DataSource[] {
  const list = [
    config.seasons.source,
    config.mission.radiationStorm.source,
    ...config.structures.map((s) => s.source),
    ...config.upgrades.map((u) => u.source),
    ...config.events.map((e) => e.source),
  ].filter((s): s is DataSource => Boolean(s))
  return [...new Map(list.map((s) => [s.url, s])).values()]
}

export function SourcesScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const t = useT()

  return (
    <main className="screen">
      <h1>{t(strings.title)}</h1>
      <ul>
        {allSources().map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>{' '}
            ({KIND[s.kind]})
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={() => goTo('title')}>
        {t(strings.back)}
      </Button>
    </main>
  )
}
