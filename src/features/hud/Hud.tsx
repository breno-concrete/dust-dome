// Owner: Dev B. Top bar: clock, 3 vital bars with win targets, power meter,
// wallet, crew panel, time controls.
import { secondsLeftInSeason, seasonDef, targets } from '../../app/selectors'
import { useGameStore, type Speed } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { ResourceId } from '../../engine/types'
import { Button } from '../../ui-kit/Button'
import { Icon, type IconName } from '../../ui-kit/Icon'
import { ResourceBar } from '../../ui-kit/ResourceBar'
import { useT } from '../../ui-kit/i18n'
import styles from './Hud.module.css'

const strings = {
  cycle: { en: 'Year', pt: 'Ano' },
  pause: { en: 'Pause', pt: 'Pausar' },
  power: { en: 'Power', pt: 'Energia' },
  crew: { en: 'Crew', pt: 'Tripulação' },
  inside: { en: 'Sheltered', pt: 'Abrigado' },
  outside: { en: 'EVA', pt: 'Externo' },
  deceased: { en: 'Lost', pt: 'Perdido' },
  wallet: { en: 'Materials', pt: 'Materiais' },
}

const VITALS: { id: 'oxygen' | 'water' | 'food'; seasonNeed: number }[] = [
  { id: 'oxygen', seasonNeed: 4 }, // 4 crew * 1 U
  { id: 'water', seasonNeed: 8 },  // 4 crew * 2 U
  { id: 'food', seasonNeed: 4 },   // 4 crew * 1 U
]

const WALLET_RESOURCES: ResourceId[] = [
  'hematite',
  'regolith',
  'iron',
  'steel',
  'repair_parts',
]

const SPEEDS: Speed[] = [1, 2, 4]

function formatTime(seconds: number) {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Hud() {
  const game = useGameStore((s) => s.game)
  const speed = useGameStore((s) => s.speed)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const left = useGameStore((s) => secondsLeftInSeason(s))
  const t = useT()

  if (!game) return null
  const season = seasonDef(game.time.season)
  const isPowerDeficit = game.power.balanceKw < 0

  return (
    <header className={styles.hud} role="banner" aria-label="Mission HUD">
      {/* 1. Time & Season Clock */}
      <div className={styles.clockGroup}>
        <strong className={styles.clockText}>
          {t(strings.cycle)} {game.time.cycle} · {season ? t(season.name) : ''} · {formatTime(left)}
        </strong>
      </div>

      {/* 2. Vital Reserve Bars with Win Targets & Low Alerts */}
      <div className={styles.vitalsGroup} aria-label="Vital life support reserves">
        {VITALS.map(({ id, seasonNeed }) => {
          const def = config.resources.find((r) => r.id === id)
          const current = game.stock[id] ?? 0
          const target = targets.reserves[id]
          const isLow = current < seasonNeed

          return (
            <ResourceBar
              key={id}
              id={id}
              data-testid={`vital-${id}`}
              label={def ? t(def.name) : id}
              current={current}
              target={target}
              isLow={isLow}
              isZero={current <= 0}
              icon={<Icon name={id as IconName} size={16} />}
            />
          )
        })}
      </div>

      {/* 3. Power Meter with Surplus / Deficit Alerts */}
      <div
        data-testid="power"
        className={[styles.powerMeter, isPowerDeficit && styles.deficit].filter(Boolean).join(' ')}
        title={isPowerDeficit ? 'Warning: Electrical deficit!' : 'Electrical grid stable'}
      >
        <Icon name="power" size={16} className={styles.powerIcon} />
        <span className={styles.powerLabel}>{t(strings.power)}:</span>
        <strong className={styles.powerValue}>
          {game.power.balanceKw >= 0 ? '+' : ''}
          {game.power.balanceKw} kW
        </strong>
      </div>

      {/* 4. Materials Wallet */}
      <div className={styles.wallet} data-testid="wallet" aria-label={t(strings.wallet)}>
        {WALLET_RESOURCES.map((id) => {
          const def = config.resources.find((r) => r.id === id)
          const count = Math.floor(game.stock[id] ?? 0)

          return (
            <div
              key={id}
              className={styles.walletItem}
              data-testid={`wallet-${id}`}
              title={def ? t(def.name) : id}
            >
              <Icon name={id as IconName} size={15} />
              <span className={styles.walletCount}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* 5. Crew Status and Radiation Exposure Panel */}
      <div className={styles.crewPanel} data-testid="crew-panel" aria-label={t(strings.crew)}>
        {game.crew.map((astronaut) => {
          const isWarning = astronaut.exposure >= 0.75
          const exposurePercent = Math.round(astronaut.exposure * 100)
          const memberClasses = [
            styles.crewMember,
            isWarning && styles.warning,
            !astronaut.alive && styles.deceased,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={astronaut.id}
              className={memberClasses}
              data-testid={`crew-member-${astronaut.id}`}
              title={`${astronaut.name}: ${astronaut.alive ? (astronaut.location === 'inside' ? t(strings.inside) : t(strings.outside)) : t(strings.deceased)} (Radiation: ${exposurePercent}%)`}
            >
              <Icon name="astronaut" size={16} />
              <span className={styles.astronautName}>{astronaut.name.split(' ')[0]}</span>
              {astronaut.alive ? (
                <span className={styles.exposureValue}>
                  {exposurePercent}%
                  {isWarning && <Icon name="radiation" size={14} className={styles.radiationIcon} />}
                </span>
              ) : (
                <span className={styles.deceasedLabel}>{t(strings.deceased)}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 6. Time and Speed Controls */}
      <div className={styles.speeds} role="group" aria-label="Game speed controls">
        <Button
          variant={speed === 0 ? 'active' : 'secondary'}
          onClick={() => setSpeed(0)}
          aria-label={t(strings.pause)}
        >
          {t(strings.pause)}
        </Button>
        {SPEEDS.map((x) => (
          <Button
            key={x}
            variant={speed === x ? 'active' : 'secondary'}
            onClick={() => setSpeed(x)}
            aria-label={`${x}x speed`}
          >
            {x}×
          </Button>
        ))}
      </div>
    </header>
  )
}
