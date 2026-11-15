// Owner: Dev B. One Off / Min / Max switch per structure type (constitution II.7).
import { useState } from 'react'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { PowerMode } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { Icon } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'

const strings = {
  title: { en: 'Power switches', pt: 'Controle de energia' },
  close: { en: 'Close', pt: 'Fechar' },
  available: { en: 'Power available', pt: 'Energia disponível' },
  deficit: { en: 'Not enough power for the whole base!', pt: 'Falta energia para a base toda!' },
  surplus: { en: 'There is power for the whole base!', pt: 'Tem energia para toda a base!' },
  produced: { en: 'Makes', pt: 'Produz' },
  used: { en: 'Uses', pt: 'Usa' },
  off: { en: 'Off', pt: 'Off' },
  min: { en: 'Min', pt: 'Mín' },
  max: { en: 'Max', pt: 'Máx' },
}
const MODES: PowerMode[] = ['off', 'min', 'max']

export function PowerPanel() {
  const game = useGameStore((s) => s.game)
  const setPowerMode = useGameStore((s) => s.setPowerMode)
  const [isOpen, setIsOpen] = useState(false)
  const t = useT()
  if (!game) return null

  const { powerModes: modes, power } = game
  const isDeficit = power.balanceKw < 0

  return (
    <>
      <button
        type="button"
        className={[styles.powerDock, isOpen && styles.powerDockActive].filter(Boolean).join(' ')}
        aria-expanded={isOpen}
        aria-controls="power-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.dockIcon}>
          <Icon name="power" size={26} />
        </span>
        {t(strings.title)}
      </button>
      {isOpen && (
        <aside id="power-panel" className={styles.power} aria-label={t(strings.title)}>
          <div className={styles.powerHeading}>
            <span className={styles.dockIcon}>
              <Icon name="power" size={26} />
            </span>
            <h2>{t(strings.title)}</h2>
            <Button
              variant="secondary"
              className={styles.panelClose}
              aria-label={t(strings.close)}
              onClick={() => setIsOpen(false)}
            >
              <Icon name="close" size={18} />
            </Button>
          </div>

          <div
            className={[styles.powerSummary, isDeficit && styles.deficit].filter(Boolean).join(' ')}
          >
            <div>
              <span>{t(strings.available)}</span>
              <strong data-testid="power-balance">
                {isDeficit ? '' : '+'}
                {power.balanceKw}
                <small> kW</small>
              </strong>
            </div>
            <span className={styles.balanceIcon}>
              <Icon name={isDeficit ? 'alert' : 'check'} size={20} />
            </span>
            <p role={isDeficit ? 'alert' : undefined}>
              {t(isDeficit ? strings.deficit : strings.surplus)}
            </p>
          </div>

          <div className={styles.powerTotals}>
            <span>
              {t(strings.produced)} <strong>{Math.round(power.productionKw)} kW</strong>
            </span>
            <span>
              {t(strings.used)} <strong>{Math.round(power.demandKw)} kW</strong>
            </span>
          </div>

          {config.structures
            .filter((s) => s.switchable)
            .map((s) => (
              <div key={s.id} className={styles.powerSystem}>
                <h3>{t(s.name)}</h3>
                <div
                  className={styles.segmented}
                  role="group"
                  aria-label={t(s.name)}
                  data-testid={`power-switch-${s.id}`}
                >
                  {MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={modes[s.id] === m}
                      className={modes[s.id] === m ? styles.segmentActive : undefined}
                      onClick={() => setPowerMode(s.id, m)}
                    >
                      {t(strings[m])}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </aside>
      )}
    </>
  )
}
