// Owner: Dev B. Accessible dialog modal with backdrop and escape key support.
import { useEffect, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import styles from './Modal.module.css'

export interface ModalProps {
  isOpen: boolean
  title: string
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ isOpen, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen || !onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {onClose && (
            <Button
              variant="secondary"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close dialog"
            >
              <Icon name="close" size={16} />
            </Button>
          )}
        </header>

        <div className={styles.content}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  )
}
