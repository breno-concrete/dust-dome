// Owner: Dev B. Emergency alarm for a solar radiation storm (constitution II.11).
// Shows the seconds left, the real NASA DONKI event it is modeled on and a one-click shelter.
import { useState } from 'react'
import { radiationShelterPlaces } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { Icon } from '../../ui-kit/Icon'
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
  basedOn: {
    en: 'Based on a real NASA DONKI event of',
    pt: 'Baseado num evento real do NASA DONKI de',
  },
  donki: { en: 'NASA DONKI', pt: 'NASA DONKI' },
  shelter: { en: 'Take shelter', pt: 'Abrigar tripulação' },
  stillOutside: {
    en: '{n} still outside!',
    pt: '{n} ainda lá fora!',
  },
  safeInside: {
    en: 'Everyone is inside. Stay put until the storm passes.',
    pt: 'Todos estão dentro. Fiquem aí até a tempestade passar.',
  },
  stormComesIn: { en: 'The storm arrives in', pt: 'A tempestade chega em' },
  stormEndsIn: { en: 'The storm ends in', pt: 'A tempestade acaba em' },
  secondsShort: { en: 's', pt: 's' },
}

export function RadiationAlarmModal() {
  const hasStorm = useGameStore((s) => Boolean(s.game?.radiationStorm))
  // A new component for each storm, so "I already took shelter" never leaks into the next one.
  return hasStorm ? <Alarm /> : null
}

function Alarm() {
  const storm = useGameStore((s) => s.game?.radiationStorm)
  const elapsed = useGameStore((s) => s.game?.time.elapsed ?? 0)
  const bringAllInside = useGameStore((s) => s.bringAllInside)
  const places = useGameStore((s) => radiationShelterPlaces(s))
  const alive = useGameStore((s) => s.game?.crew.filter((a) => a.alive).length ?? 0)
  const outside = useGameStore(
    (s) => s.game?.crew.filter((a) => a.alive && a.location === 'outside').length ?? 0,
  )
  // After "Take shelter" the big alarm gets out of the way, so the player can see the base.
  const [tookShelter, setTookShelter] = useState(false)
  const t = useT()
  if (!storm) return null

  const isWarning = storm.phase === 'warning'
  const seconds = Math.max(0, Math.ceil(storm.phaseEndsAt - elapsed))
  const danger =
    places < alive ? (
      <p className={styles.shelterDanger} data-testid="shelter-danger">
        {places === 0
          ? t(strings.noShelter)
          : t(strings.notEnoughRoom)
              .replace('{n}', String(places))
              .replace('{total}', String(alive))}
      </p>
    ) : null

  if (tookShelter && outside === 0) {
    return (
      <aside className={styles.stormStatus} role="status">
        <Icon name="radiation" size={26} />
        <div>
          <strong>{t(strings.safeInside)}</strong>
          <p className={styles.stormStatusTime}>
            {t(isWarning ? strings.stormComesIn : strings.stormEndsIn)} <b>{seconds}</b>
            {t(strings.secondsShort)}
          </p>
          {danger}
        </div>
      </aside>
    )
  }

  return (
    <Modal
      isOpen
      tone="light"
      role="alertdialog"
      title={t(strings.title)}
      footer={
        <Button
          variant="danger"
          className={styles.briefingButton}
          onClick={() => {
            bringAllInside()
            setTookShelter(true)
          }}
        >
          {t(strings.shelter)}
        </Button>
      }
    >
      <div className={styles.alarm}>
        <VegaPortrait mood="alert" variant="alarm" />
        <div>
          <p>{t(isWarning ? strings.warning : strings.active)}</p>
          {tookShelter && outside > 0 && (
            <p className={styles.shelterDanger} data-testid="still-outside">
              {t(strings.stillOutside).replace('{n}', String(outside))}
            </p>
          )}
          {danger}
          {isWarning && (
            <p className={styles.countdown} data-testid="storm-countdown">
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
