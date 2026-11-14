/**
 * Contratos de Componentes de Decisões e Menus
 * Área: Dev B (UI 2D e Kit de UI)
 */
import type { LocalizedText } from '../../../src/config/schema'
import type { PowerMode, StructureTypeId, UpgradeId } from '../../../src/engine/types'

export interface StructureCardContract {
  id: StructureTypeId
  name: LocalizedText
  level: 1 | 2 | 3
  cost: Record<string, number>
  missingCost: Record<string, number>
  canAfford: boolean
  explain: LocalizedText
  isPlacing: boolean
  onSelect: () => void
}

export interface UpgradeCardContract {
  id: UpgradeId
  name: LocalizedText
  cost: Record<string, number>
  canAfford: boolean
  missingCost: Record<string, number>
  explain: LocalizedText
  isInstalled: boolean
  onInstall: () => void
}

export interface PowerSwitchRowContract {
  structureTypeId: StructureTypeId
  name: LocalizedText
  currentMode: PowerMode
  onChangeMode: (mode: PowerMode) => void
}

export interface BriefingDialogContract {
  isOpen: boolean
  cycle: number
  seasonName: LocalizedText
  explain: LocalizedText
  isCycle3Hint: boolean
  onDismiss: () => void
}

export interface RadiationAlarmContract {
  phase: 'warning' | 'active'
  secondsRemaining: number
  eventDate?: string
  eventUrl?: string
  onShelterAll: () => void
}
