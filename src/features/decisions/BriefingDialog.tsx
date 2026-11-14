// Owner: Dev B. Commander briefing at the start of every season; the game is
// paused while it is open (constitution II.12). TODO(Dev B): commander portrait,
// per-cycle texts from the POs, transition hint before cycle 3.
import { seasonDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'

const strings = {
  commander: { en: 'Commander Vega', pt: 'Comandante Vega' },
  go: { en: 'Start the season', pt: 'Começar a estação' },
  year: { en: 'Year', pt: 'Ano' },
}

export function BriefingDialog() {
  const briefing = useGameStore((s) => s.game?.briefing)
  const dismiss = useGameStore((s) => s.dismissBriefing)
  const t = useT()
  if (!briefing) return null
  const season = seasonDef(briefing.season)

  return (
    <div className={styles.dialog} role="dialog" aria-modal="true">
      <div className={styles.dialogBox}>
        <p>{t(strings.commander)}</p>
        <h2>
          {t(strings.year)} {briefing.cycle} · {season ? t(season.name) : ''}
        </h2>
        <p>{season ? t(season.explain) : ''}</p>
        <Button onClick={dismiss}>{t(strings.go)}</Button>
      </div>
    </div>
  )
}
