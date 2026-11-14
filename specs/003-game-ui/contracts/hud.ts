/**
 * Contratos de Componentes do HUD
 * Área: Dev B (UI 2D e Kit de UI)
 */
import type { LocalizedText } from '../../../src/config/schema'
import type { Speed } from '../../../src/app/store'

export interface VitalItemContract {
  id: 'oxygen' | 'water' | 'food'
  name: LocalizedText
  current: number
  target: number
  dangerThreshold: number
  isLow: boolean
}

export interface PowerStatusContract {
  productionKw: number
  demandKw: number
  balanceKw: number
  batteryEu: number
  isDeficit: boolean
  unheated: boolean
}

export interface WalletItemContract {
  id: string
  name: LocalizedText
  count: number
}

export interface CrewMemberContract {
  id: string
  name: string
  alive: boolean
  location: 'inside' | 'outside'
  exposure: number
  isWarning: boolean
  jobKind: string | null
}

export interface TimeControlsContract {
  speed: Speed
  onSetSpeed: (speed: Speed) => void
}
