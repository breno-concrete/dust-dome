// Owner: Dev B. Visual resource meter with win target marker and low-reserve alert pulse.
import type { HTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './ResourceBar.module.css'

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
  className,
  ...rest
}: ResourceBarProps) {
  const effectiveMax = max ?? Math.max(target * 1.25, current, 1)
  const fillPercent = Math.min(100, Math.max(0, (current / effectiveMax) * 100))
  const targetPercent = Math.min(100, Math.max(0, (target / effectiveMax) * 100))

  const containerClasses = [
    styles.container,
    styles[id],
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
      aria-label={`${id} reserve`}
      aria-valuenow={Math.floor(current)}
      aria-valuemin={0}
      aria-valuemax={target}
      {...rest}
    >
      <div className={styles.header}>
        <span className={styles.titleGroup}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.label}>{label}</span>
        </span>
        <span className={styles.valueGroup}>
          <strong className={styles.current}>{Math.floor(current)}</strong>
          <span className={styles.target}>
            {' '}
            / {target} {unit}
          </span>
          {isLow && (
            <span className={styles.alertBadge} title="Low reserve warning!">
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
  )
}
