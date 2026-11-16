// Owner: Dev B. What the player sees about the selected machine: its state and what it makes
// and uses. Numbers are per season, like the config (constitution II.4).
import { structurePowerKw } from '../../app/selectors'
import { config } from '../../config/loadConfig'
import type { GameState, PowerMode, StructureInstance } from '../../engine/types'
import { Icon, type IconName } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'

const strings = {
  working: { en: 'Working', pt: 'Funcionando' },
  building: { en: 'Under construction', pt: 'Em construção' },
  damaged: { en: 'Damaged', pt: 'Danificada' },
  clogged: { en: 'Clogged with dust', pt: 'Entupida de poeira' },
  shortCircuit: { en: 'Short circuit', pt: 'Curto-circuito' },
  off: { en: 'Switched off', pt: 'Desligada' },
  noPower: { en: 'No power', pt: 'Sem energia' },
  makes: { en: 'Makes', pt: 'Produz' },
  uses: { en: 'Uses', pt: 'Usa' },
  power: { en: 'Power', pt: 'Energia' },
  usesPower: { en: 'Uses power', pt: 'Gasta energia' },
  perSeason: { en: 'per season', pt: 'por estação' },
}

type Props = { game: GameState; structure: StructureInstance }

/** How much of its normal output a machine gives in this condition (same rule as the engine). */
function conditionFactor(status: StructureInstance['status']): number {
  const { damage } = config.mission
  if (status === 'damaged') return damage.damagedFactor
  if (status === 'clogged') return damage.cloggedFactor
  if (status === 'building' || status === 'short_circuit') return 0
  return 1
}

export function StructureInfo({ game, structure }: Props) {
  const t = useT()
  const def = config.structures.find((s) => s.id === structure.type)
  if (!def) return null

  const mode: PowerMode = def.switchable ? (game.powerModes[structure.type] ?? 'min') : 'min'
  const isOff = def.switchable && mode === 'off'
  // The tables only have min and max; a machine that is off makes nothing (factor 0 below).
  const table: 'min' | 'max' = mode === 'max' ? 'max' : 'min'
  const isShed = game.power.shed.includes(structure.type)
  const works = !isOff && !isShed

  const statusText = (() => {
    if (structure.status === 'building') return strings.building
    if (structure.status === 'short_circuit') return strings.shortCircuit
    if (structure.status === 'damaged') return strings.damaged
    if (structure.status === 'clogged') return strings.clogged
    if (isOff) return strings.off
    if (isShed) return strings.noPower
    return strings.working
  })()

  const factor = works ? conditionFactor(structure.status) : 0
  const bars: {
    id: string
    label: string
    icon: IconName
    now: number
    max: number
    unit: string
  }[] = []

  for (const [resourceId, best] of Object.entries(def.outputs?.max ?? {})) {
    const resource = config.resources.find((r) => r.id === resourceId)
    bars.push({
      id: resourceId,
      label: t(resource?.name) || resourceId,
      icon: resourceId as IconName,
      now: (def.outputs?.[table][resourceId] ?? 0) * factor,
      max: best,
      unit: t(strings.perSeason),
    })
  }

  // What the engine really makes and draws now: darkness, storms, the switch and the brownout
  // are all counted, so the panel never promises power that is not there.
  const powerNow = structurePowerKw({ game }, structure.id) ?? { makesKw: 0, usesKw: 0 }
  if (def.power.kind === 'solar' || def.power.kind === 'constant') {
    bars.push({
      id: 'power',
      label: t(strings.power),
      icon: 'power',
      now: powerNow.makesKw,
      max:
        def.power.kind === 'solar'
          ? Math.max(...Object.values(def.power.kwBySeason))
          : def.power.kw,
      unit: 'kW',
    })
  }

  const inputs = Object.entries((isOff ? {} : def.inputs?.[table]) ?? {})

  return (
    <div className={styles.structureInfo}>
      <p
        className={styles.structureStatus}
        data-testid="structure-status"
        data-status={structure.status}
      >
        {statusText ? t(statusText) : ''}
      </p>
      {bars.length > 0 && (
        <div data-testid="structure-production">
          <p className={styles.infoTitle}>{t(strings.makes)}</p>
          {bars.map((b) => (
            <div
              key={b.id}
              className={styles.productionBar}
              role="progressbar"
              aria-label={b.label}
              aria-valuenow={b.now}
              aria-valuemin={0}
              aria-valuemax={b.max}
              aria-valuetext={`${Math.round(b.now * 10) / 10} / ${b.max} ${b.unit}`}
            >
              <span className={styles.productionLabel}>
                <Icon name={b.icon} size={16} /> {b.label}
              </span>
              <span className={styles.productionTrack}>
                <span
                  className={styles.productionFill}
                  style={{ width: `${Math.min(100, (b.now / b.max) * 100)}%` }}
                />
              </span>
              <span className={styles.productionValue}>
                {Math.round(b.now * 10) / 10} / {b.max} {b.unit}
              </span>
            </div>
          ))}
        </div>
      )}
      {def.power.kind === 'consumer' && (
        <p className={styles.infoUses} data-testid="structure-power-use">
          <strong>{t(strings.usesPower)}:</strong> {Math.round(powerNow.usesKw * 10) / 10} kW
        </p>
      )}
      {inputs.length > 0 && (
        <p className={styles.infoUses} data-testid="structure-inputs">
          <strong>{t(strings.uses)}:</strong>{' '}
          {inputs
            .map(([id, n]) => `${n} ${t(config.resources.find((r) => r.id === id)?.name) || id}`)
            .join(' + ')}{' '}
          {t(strings.perSeason)}
        </p>
      )}
    </div>
  )
}
