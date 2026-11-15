import { useEffect, useState } from 'react'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { framesForMood, type VegaMood } from './vegaPortrait'

const FRAME_STEP_MS = 170

const strings = {
  alt: {
    neutral: { en: 'Commander Vega — Earth Comms', pt: 'Comandante Vega — Comando na Terra' },
    welcome: {
      en: 'Commander Vega waving from Earth Comms',
      pt: 'Comandante Vega acenando do Comando na Terra',
    },
    warning: {
      en: 'Commander Vega with a serious warning',
      pt: 'Comandante Vega com aviso importante',
    },
    caring: {
      en: 'Commander Vega offering encouragement',
      pt: 'Comandante Vega prestando apoio',
    },
    celebrating: {
      en: 'Commander Vega celebrating mission progress',
      pt: 'Comandante Vega comemorando o avanço da missão',
    },
    alert: {
      en: 'Commander Vega in emergency helmet alert',
      pt: 'Comandante Vega em alerta com capacete fechado',
    },
  },
  badge: { en: 'EARTH · COMMS', pt: 'TERRA · COMANDO' },
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function VegaPortrait({
  mood,
  variant = 'briefing',
}: {
  mood: VegaMood
  variant?: 'briefing' | 'alarm' | 'debrief'
}) {
  const frames = framesForMood(mood)
  const lastIndex = frames.length - 1
  const [frameIndex, setFrameIndex] = useState(() => (prefersReducedMotion() ? lastIndex : 0))
  const t = useT()

  useEffect(() => {
    if (prefersReducedMotion() || lastIndex <= 0) {
      setFrameIndex(lastIndex)
      return
    }
    setFrameIndex(0)
    let current = 0
    const timer = window.setInterval(() => {
      current += 1
      setFrameIndex(current)
      if (current >= lastIndex) {
        window.clearInterval(timer)
      }
    }, FRAME_STEP_MS)
    return () => window.clearInterval(timer)
  }, [mood, lastIndex])

  const src = frames[Math.min(frameIndex, lastIndex)] ?? frames[lastIndex]!
  const variantClass =
    variant === 'alarm'
      ? styles.vegaFrameAlarm
      : variant === 'debrief'
        ? styles.vegaFrameDebrief
        : styles.vegaFrameBriefing

  return (
    <figure className={`${styles.vegaFrame} ${variantClass}`} data-mood={mood}>
      <img className={styles.vegaImg} src={src} alt={t(strings.alt[mood])} />
      <figcaption className={styles.vegaBadge} aria-hidden="true">
        <span className={styles.vegaLed} />
        <span>{t(strings.badge)}</span>
      </figcaption>
    </figure>
  )
}
