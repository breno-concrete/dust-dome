// Owner: Dev B. Reusable panel card for structured content.
import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  badge?: ReactNode
  footer?: ReactNode
  selected?: boolean
  children: ReactNode
}

export function Card({
  title,
  badge,
  footer,
  selected = false,
  children,
  className,
  ...rest
}: CardProps) {
  const classes = [styles.card, selected && styles.selected, className].filter(Boolean).join(' ')

  return (
    <article className={classes} {...rest}>
      {(title || badge) && (
        <header className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {badge && <div className={styles.badge}>{badge}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </article>
  )
}
