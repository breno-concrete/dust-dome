// Owner: Dev B. Top bar: clock, 3 vital bars with win targets, power meter,
// wallet, time controls. TODO(Dev B): real bars (ui-kit ResourceBar), crew panel.
import { secondsLeftInSeason, seasonDef, targets } from '../../app/selectors'
import { useGameStore, type Speed } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import styles from './Hud.module.css'

const strings = {
  cycle: { en: 'Year', pt: 'Ano' },
  pause: { en: 'Pause', pt: 'Pausar' },
  power: { en: 'Power', pt: 'Energia' },
}

const VITALS = ['oxygen', 'water', 'food'] as const
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

  return (
    <header className={styles.hud}>
      <strong>
        {t(strings.cycle)} {game.time.cycle} · {season ? t(season.name) : ''} · {formatTime(left)}
      </strong>

      {VITALS.map((id) => {
        const def = config.resources.find((r) => r.id === id)
        return (
          <span key={id} data-testid={`vital-${id}`}>
            {def ? t(def.name) : id}: {Math.floor(game.stock[id] ?? 0)} / {targets.reserves[id]}
          </span>
        )
      })}

      <span data-testid="power">
        {t(strings.power)}: {game.power.balanceKw >= 0 ? '+' : ''}
        {game.power.balanceKw} kW
      </span>

      <span className={styles.speeds}>
        <Button variant={speed === 0 ? 'primary' : 'secondary'} onClick={() => setSpeed(0)}>
          {t(strings.pause)}
        </Button>
        {SPEEDS.map((x) => (
          <Button
            key={x}
            variant={speed === x ? 'primary' : 'secondary'}
            onClick={() => setSpeed(x)}
          >
            {x}×
          </Button>
        ))}
      </span>
    </header>
  )
}
