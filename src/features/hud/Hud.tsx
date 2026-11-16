// Owner: Dev B. Prototype-inspired HUD for reserves, time, materials, energy and crew.
import { useEffect, useState } from 'react'
import {
  batteryCapacityEu,
  batteryRestoreShare,
  secondsLeftInSeason,
  seasonDef,
  targets,
} from '../../app/selectors'
import { useGameStore, type Speed } from '../../app/store'
import { config } from '../../config/loadConfig'
import type { ResourceId } from '../../engine/types'
import { astronautAccentColor } from '../scene/astronautMarkers'
import { Button } from '../../ui-kit/Button'
import { Icon, type IconName } from '../../ui-kit/Icon'
import { ResourceBar } from '../../ui-kit/ResourceBar'
import { useT } from '../../ui-kit/i18n'
import styles from './Hud.module.css'

const strings = {
  cycle: { en: 'Year', pt: 'Ano' },
  pause: { en: 'Pause', pt: 'Pausar' },
  resume: { en: 'Resume', pt: 'Continuar' },
  power: { en: 'Power', pt: 'Energia' },
  battery: { en: 'Battery', pt: 'Bateria' },
  noBattery: { en: 'No battery', pt: 'Sem bateria' },
  charging: { en: 'Charging', pt: 'Carregando' },
  inUse: { en: 'In use', pt: 'Em uso' },
  full: { en: 'Full', pt: 'Cheia' },
  batteryMark: {
    en: 'Machines switched off for lack of power come back on at this mark',
    pt: 'As máquinas desligadas por falta de energia voltam a ligar nesta marca',
  },
  crew: { en: 'Crew', pt: 'Tripulação' },
  // Only a habitat with a radiation shelter shelters (II.11): inside is just inside.
  inside: { en: 'Inside', pt: 'Dentro' },
  outside: { en: 'EVA', pt: 'Externo' },
  allInside: { en: 'All inside', pt: 'Todos para dentro' },
  bringInside: { en: 'Bring {name} inside', pt: 'Trazer {name} para dentro' },
  bringInsideShort: { en: 'Bring in', pt: 'Trazer' },
  deceased: { en: 'Lost', pt: 'Perdido' },
  // Inside and not allowed out yet: above the level to work again, or resting by order.
  recovering: { en: 'Recovering', pt: 'Recuperando' },
  lifeSupport: { en: 'Life support reserves', pt: 'Reservas vitais' },
  gameClock: { en: 'Game clock', pt: 'Relógio do jogo' },
  missionHud: { en: 'Mission status', pt: 'Status da missão' },
  powerDeficit: { en: 'Warning: power deficit!', pt: 'Alerta: falta de energia!' },
  powerStable: { en: 'Power grid stable', pt: 'Rede de energia estável' },
  machinesOff: { en: '{n} off', pt: '{n} desligadas' },
  unheated: {
    en: 'The habitat has no heating! The crew will freeze. Get more power now!',
    pt: 'O habitat está sem aquecimento! A tripulação vai congelar. Consiga mais energia já!',
  },
  radiation: { en: 'Radiation', pt: 'Radiação' },
  speedControls: { en: 'Game speed controls', pt: 'Controles de velocidade' },
  speedLabel: { en: '{n}x speed', pt: 'Velocidade {n}x' },
  lowReserve: { en: 'Low reserve: {name}', pt: 'Reserva baixa: {name}' },
  exposureAlert: {
    en: '{name} is getting too much radiation',
    pt: '{name} está recebendo muita radiação',
  },
  materialsAndEnergy: { en: 'Materials and energy', pt: 'Materiais e energia' },
  fullscreen: { en: 'Fullscreen', pt: 'Tela cheia' },
  exitFullscreen: { en: 'Exit fullscreen', pt: 'Sair da tela cheia' },
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {active ? (
        <>
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </>
      ) : (
        <>
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </>
      )}
    </svg>
  )
}

// A reserve is low when it holds less than one season of crew needs (constitution II.8).
const VITALS = ['food', 'water', 'oxygen'] as const
const crewNeed = (id: (typeof VITALS)[number]) => config.mission.crew * config.mission.needs[id]

const WALLET_RESOURCES: ResourceId[] = ['hematite', 'regolith', 'iron', 'steel', 'repair_parts']

const SPEEDS: Speed[] = [1, 2, 4]

function formatTime(seconds: number) {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function AstronautPortrait({ accent, alive }: { accent: string; alive: boolean }) {
  return (
    <svg viewBox="0 0 36 36" width={34} height={34} aria-hidden="true">
      <defs>
        <linearGradient id={`visor-${accent.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#35465c" />
          <stop offset="55%" stopColor="#1c2635" />
          <stop offset="100%" stopColor="#111824" />
        </linearGradient>
      </defs>
      {/* Space / Mars-sky backdrop */}
      <circle cx="18" cy="18" r="17" fill={alive ? '#2b2422' : '#3a3533'} />
      <circle cx="18" cy="18" r="15.5" fill={accent} fillOpacity={alive ? 0.16 : 0.06} />
      {/* Suit shoulders */}
      <path
        d="M6.5 32.5c1.6-4.9 6-7.5 11.5-7.5s9.9 2.6 11.5 7.5"
        fill="#f0f2f5"
        stroke="#2e3846"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Suit shoulder & collar accent */}
      <path d="M11.5 25.8c2 .9 4.2 1.4 6.5 1.4s4.5-.5 6.5-1.4l-1.3 2.5H12.8z" fill={accent} />
      <path d="M8.3 29.2l2.7-2.6 1.5 1.4-2.3 3.2z" fill={accent} opacity="0.9" />
      <path d="M27.7 29.2l-2.7-2.6-1.5 1.4 2.3 3.2z" fill={accent} opacity="0.9" />
      {/* Helmet shell */}
      <circle cx="18" cy="16" r="8.8" fill="#f0f2f5" stroke="#2e3846" strokeWidth="1.2" />
      {/* Side comm pods */}
      <rect
        x="8.2"
        y="14"
        width="2"
        height="4.2"
        rx="0.9"
        fill={accent}
        stroke="#2e3846"
        strokeWidth="0.7"
      />
      <rect
        x="25.8"
        y="14"
        width="2"
        height="4.2"
        rx="0.9"
        fill={accent}
        stroke="#2e3846"
        strokeWidth="0.7"
      />
      {/* Helmet visor */}
      <rect
        x="11.2"
        y="11.8"
        width="13.6"
        height="8.4"
        rx="4.2"
        fill={`url(#visor-${accent.slice(1)})`}
        stroke="#2e3846"
        strokeWidth="0.9"
      />
      {/* Visor reflection */}
      <path
        d="M13.3 13.7c1.6-.9 3.8-1 5.6-.4"
        fill="none"
        stroke="#ffd6a0"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.78"
      />
      <circle cx="21.5" cy="14.2" r="0.8" fill="#ffffff" opacity="0.55" />
    </svg>
  )
}

export function Hud() {
  const game = useGameStore((s) => s.game)
  const speed = useGameStore((s) => s.speed)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const bringInside = useGameStore((s) => s.bringInside)
  const bringAllInside = useGameStore((s) => s.bringAllInside)
  const left = useGameStore((s) => secondsLeftInSeason(s))
  const t = useT()
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document === 'undefined') return false
    const doc = document as Document & { webkitFullscreenElement?: Element | null }
    return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
  })

  useEffect(() => {
    const syncFullscreen = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null }
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    document.addEventListener('webkitfullscreenchange', syncFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen)
      document.removeEventListener('webkitfullscreenchange', syncFullscreen)
    }
  }, [])

  const toggleFullscreen = async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null
      webkitExitFullscreen?: () => Promise<void> | void
    }
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen()
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      } else {
        if (root.requestFullscreen) await root.requestFullscreen()
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen()
        try {
          const orientation = screen.orientation as ScreenOrientation & {
            lock?: (orientation: string) => Promise<void>
          }
          await orientation?.lock?.('landscape')
        } catch {
          // Ignored silently on browsers that do not support orientation lock.
        }
      }
    } catch {
      // Ignored silently when fullscreen is blocked or unsupported.
    }
  }

  if (!game) return null
  const season = seasonDef(game.time.season)
  // Machines switched off by the brownout are a power shortage too, whatever the balance says.
  const shedCount = game.power.shed.length
  const isPowerDeficit = game.power.balanceKw < 0 || shedCount > 0
  const { warnAt, resumeAt } = config.mission.exposure
  const weather = game.activeEvents
    .filter((e) => e.kind !== 'cold')
    .map((e) => config.events.find((r) => r.id === e.ruleId))
    .find((r) => r !== undefined)
  const batteryCapacity = batteryCapacityEu({ game })
  const batteryEu = Math.round(game.batteryEu)
  const batteryShare = batteryCapacity > 0 ? game.batteryEu / batteryCapacity : 0
  const batteryState =
    batteryCapacity === 0
      ? null
      : batteryEu >= batteryCapacity
        ? strings.full
        : game.power.balanceKw > 0
          ? strings.charging
          : game.power.balanceKw < 0 && batteryEu > 0
            ? strings.inUse
            : null
  const isPaused = speed === 0

  // What a screen reader hears when something needs attention (kept quiet otherwise).
  const alerts = [
    ...VITALS.filter((id) => (game.stock[id] ?? 0) < crewNeed(id)).map((id) =>
      t(strings.lowReserve).replace('{name}', t(config.resources.find((r) => r.id === id)?.name)),
    ),
    ...(isPowerDeficit ? [t(strings.powerDeficit)] : []),
    ...game.crew
      .filter((a) => a.alive && a.exposure >= warnAt)
      .map((a) => t(strings.exposureAlert).replace('{name}', a.name.split(' ')[0]!)),
  ]

  return (
    <header className={styles.hud} role="banner" aria-label={t(strings.missionHud)}>
      <div role="status" aria-live="polite" className={styles.srOnly}>
        {alerts.join('. ')}
      </div>
      {game.power.unheated && (
        <p role="alert" className={styles.heatAlert}>
          <Icon name="alert" size={18} /> {t(strings.unheated)}
        </p>
      )}
      {weather && (
        <p className={styles.weather} data-testid="weather">
          <Icon name="alert" size={16} /> {t(weather.name)}
        </p>
      )}
      <section
        className={[styles.panel, styles.lifePanel].join(' ')}
        aria-label={t(strings.lifeSupport)}
      >
        {VITALS.map((id) => {
          const def = config.resources.find((r) => r.id === id)
          const current = game.stock[id] ?? 0
          const target = targets.reserves[id]
          const isLow = current < crewNeed(id)

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
              variant="hud"
            />
          )
        })}
      </section>

      <section
        className={[styles.panel, styles.timePanel].join(' ')}
        aria-label={t(strings.gameClock)}
      >
        <div className={styles.date}>
          <strong>
            {t(strings.cycle)} {game.time.cycle}
          </strong>
          <span>
            <span className={styles.seasonLabel}>{season ? t(season.name) : ''}</span>
            <i aria-hidden="true" />
            <span className={styles.clock}>{formatTime(left)}</span>
          </span>
        </div>
        <div className={styles.timeDivider} aria-hidden="true" />
        <div className={styles.speeds} role="group" aria-label={t(strings.speedControls)}>
          <Button
            className={[styles.timeButton, isPaused && styles.selectedTimeButton]
              .filter(Boolean)
              .join(' ')}
            variant={isPaused ? 'active' : 'secondary'}
            onClick={() => setSpeed(isPaused ? 1 : 0)}
            aria-label={t(isPaused ? strings.resume : strings.pause)}
            aria-pressed={isPaused}
            icon={<Icon name={isPaused ? 'play' : 'pause'} size={18} />}
          >
            <span className={styles.pauseLabel}>
              {t(isPaused ? strings.resume : strings.pause)}
            </span>
          </Button>
          {SPEEDS.map((x) => (
            <Button
              key={x}
              className={[styles.timeButton, speed === x && styles.selectedTimeButton]
                .filter(Boolean)
                .join(' ')}
              variant={speed === x ? 'active' : 'secondary'}
              onClick={() => setSpeed(x)}
              aria-label={t(strings.speedLabel).replace('{n}', String(x))}
              aria-pressed={speed === x}
            >
              {x}×
            </Button>
          ))}
        </div>
        <Button
          className={styles.fullscreenButton}
          variant="secondary"
          onClick={toggleFullscreen}
          aria-label={t(isFullscreen ? strings.exitFullscreen : strings.fullscreen)}
          aria-pressed={isFullscreen}
          title={t(isFullscreen ? strings.exitFullscreen : strings.fullscreen)}
          icon={<FullscreenIcon active={isFullscreen} />}
        />
      </section>

      <section
        className={[styles.panel, styles.materials].join(' ')}
        data-testid="wallet"
        aria-label={t(strings.materialsAndEnergy)}
      >
        {WALLET_RESOURCES.map((id) => {
          const def = config.resources.find((r) => r.id === id)
          const count = Math.floor(game.stock[id] ?? 0)

          return (
            <div
              key={id}
              className={[styles.material, styles[id]].join(' ')}
              data-testid={`wallet-${id}`}
            >
              <span className={styles.materialIcon}>
                <Icon name={id as IconName} size={23} />
              </span>
              <span className={styles.materialValues} title={def ? t(def.name) : id}>
                <small>{def ? t(def.name) : id}</small>
                <strong>{count}</strong>
              </span>
            </div>
          )
        })}
        <div
          data-testid="power"
          className={[styles.material, styles.energyStat, isPowerDeficit && styles.deficit]
            .filter(Boolean)
            .join(' ')}
          title={t(isPowerDeficit ? strings.powerDeficit : strings.powerStable)}
        >
          <span className={styles.materialIcon}>
            <Icon name="power" size={24} />
          </span>
          <span className={styles.materialValues}>
            <small>
              {t(strings.power)}
              {shedCount > 0 && (
                <span className={styles.batteryState}>
                  {' '}
                  · {t(strings.machinesOff).replace('{n}', String(shedCount))}
                </span>
              )}
            </small>
            <strong>
              {game.power.balanceKw >= 0 ? '+' : ''}
              {game.power.balanceKw}
              <em> kW</em>
            </strong>
          </span>
        </div>
        <div
          data-testid="battery"
          className={[styles.material, styles.energyStat, styles.batteryStat].join(' ')}
        >
          <span className={styles.materialIcon}>
            <Icon name="battery" size={24} />
          </span>
          <span className={styles.materialValues}>
            <small>
              {t(strings.battery)}
              {batteryState && <span className={styles.batteryState}> · {t(batteryState)}</span>}
            </small>
            {batteryCapacity > 0 ? (
              <>
                <strong>{Math.round(batteryShare * 100)}%</strong>
                <span
                  className={styles.batteryBar}
                  role="progressbar"
                  aria-label={t(strings.battery)}
                  aria-valuemin={0}
                  aria-valuemax={batteryCapacity}
                  aria-valuenow={batteryEu}
                >
                  <span
                    className={styles.batteryFill}
                    style={{ width: `${Math.min(1, batteryShare) * 100}%` }}
                  />
                  <span
                    className={styles.batteryMark}
                    data-testid="battery-restore-mark"
                    title={t(strings.batteryMark)}
                    style={{ left: `${batteryRestoreShare * 100}%` }}
                  />
                </span>
              </>
            ) : (
              <strong>{t(strings.noBattery)}</strong>
            )}
          </span>
        </div>
      </section>

      <section
        className={[styles.panel, styles.crewPanel].join(' ')}
        data-testid="crew-panel"
        aria-label={t(strings.crew)}
      >
        <div className={styles.crewHeader}>
          <h2 className={styles.crewHeading}>{t(strings.crew)}</h2>
          <button
            type="button"
            className={styles.crewButton}
            disabled={!game.crew.some((a) => a.alive && a.location === 'outside')}
            onClick={bringAllInside}
          >
            {t(strings.allInside)}
          </button>
        </div>
        {game.crew.map((astronaut, idx) => {
          const isWarning = astronaut.exposure >= warnAt
          const isRecovering =
            astronaut.alive &&
            astronaut.location === 'inside' &&
            (astronaut.resting || astronaut.exposure > resumeAt)
          const where = !astronaut.alive
            ? strings.deceased
            : astronaut.location === 'outside'
              ? strings.outside
              : isRecovering
                ? strings.recovering
                : strings.inside
          const exposurePercent = Math.round(astronaut.exposure * 100)
          const accent = astronautAccentColor(astronaut.id, idx)
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
              title={`${astronaut.name}: ${t(where)} (${t(strings.radiation)}: ${exposurePercent}%)`}
            >
              <span
                className={styles.astronautIcon}
                style={{ borderColor: isWarning ? '#d96b4e' : accent }}
              >
                <AstronautPortrait accent={accent} alive={astronaut.alive} />
              </span>
              <span className={styles.astronautName}>{astronaut.name.split(' ')[0]}</span>
              {astronaut.alive ? (
                <span className={styles.exposureValue}>
                  <span className={styles.exposureCaption}>
                    {isRecovering && (
                      <small className={styles.recovering}>{t(strings.recovering)}</small>
                    )}
                    <small className={styles.exposureLabel}>{t(strings.radiation)}</small>
                  </span>
                  <span className={styles.exposureNumber}>
                    {exposurePercent}%
                    {isWarning && (
                      <Icon name="radiation" size={14} className={styles.radiationIcon} />
                    )}
                  </span>
                </span>
              ) : (
                <span className={styles.deceasedLabel}>{t(strings.deceased)}</span>
              )}
              {astronaut.alive && astronaut.location === 'outside' && (
                <button
                  type="button"
                  className={styles.crewButton}
                  aria-label={t(strings.bringInside).replace(
                    '{name}',
                    astronaut.name.split(' ')[0]!,
                  )}
                  onClick={() => bringInside(astronaut.id)}
                >
                  {t(strings.bringInsideShort)}
                </button>
              )}
            </div>
          )
        })}
      </section>
    </header>
  )
}
