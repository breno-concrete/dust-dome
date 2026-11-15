// Owner: Dev B. Emergency alarm for a solar radiation storm (constitution II.11).
// Shows the seconds left, the real NASA DONKI event it is modeled on and a one-click shelter.
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { Modal } from '../../ui-kit/Modal'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { VegaPortrait } from './VegaPortrait'

const strings = {
  title: { en: 'Radiation storm!', pt: 'Tempestade de radiação!' },
  warning: {
    en: 'The Sun threw out fast particles. They can hurt astronauts who are outside!',
    pt: 'O Sol lançou partículas rápidas. Elas podem machucar os astronautas que estão fora!',
  },
  active: {
    en: 'The storm is here. Keep everyone inside until it passes.',
    pt: 'A tempestade chegou. Deixe todos dentro até ela passar.',
  },
  secondsLeft: { en: 'seconds left', pt: 'segundos restantes' },
  basedOn: {
    en: 'Based on a real NASA DONKI event of',
    pt: 'Baseado num evento real do NASA DONKI de',
  },
  donki: { en: 'NASA DONKI', pt: 'NASA DONKI' },
  shelter: { en: 'Take shelter', pt: 'Abrigar tripulação' },
}

export function RadiationAlarmModal() {
  const storm = useGameStore((s) => s.game?.radiationStorm)
  const elapsed = useGameStore((s) => s.game?.time.elapsed ?? 0)
  const bringAllInside = useGameStore((s) => s.bringAllInside)
  const t = useT()
  if (!storm) return null

  const isWarning = storm.phase === 'warning'
  const seconds = Math.max(0, Math.ceil(storm.phaseEndsAt - elapsed))

  return (
    <Modal
      isOpen
      tone="light"
      role="alertdialog"
      title={t(strings.title)}
      footer={
        <Button variant="danger" className={styles.briefingButton} onClick={bringAllInside}>
          {t(strings.shelter)}
        </Button>
      }
    >
      <div className={styles.alarm}>
        <VegaPortrait mood="alert" variant="alarm" />
        <div>
          <p>{t(isWarning ? strings.warning : strings.active)}</p>
          {isWarning && (
            <p className={styles.countdown} data-testid="storm-countdown" aria-live="polite">
              <strong>{seconds}</strong> {t(strings.secondsLeft)}
            </p>
          )}
          {storm.basedOn && (
            <p className={styles.alarmSource}>
              {t(strings.basedOn)} {storm.basedOn.date}:{' '}
              <a href={storm.basedOn.url} target="_blank" rel="noreferrer">
                {t(strings.donki)}
              </a>
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
