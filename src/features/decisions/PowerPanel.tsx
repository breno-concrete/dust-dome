// Owner: Dev B. One Off / Min / Max switch per structure type (constitution II.7).
import { useState } from 'react'
import { batteryCapacityEu } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { PowerMode } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { Icon } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { useTutorialUi } from './tutorial'

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
  noPower: {
    en: 'No power! It turns back on by itself at {mode}.',
    pt: 'Sem energia! Ela volta sozinha para {mode}.',
  },
  battery: { en: 'Battery', pt: 'Bateria' },
  noBattery: {
    en: 'No battery yet: build a battery bank to save the extra power.',
    pt: 'Ainda sem bateria: construa um banco de baterias para guardar a energia que sobra.',
  },
}
const MODES: PowerMode[] = ['off', 'min', 'max']

export function PowerPanel() {
  const game = useGameStore((s) => s.game)
  const setPowerMode = useGameStore((s) => s.setPowerMode)
  const [isOpen, setIsOpen] = useState(false)
  const pointedOut = useTutorialUi((s) => s.highlight === 'power')
  const t = useT()
  if (!game) return null

  const { powerModes: modes, power } = game
  const isDeficit = power.balanceKw < 0
  const capacity = batteryCapacityEu({ game })

  return (
    <>
      <button
        type="button"
        className={[
          styles.powerDock,
          isOpen && styles.powerDockActive,
          pointedOut && styles.tutorialPulse,
        ]
          .filter(Boolean)
          .join(' ')}
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

          <p className={styles.powerBattery} data-testid="power-battery">
            {capacity > 0 ? (
              <>
                {t(strings.battery)}{' '}
                <strong>
                  {Math.round(game.batteryEu)} / {capacity} EU
                </strong>{' '}
                ({Math.round((100 * game.batteryEu) / capacity)}%)
              </>
            ) : (
              t(strings.noBattery)
            )}
          </p>

          {config.structures
            .filter((s) => s.switchable)
            .map((s) => {
              const chosen = modes[s.id] ?? 'min'
              // The brownout switched this type off: show Off, and where it goes back (II.7).
              const isShed = power.shed.includes(s.id) && chosen !== 'off'
              return (
                <div key={s.id} className={styles.powerSystem}>
                  <h3>{t(s.name)}</h3>
                  <div
                    className={styles.segmented}
                    role="group"
                    aria-label={t(s.name)}
                    data-testid={`power-switch-${s.id}`}
                  >
                    {MODES.map((m) => {
                      const lit = isShed ? m === 'off' : chosen === m
                      return (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={lit}
                          className={[
                            lit && styles.segmentActive,
                            lit && isShed && styles.segmentShed,
                            isShed && chosen === m && styles.segmentChosen,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setPowerMode(s.id, m)}
                        >
                          {t(strings[m])}
                        </button>
                      )
                    })}
                  </div>
                  {isShed && (
                    <p className={styles.powerShedNote} data-testid={`power-shed-${s.id}`}>
                      <Icon name="alert" size={16} />{' '}
                      {t(strings.noPower).replace('{mode}', t(strings[chosen]))}
                    </p>
                  )}
                </div>
              )
            })}
        </aside>
      )}
    </>
  )
}
