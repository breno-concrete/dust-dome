// Owner: Dev A. Mission result + debrief (constitution VII, II.12): what happened
// cycle by cycle, why each loss happened, the real science behind it.
// Everything shown comes from game.log and the config (contracts/debrief-sources.md).
import { seasonDef, structureDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { LocalizedText } from '../../config/schema'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import { GameOverFeedback } from '../decisions/GameOverFeedback'
import { VegaPortrait } from '../decisions/VegaPortrait'
import { buildDebrief, type DebriefLine, type DebriefSection } from './debrief'
import styles from './EndScreen.module.css'

const strings = {
  won: { en: 'The base is ready for the colonists!', pt: 'A base está pronta para os colonos!' },
  lost: { en: 'The mission had to end.', pt: 'A missão precisou terminar.' },
  crewLost: {
    en: 'The crew could not make it. See below what happened.',
    pt: 'A tripulação não resistiu. Veja abaixo o que aconteceu.',
  },
  again: { en: 'Try another strategy', pt: 'Tentar outra estratégia' },
  debrief: { en: 'What happened, season by season', pt: 'O que aconteceu, estação por estação' },
  cycle: { en: 'Cycle', pt: 'Ciclo' },
  astronaut: { en: 'astronaut', pt: 'astronauta' },
  astronauts: { en: 'astronauts', pt: 'astronautas' },
  lostWord: { en: 'Lost', pt: 'Perdemos' },
  noLosses: { en: 'No one was lost this season.', pt: 'Ninguém se perdeu nesta estação.' },
  unknownCause: {
    en: 'The mission log does not say why.',
    pt: 'O diário da missão não diz por quê.',
  },
  structure: { en: 'structure', pt: 'estrutura' },
  simplification: {
    en: 'This part is a game simplification.',
    pt: 'Esta parte é uma simplificação do jogo.',
  },
  storm: {
    en: 'A solar radiation storm hit Mars.',
    pt: 'Uma tempestade de radiação solar atingiu Marte.',
  },
  stormBasedOn: { en: 'Based on a real event:', pt: 'Baseada num evento real:' },
  donkiEvent: {
    en: 'NASA DONKI solar event (archived)',
    pt: 'Evento solar NASA DONKI (arquivado)',
  },
  noDonki: {
    en: 'This one is not tied to a NASA event.',
    pt: 'Esta não está ligada a um evento da NASA.',
  },
  weather: { en: 'Weather this season', pt: 'O tempo nesta estação' },
  status: {
    damaged: { en: 'damaged', pt: 'dano' },
    clogged: { en: 'clogged with dust', pt: 'entupimento de poeira' },
    short_circuit: { en: 'short circuit', pt: 'curto-circuito' },
  },
} satisfies Record<string, LocalizedText | Record<string, LocalizedText>>

/** Plain-words summary of the mission result; never shows a raw lostReason key. */
function summary(
  status: 'running' | 'won' | 'lost',
  lostReason: string | null,
): LocalizedText | null {
  if (status === 'won') return config.narrator.victory
  if (lostReason === 'targets_missed') return config.narrator.debrief.targetsNotMet
  if (lostReason === 'crew_lost') return strings.crewLost
  return null
}

function Line({ line }: { line: DebriefLine }) {
  const t = useT()
  if (line.kind === 'death')
    return (
      <li className={styles.loss}>
        <p className={styles.what}>
          {t(strings.lostWord)}: {line.count}{' '}
          {t(line.count === 1 ? strings.astronaut : strings.astronauts)}
        </p>
        <p>{line.explain ? t(line.explain) : t(strings.unknownCause)}</p>
      </li>
    )

  if (line.kind === 'structure') {
    const name = line.structureType ? structureDef(line.structureType)?.name : undefined
    return (
      <li className={styles.hit}>
        <p className={styles.what}>
          {name ? t(name) : t(strings.structure)} × {line.count}: {t(strings.status[line.status])}
          {line.rule && ` (${t(line.rule.name)})`}
        </p>
        <p>{line.rule ? t(line.rule.explain) : t(strings.simplification)}</p>
      </li>
    )
  }

  return (
    <li className={styles.event}>
      <p className={styles.what}>{t(strings.storm)}</p>
      {line.citation ? (
        <p>
          {t(strings.stormBasedOn)}{' '}
          <a href={line.citation.url} target="_blank" rel="noreferrer">
            {t(strings.donkiEvent)} #{line.citation.id}
          </a>
        </p>
      ) : (
        <p>{t(strings.noDonki)}</p>
      )}
    </li>
  )
}

function Section({ section }: { section: DebriefSection }) {
  const t = useT()
  const headingId = `debrief-${section.cycle}-${section.season}`
  const hasDeaths = section.lines.some((l) => l.kind === 'death')
  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId}>
        {t(strings.cycle)} {section.cycle} · {t(seasonDef(section.season)?.name ?? section.season)}
      </h3>
      {section.lines.length > 0 && (
        <ul className={styles.lines}>
          {section.lines.map((line, i) => (
            <Line key={i} line={line} />
          ))}
        </ul>
      )}
      {!hasDeaths && <p className={styles.ok}>{t(strings.noLosses)}</p>}
      {section.weather.length > 0 && (
        <>
          <h4>{t(strings.weather)}</h4>
          <ul className={styles.weather}>
            {section.weather.map((rule) => (
              <li key={rule.id}>
                <strong>{t(rule.name)}</strong>
                <p>{t(rule.explain)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function EndScreen() {
  const game = useGameStore((s) => s.game)
  const start = useGameStore((s) => s.start)
  const t = useT()
  if (!game) return null

  const sections = buildDebrief(game.log, game.structures, config)
  const result = summary(game.status, game.lostReason)

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <h1 className={styles.title}>{t(game.status === 'won' ? strings.won : strings.lost)}</h1>
        <div className={styles.commanderBanner}>
          <VegaPortrait
            mood={game.status === 'won' ? 'celebrating' : 'caring'}
            variant="briefing"
          />
          {result && <p>{t(result)}</p>}
        </div>
        {/* Only after a loss: it hides itself when the mission was won. */}
        <GameOverFeedback />
        <Button className={styles.again} onClick={() => start()}>
          {t(strings.again)}
        </Button>
        <h2 className={styles.subtitle}>{t(strings.debrief)}</h2>
        {sections.map((s) => (
          <Section key={`${s.cycle}-${s.season}`} section={s} />
        ))}
      </div>
    </main>
  )
}
