// Owner: Dev C. Development-only visual state inspector (US2).
// Loaded strictly via import.meta.env.DEV && !import.meta.env.VITEST in Scene.tsx;
// excluded from production bundles and never mutates GameState or the store.
import { useState } from 'react'
import type { StructureStatus } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import styles from './DevVisualInspector.module.css'

export type DevWeatherPreset = 'auto' | 'summer' | 'dust_storm' | 'winter_dark'

export interface DevVisualOverrides {
  weather: DevWeatherPreset
  frost: boolean
  radiationTint: boolean
  structureStatus: StructureStatus | 'auto'
}

const WEATHER_OPTIONS: ReadonlyArray<{ id: DevWeatherPreset; label: string }> = [
  { id: 'auto', label: 'Jogo (Auto)' },
  { id: 'summer', label: '☀️ Verão' },
  { id: 'dust_storm', label: '🌪️ Tempestade Poeira' },
  { id: 'winter_dark', label: '🌑 Escuridão Inverno' },
]

const STATUS_OPTIONS: ReadonlyArray<{ id: StructureStatus | 'auto'; label: string }> = [
  { id: 'auto', label: 'Jogo (Auto)' },
  { id: 'active', label: '✅ Ativa' },
  { id: 'building', label: '🏗️ Construindo' },
  { id: 'damaged', label: '⚠️ Danificada' },
  { id: 'clogged', label: '🏜️ Entupida' },
  { id: 'short_circuit', label: '⚡ Curto-Circuito' },
]

const chipClass = (active: boolean) =>
  active ? `${styles.devChip} ${styles.devChipActive}` : styles.devChip

export default function DevVisualInspector({
  overrides,
  onChange,
  selectedId,
}: {
  overrides: DevVisualOverrides
  onChange: (next: DevVisualOverrides) => void
  selectedId: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.devPanel}>
      {open && (
        <div className={styles.devCard}>
          <div className={styles.devSectionTitle}>Clima e Luz (US2 Dev)</div>
          <div className={styles.devRow}>
            {WEATHER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={chipClass(overrides.weather === opt.id)}
                onClick={() => onChange({ ...overrides, weather: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className={styles.devSectionTitle}>Alertas / Ambiente</div>
          <div className={styles.devRow}>
            <button
              type="button"
              className={chipClass(overrides.frost)}
              onClick={() => onChange({ ...overrides, frost: !overrides.frost })}
            >
              ❄️ Geada nos Habitats
            </button>
            <button
              type="button"
              className={chipClass(overrides.radiationTint)}
              onClick={() => onChange({ ...overrides, radiationTint: !overrides.radiationTint })}
            >
              ☢️ Alarme Radiação
            </button>
          </div>

          <div className={styles.devSectionTitle}>
            Estado ({selectedId ? `Selecionada: ${selectedId}` : 'Todas as estruturas'})
          </div>
          <div className={styles.devRow}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={chipClass(overrides.structureStatus === opt.id)}
                onClick={() => onChange({ ...overrides, structureStatus: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button variant="secondary" onClick={() => setOpen((o) => !o)}>
        {open ? 'Fechar Dev US2 ✕' : '🛠️ Dev US2 (Estados Visuais)'}
      </Button>
    </div>
  )
}
