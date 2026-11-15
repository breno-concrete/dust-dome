// Owner: Dev C. Repair quick-time event (constitution II.10): bolts appear one at a time
// at random spots on the broken structure; click them all before qteSeconds run out.
// Calls finishQte(success).
import { useEffect, useRef, useState } from 'react'
import type { StructureTypeId } from '../../engine/types'
import { structureDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { Icon } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import { sound } from '../scene/sound'
import styles from './RepairQte.module.css'

// Each bolt clicks a little higher, so the player hears the repair getting closer.
const BOLT_PITCH_STEP = 0.08

const strings = {
  title: { en: 'Tighten every bolt!', pt: 'Aperte todos os parafusos!' },
  subtitle: {
    en: 'Click each loose bolt on the hull plate before time runs out.',
    pt: 'Clique em cada parafuso solto na placa antes que o tempo acabe.',
  },
  bolt: { en: 'Bolt', pt: 'Parafuso' },
  giveUp: { en: 'Give up', pt: 'Desistir' },
  timeRemaining: { en: 'Time remaining', pt: 'Tempo restante' },
  targetArea: { en: 'Structure hull repair plate', pt: 'Placa de reparo da estrutura' },
}

const MIN_BOLT_PCT = 15
const MAX_BOLT_PCT = 85
const BOLT_SPAN_PCT = MAX_BOLT_PCT - MIN_BOLT_PCT
const TICK_MS = 100

interface BoltPosition {
  x: number
  y: number
}

function randomBoltPosition(prev?: BoltPosition): BoltPosition {
  let x = MIN_BOLT_PCT + Math.random() * BOLT_SPAN_PCT
  let y = MIN_BOLT_PCT + Math.random() * BOLT_SPAN_PCT
  if (prev && Math.hypot(x - prev.x, y - prev.y) < 10) {
    x = MIN_BOLT_PCT + ((x - MIN_BOLT_PCT + BOLT_SPAN_PCT * 0.47) % BOLT_SPAN_PCT)
    y = MIN_BOLT_PCT + ((y - MIN_BOLT_PCT + BOLT_SPAN_PCT * 0.37) % BOLT_SPAN_PCT)
  }
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  }
}

export function RepairQte() {
  const qteFor = useGameStore((s) => s.qteFor)
  const finishQte = useGameStore((s) => s.finishQte)
  const structureType = useGameStore((s) =>
    s.qteFor ? s.game?.structures.find((st) => st.id === s.qteFor)?.type : undefined,
  )
  if (!qteFor) return null
  return <RepairQteDialog key={qteFor} structureType={structureType} onFinish={finishQte} />
}

export function RepairQteDialog({
  structureType,
  onFinish,
}: {
  structureType?: StructureTypeId
  onFinish: (success: boolean) => void
}) {
  const totalBolts = config.mission.repair.qteBolts
  const totalSeconds = config.mission.repair.qteSeconds
  const totalMs = totalSeconds * 1000

  const [left, setLeft] = useState(totalBolts)
  const [pos, setPos] = useState<BoltPosition>(() => randomBoltPosition())
  const [remainingMs, setRemainingMs] = useState(totalMs)
  const finishedRef = useRef(false)
  const t = useT()

  const targetDef = structureType ? structureDef(structureType) : undefined

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - TICK_MS))
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (remainingMs <= 0 && !finishedRef.current) {
      finishedRef.current = true
      sound.play('repair-fail')
      onFinish(false)
    }
  }, [remainingMs, onFinish])

  const hit = () => {
    if (finishedRef.current) return
    if (left <= 1) {
      finishedRef.current = true
      sound.play('repair-success')
      onFinish(true)
    } else {
      sound.play('bolt-click', { rate: 1 + BOLT_PITCH_STEP * (totalBolts - left) })
      setLeft(left - 1)
      setPos(randomBoltPosition(pos))
    }
  }

  const giveUp = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    sound.play('repair-fail')
    onFinish(false)
  }

  const remainingSeconds = Math.max(0, Math.round(remainingMs / 100) / 10)
  const progressPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))
  const tightenedCount = totalBolts - left
  const isUrgent = remainingSeconds <= 2

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t(strings.title)}>
      <div className={styles.box}>
        <header className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <Icon name="wrench" size={22} />
          </span>
          <div className={styles.headerText}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>{t(strings.title)}</h2>
              {targetDef && <span className={styles.structureBadge}>{t(targetDef.name)}</span>}
            </div>
            <p className={styles.subtitle}>{t(strings.subtitle)}</p>
          </div>
        </header>

        <div className={styles.statusRow}>
          <div className={styles.boltPips} aria-hidden="true">
            {Array.from({ length: totalBolts }, (_, idx) => {
              const done = idx < tightenedCount
              return (
                <span
                  key={idx}
                  className={[styles.boltPip, done && styles.boltPipDone].filter(Boolean).join(' ')}
                />
              )
            })}
          </div>
          <span
            className={[styles.timerValue, isUrgent && styles.timerUrgent]
              .filter(Boolean)
              .join(' ')}
          >
            {remainingSeconds.toFixed(1)}s
          </span>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={t(strings.timeRemaining)}
          aria-valuemin={0}
          aria-valuemax={totalSeconds}
          aria-valuenow={remainingSeconds}
        >
          <div
            className={[styles.progressFill, isUrgent && styles.progressFillUrgent]
              .filter(Boolean)
              .join(' ')}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className={styles.targetArea} aria-label={t(strings.targetArea)}>
          <span className={`${styles.cornerRivet} ${styles.rivetTl}`} aria-hidden="true" />
          <span className={`${styles.cornerRivet} ${styles.rivetTr}`} aria-hidden="true" />
          <span className={`${styles.cornerRivet} ${styles.rivetBl}`} aria-hidden="true" />
          <span className={`${styles.cornerRivet} ${styles.rivetBr}`} aria-hidden="true" />
          <div className={styles.plateSeam} aria-hidden="true" />
          <div className={styles.platePanelLine} aria-hidden="true" />
          <span className={styles.plateStamp} aria-hidden="true">
            EVA-HULL // MAINT
          </span>

          <button
            type="button"
            className={styles.boltButton}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            aria-label={`${t(strings.bolt)} (${left})`}
            onClick={hit}
          >
            <span className={styles.boltWasher} aria-hidden="true" />
            <span className={styles.boltHex} aria-hidden="true">
              <span className={styles.boltCap}>
                <span className={styles.boltSlot} />
              </span>
            </span>
          </button>
        </div>

        <footer className={styles.footer}>
          <Button variant="secondary" className={styles.giveUpBtn} onClick={giveUp}>
            {t(strings.giveUp)}
          </Button>
        </footer>
      </div>
    </div>
  )
}
