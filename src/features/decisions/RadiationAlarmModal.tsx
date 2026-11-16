// Owner: Dev B. Emergency alarm for a solar radiation storm (constitution II.11).
// Shows the seconds left, the real NASA DONKI event it is modeled on and a one-click shelter.
import { radiationShelterPlaces } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { Modal } from '../../ui-kit/Modal'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { VegaPortrait } from './VegaPortrait'

const strings = {
  title: { en: 'Radiation storm!', pt: 'Tempestade de radiação!' },
  // Constitution II.2: outside, or in a habitat without a radiation shelter, nobody is safe.
  warning: {
    en: 'The Sun threw out fast particles! Only a habitat with a radiation shelter keeps astronauts safe.',
    pt: 'O Sol lançou partículas rápidas! Só um módulo com Abrigo antirradiação protege os astronautas.',
  },
  active: {
    en: 'The storm is here. Only astronauts in a radiation shelter are safe until it passes.',
    pt: 'A tempestade chegou. Só quem está no Abrigo antirradiação fica seguro até ela passar.',
  },
  noShelter: {
    en: 'Your base has no radiation shelter. Everyone is in danger, even inside!',
    pt: 'Sua base não tem Abrigo antirradiação. Todos correm perigo, até quem está dentro!',
  },
  notEnoughRoom: {
    en: 'The radiation shelters have room for {n} of {total} astronauts. The others are in danger, even inside!',
    pt: 'Os abrigos antirradiação têm lugar para {n} de {total} astronautas. Os outros correm perigo, até dentro!',
  },
  secondsLeft: { en: 'seconds left', pt: 'segundos restantes' },
  passing: { en: 'The storm passes in {n} seconds.', pt: 'A tempestade passa em {n} segundos.' },
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
  const places = useGameStore((s) => radiationShelterPlaces(s))
  const alive = useGameStore((s) => s.game?.crew.filter((a) => a.alive).length ?? 0)
  const t = useT()
  if (!storm) return null

  const isWarning = storm.phase === 'warning'
  const seconds = Math.max(0, Math.ceil(storm.phaseEndsAt - elapsed))

  return (
    <Modal
      isOpen
      tone="light"
      role="alertdialog"
      // The clock and the crew panel stay usable: slow down, pause, or bring astronauts in one
      // by one (constitution II.11).
      blocking={false}
      title={t(strings.title)}
      footer={
        // Once the storm hits it is too late to move anyone: nothing left to press.
        isWarning ? (
          <Button
            variant="danger"
            className={styles.briefingButton}
            onClick={bringAllInside}
            data-autofocus
          >
            {t(strings.shelter)}
          </Button>
        ) : undefined
      }
    >
      <div className={styles.alarm}>
        <VegaPortrait mood="alert" variant="alarm" />
        <div>
          <p>{t(isWarning ? strings.warning : strings.active)}</p>
          {places < alive && (
            <p className={styles.shelterDanger} data-testid="shelter-danger">
              {places === 0
                ? t(strings.noShelter)
                : t(strings.notEnoughRoom)
                    .replace('{n}', String(places))
                    .replace('{total}', String(alive))}
            </p>
          )}
          {isWarning && (
            <p className={styles.countdown} data-testid="storm-countdown">
              <strong>{seconds}</strong> {t(strings.secondsLeft)}
            </p>
          )}
          {!isWarning && (
            <p className={styles.countdown} data-testid="storm-passing">
              {t(strings.passing).replace('{n}', String(seconds))}
            </p>
          )}
          {storm.basedOn && (
            <p className={styles.alarmSource}>
              {/* The day is enough for a child: no clock time, no time zone letter. */}
              {t(strings.basedOn)} {storm.basedOn.date.split('T')[0]}:{' '}
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
