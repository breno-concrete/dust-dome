// Owner: Dev B. Accessible dialog modal with backdrop and escape key support.
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { useT } from './i18n'
import styles from './Modal.module.css'

const strings = { close: { en: 'Close dialog', pt: 'Fechar janela' } }

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  isOpen: boolean
  title: string
  size?: 'default' | 'wide'
  /** 'light' is the warm prototype look used by the build menu. */
  tone?: 'dark' | 'light'
  /** 'alertdialog' for emergencies that need the player's attention right now. */
  role?: 'dialog' | 'alertdialog'
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({
  isOpen,
  title,
  size = 'default',
  tone = 'dark',
  role = 'dialog',
  onClose,
  children,
  footer,
}: ModalProps) {
  const t = useT()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Keyboard focus: move into the dialog when it opens, keep Tab inside it, and give focus back
  // to whatever had it before when it closes.
  useEffect(() => {
    if (!isOpen) return
    const before = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialog)?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstItem = items[0]!
      const lastItem = items[items.length - 1]!
      if (
        e.shiftKey &&
        (document.activeElement === firstItem || !dialog.contains(document.activeElement))
      ) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      before?.focus?.()
    }
  }, [isOpen])

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
    <div
      className={[
        styles.backdrop,
        tone === 'light' && styles.backdropLight,
        tone === 'light' && size === 'wide' && styles.backdropWide,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[styles.dialog, size === 'wide' && styles.wide, tone === 'light' && styles.light]
          .filter(Boolean)
          .join(' ')}
        role={role}
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
              aria-label={t(strings.close)}
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
