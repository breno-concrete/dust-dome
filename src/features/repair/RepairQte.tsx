// Owner: Dev C. Repair quick-time event (constitution II.10): bolts appear on the
// broken structure; click them all before time runs out. Calls finishQte(success).
// TODO(Dev C, US3): one bolt at a time, qteSeconds timer, animation, sound.
import { useState } from 'react'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import { sound } from '../scene/sound'
import styles from './RepairQte.module.css'

// Each bolt clicks a little higher, so the player hears the repair getting closer.
const BOLT_PITCH_STEP = 0.08

const strings = {
  title: { en: 'Tighten every bolt!', pt: 'Aperte todos os parafusos!' },
  bolt: { en: 'Bolt', pt: 'Parafuso' },
  giveUp: { en: 'Give up', pt: 'Desistir' },
}

export function RepairQte() {
  const qteFor = useGameStore((s) => s.qteFor)
  if (!qteFor) return null
  return <Bolts key={qteFor} />
}

function Bolts() {
  const finishQte = useGameStore((s) => s.finishQte)
  const [left, setLeft] = useState(config.mission.repair.qteBolts)
  const t = useT()

  const total = config.mission.repair.qteBolts

  const hit = () => {
    if (left === 1) {
      sound.play('repair-success')
      finishQte(true)
    } else {
      sound.play('bolt-click', { rate: 1 + BOLT_PITCH_STEP * (total - left) })
      setLeft(left - 1)
    }
  }
  const giveUp = () => {
    sound.play('repair-fail')
    finishQte(false)
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.box}>
        <h2>{t(strings.title)}</h2>
        <Button onClick={hit}>
          {t(strings.bolt)} ({left})
        </Button>
        <Button variant="secondary" onClick={giveUp}>
          {t(strings.giveUp)}
        </Button>
      </div>
    </div>
  )
}
