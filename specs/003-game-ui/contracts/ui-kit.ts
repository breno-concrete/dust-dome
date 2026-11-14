/**
 * Contratos de Componentes do Kit de UI
 * Área: Dev B (UI 2D e Kit de UI)
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'active'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
  ariaLabel?: string
  children: ReactNode
}

export interface ResourceBarProps extends HTMLAttributes<HTMLDivElement> {
  id: string
  label: string
  current: number
  maxOrTarget: number
  unit?: string
  isLow?: boolean
  isZero?: boolean
  showTargetMarker?: boolean
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode
  badge?: ReactNode
  children: ReactNode
  footer?: ReactNode
  selected?: boolean
}

export interface ModalProps {
  isOpen: boolean
  title: string
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
}

export type IconName =
  | 'oxygen'
  | 'water'
  | 'food'
  | 'power'
  | 'hematite'
  | 'regolith'
  | 'iron'
  | 'steel'
  | 'repair_parts'
  | 'astronaut'
  | 'radiation'
  | 'alert'
  | 'pause'
  | 'play'
  | 'close'

export interface IconProps extends HTMLAttributes<SVGElement> {
  name: IconName
  size?: number | string
  className?: string
}
