// Owner: Dev C. Development-only visual state inspector (US2).
// Loaded strictly via import.meta.env.DEV && !import.meta.env.VITEST in Scene.tsx;
// excluded from production bundles and never mutates GameState or the store.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { StructureStatus } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { Modal } from '../../ui-kit/Modal'
import { VegaPortrait } from '../decisions/VegaPortrait'
import type { VegaMood } from '../decisions/vegaPortrait'
import { RepairQteDialog } from '../repair/RepairQte'
import styles from './DevVisualInspector.module.css'
import { sound, type LoopId, type SoundId } from './sound'

const ONE_SHOT_SOUNDS: ReadonlyArray<{ id: SoundId; label: string }> = [
  { id: 'place-structure', label: '🏗️ Construir' },
  { id: 'select-structure', label: '👆 Selecionar' },
  { id: 'bolt-click', label: '🔩 Parafuso' },
  { id: 'repair-success', label: '✅ Reparo ok' },
  { id: 'repair-fail', label: '❌ Reparo falhou' },
]

const LOOP_SOUNDS: ReadonlyArray<{ id: LoopId; label: string }> = [
  { id: 'radiation-alarm', label: '🚨 Alarme' },
  { id: 'dust-storm-loop', label: '🌪️ Vento poeira' },
  { id: 'radiation-storm-loop', label: '☢️ Tempestade radiação' },
]

const VEGA_PREVIEW_MOODS: ReadonlyArray<{ id: VegaMood; label: string; sample: string }> = [
  {
    id: 'welcome',
    label: '👋 Boas-vindas',
    sample: 'Bem-vindos a Hellas Planitia, equipe! Vamos preparar nossa base em Marte.',
  },
  {
    id: 'neutral',
    label: '🙂 Neutra',
    sample: 'O verão marciano traz mais luz solar, ótimo momento para carregar as baterias.',
  },
  {
    id: 'warning',
    label: '⚠️ Aviso',
    sample: 'Atenção: o próximo inverno será severo. Construam o Isolamento Térmico!',
  },
  {
    id: 'celebrating',
    label: '🎉 Comemorando',
    sample: 'Sobrevivemos ao primeiro ano em Marte, parabéns à toda a equipe!',
  },
  {
    id: 'caring',
    label: '💙 Apoio',
    sample: 'Estamos na noite mais fria da missão, mas vamos superar isso juntos.',
  },
  {
    id: 'alert',
    label: '🚨 Alerta',
    sample: 'Alerta máximo! Tempestade solar detectada — abrigar toda a tripulação agora!',
  },
]

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
  const [devLoop, setDevLoop] = useState<LoopId | null>(null)
  const toggleLoop = (id: LoopId) => {
    const next = devLoop === id ? null : id
    sound.loop(next)
    setDevLoop(next)
  }
  const [testingQte, setTestingQte] = useState(false)
  const [lastQteResult, setLastQteResult] = useState<'success' | 'fail' | null>(null)
  const [previewVegaMood, setPreviewVegaMood] = useState<VegaMood | null>(null)
  const activeVegaSample = VEGA_PREVIEW_MOODS.find((m) => m.id === previewVegaMood)

  return (
    <div className={styles.devPanel}>
      {testingQte &&
        createPortal(
          <RepairQteDialog
            structureType="habitat"
            onFinish={(success) => {
              setTestingQte(false)
              setLastQteResult(success ? 'success' : 'fail')
            }}
          />,
          document.body,
        )}

      {activeVegaSample &&
        createPortal(
          <Modal
            isOpen
            tone="light"
            title={`Comandante Vega · Preview (${activeVegaSample.id})`}
            onClose={() => setPreviewVegaMood(null)}
            footer={<Button onClick={() => setPreviewVegaMood(null)}>Fechar preview</Button>}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <VegaPortrait
                mood={activeVegaSample.id}
                variant={activeVegaSample.id === 'alert' ? 'alarm' : 'briefing'}
              />
              <div>
                <strong>Comandante Vega</strong>
                <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{activeVegaSample.sample}</p>
              </div>
            </div>
          </Modal>,
          document.body,
        )}

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

          <div className={styles.devSectionTitle}>Sons (US4 Dev)</div>
          <div className={styles.devRow}>
            {ONE_SHOT_SOUNDS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={styles.devChip}
                onClick={() => sound.play(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className={styles.devRow}>
            {LOOP_SOUNDS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={chipClass(devLoop === opt.id)}
                onClick={() => toggleLoop(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className={styles.devSectionTitle}>Minigame de Reparo (US3 Dev)</div>
          <div className={styles.devRow}>
            <button type="button" className={styles.devChip} onClick={() => setTestingQte(true)}>
              🔧 Testar Minigame QTE
            </button>
            {lastQteResult && (
              <span className={styles.devResultBadge}>
                {lastQteResult === 'success' ? '✅ Reparo OK' : '❌ Falhou / Desistiu'}
              </span>
            )}
          </div>

          <div className={styles.devSectionTitle}>Comandante Vega (Shared Dev)</div>
          <div className={styles.devRow}>
            {VEGA_PREVIEW_MOODS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={chipClass(previewVegaMood === opt.id)}
                onClick={() => setPreviewVegaMood(opt.id)}
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
