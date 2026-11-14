// Owner: Dev B. One Off / Min / Max switch per structure type (constitution II.7).
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { PowerMode } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'

const strings = {
  title: { en: 'Power switches', pt: 'Chaves de energia' },
  off: { en: 'Off', pt: 'Desl.' },
  min: { en: 'Min', pt: 'Mín' },
  max: { en: 'Max', pt: 'Máx' },
}
const MODES: PowerMode[] = ['off', 'min', 'max']

export function PowerPanel() {
  const modes = useGameStore((s) => s.game?.powerModes)
  const setPowerMode = useGameStore((s) => s.setPowerMode)
  const t = useT()
  if (!modes) return null

  return (
    <aside className={styles.power} aria-label={t(strings.title)}>
      <h2>{t(strings.title)}</h2>
      {config.structures
        .filter((s) => s.switchable)
        .map((s) => (
          <div key={s.id} className={styles.row}>
            <span>{t(s.name)}</span>
            <span>
              {MODES.map((m) => (
                <Button
                  key={m}
                  variant={modes[s.id] === m ? 'primary' : 'secondary'}
                  onClick={() => setPowerMode(s.id, m)}
                >
                  {t(strings[m])}
                </Button>
              ))}
            </span>
          </div>
        ))}
    </aside>
  )
}
