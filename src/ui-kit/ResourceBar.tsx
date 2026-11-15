// Owner: Dev B. Visual resource meter with win target marker and low-reserve alert pulse.
import type { HTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import { useT } from './i18n'
import styles from './ResourceBar.module.css'

const strings = { low: { en: 'Low reserve warning!', pt: 'Reserva baixa!' } }

export interface ResourceBarProps extends HTMLAttributes<HTMLDivElement> {
  id: string
  label: ReactNode
  current: number
  target: number
  max?: number
  unit?: string
  isLow?: boolean
  isZero?: boolean
  icon?: ReactNode
  variant?: 'default' | 'hud'
}

export function ResourceBar({
  id,
  label,
  current,
  target,
  max,
  unit = 'U',
  isLow = false,
  isZero = false,
  icon,
  variant = 'default',
  className,
  ...rest
}: ResourceBarProps) {
  const t = useT()
  const effectiveMax = max ?? Math.max(target * 1.25, current, 1)
  const fillPercent = Math.min(100, Math.max(0, (current / effectiveMax) * 100))
  const targetPercent = Math.min(100, Math.max(0, (target / effectiveMax) * 100))

  const containerClasses = [
    styles.container,
    styles[id],
    variant === 'hud' && styles.hud,
    isLow && styles.low,
    isZero && styles.zero,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={containerClasses}
      role="progressbar"
      aria-label={typeof label === 'string' ? label : id}
      aria-valuenow={Math.floor(current)}
      aria-valuemin={0}
      aria-valuemax={target}
      {...rest}
    >
      {variant === 'hud' && icon && <span className={styles.hudIcon}>{icon}</span>}
      <div className={variant === 'hud' ? styles.hudContent : undefined}>
        <div className={styles.header}>
          <span className={styles.titleGroup}>
            {variant !== 'hud' && icon && <span className={styles.icon}>{icon}</span>}
            <span className={styles.label}>{label}</span>
          </span>
          <span className={styles.valueGroup}>
            <strong className={styles.current}>{Math.floor(current)}</strong>
            <span className={styles.target}>
              {' '}
              / {target} {unit}
            </span>
            {isLow && (
              <span className={styles.alertBadge} title={t(strings.low)}>
                <Icon name="alert" size={16} />
              </span>
            )}
          </span>
        </div>

        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${fillPercent}%` }} />
          <div
            className={styles.targetMarker}
            style={{ left: `${targetPercent}%` }}
            title={`Win target: ${target} ${unit}`}
          />
        </div>
      </div>
    </div>
  )
}
