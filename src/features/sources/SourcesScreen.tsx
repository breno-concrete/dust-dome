// Owner: Dev A. Every real-science source the game uses, labeled honestly
// (constitution II, II.13). Rules: specs/002-events-data/contracts/debrief-sources.md.
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { DataSource, LocalizedText } from '../../config/schema'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import { donkiCitation, type DonkiCitation } from '../end/debrief'
import { configSources, groupSources } from './sources'
import styles from './SourcesScreen.module.css'

const strings = {
  title: { en: 'The real science in this game', pt: 'A ciência real deste jogo' },
  back: { en: 'Back', pt: 'Voltar' },
  archived: { en: 'archived snapshot', pt: 'cópia arquivada' },
  citedIntro: {
    en: 'The radiation storms in your mission were based on:',
    pt: 'As tempestades de radiação da sua missão foram baseadas em:',
  },
  donkiEvent: {
    en: 'NASA DONKI solar event (archived)',
    pt: 'Evento solar NASA DONKI (arquivado)',
  },
} satisfies Record<string, LocalizedText>

const KIND: Record<DataSource['kind'], LocalizedText> = {
  real: { en: 'real value', pt: 'valor real' },
  scaled: { en: 'real value, scaled to game time', pt: 'valor real, ajustado ao tempo do jogo' },
  simplification: { en: 'game simplification', pt: 'simplificação do jogo' },
  game_value: { en: 'game value', pt: 'valor do jogo' },
}

/** The config never changes while the game runs: group its sources once. */
const rows = groupSources(configSources(config))
const donkiUrl = config.mission.radiationStorm.source.url

/** Distinct DONKI events cited by the radiation storms in the log, in order. */
function citedEvents(log: readonly { kind: string; ref: string }[]): DonkiCitation[] {
  const byUrl = new Map<string, DonkiCitation>()
  for (const e of log) {
    if (e.kind !== 'radiation_storm') continue
    const c = donkiCitation(e.ref)
    if (c && !byUrl.has(c.url)) byUrl.set(c.url, c)
  }
  return [...byUrl.values()]
}

export function SourcesScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const log = useGameStore((s) => s.game?.log)
  const t = useT()
  const cited = log ? citedEvents(log) : []

  return (
    <main className="screen">
      <h1>{t(strings.title)}</h1>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.url}>
            <a href={row.url} target="_blank" rel="noreferrer">
              {row.labels.join(' / ')}
            </a>{' '}
            ({row.kinds.map((k) => t(KIND[k])).join('; ')})
            {row.url === donkiUrl && (
              <>
                {' '}
                <span className={styles.archived}>{t(strings.archived)}</span>
                {cited.length > 0 && (
                  <div className={styles.cited}>
                    <p>{t(strings.citedIntro)}</p>
                    <ul>
                      {cited.map((c) => (
                        <li key={c.url}>
                          <a href={c.url} target="_blank" rel="noreferrer">
                            {t(strings.donkiEvent)} #{c.id}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={() => goTo('title')}>
        {t(strings.back)}
      </Button>
    </main>
  )
}
