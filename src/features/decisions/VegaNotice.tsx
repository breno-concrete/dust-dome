// Owner: Dev B. Commander Vega speaks up when something serious happens (constitution II.9,
// II.12, principle VII): every crew loss, when it happens, and the automatic return of an
// astronaut at the exposure limit. A small card that does not stop the game; it stays until the
// player says OK. The texts come from narrator.json.
import { useState } from 'react'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { LOSS_CAUSES, type LossCause } from '../../config/schema'
import type { LogEntry } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { VegaPortrait } from './VegaPortrait'

const strings = {
  commander: { en: 'Commander Vega', pt: 'Comandante Vega' },
  ok: { en: 'OK', pt: 'OK' },
  lost: { en: 'We lost {names}.', pt: 'Perdemos {names}.' },
  cameBack: {
    en: '{names} came back inside to rest.',
    pt: '{names} voltou para dentro para descansar.',
  },
  // After the first full explanation of the game, a short reminder is enough.
  cameBackShort: {
    en: 'Too much radiation outside: they work again when the meter is low.',
    pt: 'Radiação demais lá fora: volta a trabalhar quando o medidor baixar.',
  },
}

const isLossCause = (cause: string | undefined): cause is LossCause =>
  LOSS_CAUSES.includes(cause as LossCause)

/** What a log entry makes the commander say; null for everything she stays quiet about. */
function topicOf(entry: LogEntry): string | null {
  if (entry.kind === 'death' && isLossCause(entry.cause)) return `death:${entry.cause}`
  if (entry.kind === 'exposure_return') return 'exposure_return'
  return null
}

export function VegaNotice() {
  const log = useGameStore((s) => s.game?.log)
  const crew = useGameStore((s) => s.game?.crew)
  const seed = useGameStore((s) => s.game?.seed)
  // How many log entries the player has already been told about, and in which game.
  const [seen, setSeen] = useState(0)
  const [game, setGame] = useState(seed)
  const t = useT()
  if (!log || !crew) return null
  if (game !== seed || seen > log.length) {
    // A new game: start listening from its beginning. (State adjusted while rendering.)
    setGame(seed)
    setSeen(0)
    return null
  }

  const first = log.findIndex((e, i) => i >= seen && topicOf(e) !== null)
  if (first === -1) return null
  const topic = topicOf(log[first]!)!
  // Everything of the same kind that happened since goes into the same message,
  // until something else worth telling happened.
  const told: LogEntry[] = []
  let last = first
  for (let i = first; i < log.length; i++) {
    const other = topicOf(log[i]!)
    if (other === null) continue
    if (other !== topic) break
    told.push(log[i]!)
    last = i
  }
  const names = [...new Set(told.map((e) => crew.find((a) => a.id === e.ref)?.name ?? e.ref))].join(
    ', ',
  )

  const isLoss = topic.startsWith('death:')
  const cause = log[first]!.cause
  const explainedBefore = log.slice(0, first).some((e) => e.kind === 'exposure_return')
  const headline = t(isLoss ? strings.lost : strings.cameBack).replace('{names}', names)
  const text = isLoss
    ? isLossCause(cause)
      ? t(config.narrator.lossMessages[cause])
      : ''
    : explainedBefore
      ? t(strings.cameBackShort)
      : t(config.narrator.exposureWarning)

  return (
    <aside
      className={styles.tutorialCard}
      role="alert"
      aria-label={t(strings.commander)}
      data-testid="vega-notice"
    >
      <div className={styles.commander}>
        <div className={styles.tutorialPortrait}>
          <VegaPortrait mood={isLoss ? 'caring' : 'warning'} variant="briefing" />
        </div>
        <div className={styles.commanderCopy}>
          <strong>{t(strings.commander)}</strong>
          <p>
            <strong>{headline}</strong>
          </p>
          <p>{text}</p>
        </div>
      </div>
      <div className={styles.tutorialActions}>
        <Button onClick={() => setSeen(last + 1)}>{t(strings.ok)}</Button>
      </div>
    </aside>
  )
}
