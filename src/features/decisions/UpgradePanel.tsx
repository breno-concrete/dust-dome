// Owner: Dev B. Shows only upgrades allowed for the selected structure.
import { useEffect, useRef, useState } from 'react'
import { hasPausedJob } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { Card } from '../../ui-kit/Card'
import { Icon } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import { actionErrorMessages } from './actionErrors'
import styles from './Panel.module.css'
import { StructureInfo } from './StructureInfo'

const strings = {
  repair: { en: 'Repair', pt: 'Reparar' },
  clean: { en: 'Clean', pt: 'Limpar' },
  demolish: { en: 'Demolish', pt: 'Demolir' },
  resume: { en: 'Resume', pt: 'Retomar' },
  resumeHint: {
    en: 'The work here is paused. Tap Resume to send someone back out.',
    pt: 'O trabalho aqui está pausado. Toque em Retomar para mandar alguém de volta.',
  },
  missingParts: { en: 'Missing {n} repair parts', pt: 'Faltam {n} peças de reparo' },
  cleanHint: {
    en: 'Dust is clogging it. Someone goes outside for {n} seconds.',
    pt: 'A poeira está entupindo. Alguém sai por {n} segundos.',
  },
  cleanStorm: {
    en: 'Wait for the dust storm to pass before cleaning.',
    pt: 'Espere a tempestade de poeira passar para limpar.',
  },
  repairHint: {
    en: 'It is broken. Spend {n} repair parts and play the bolt game.',
    pt: 'Está quebrada. Gaste {n} peças de reparo e jogue o jogo dos parafusos.',
  },
  repairing: {
    en: 'The repair is on the way: an astronaut takes care of it.',
    pt: 'O conserto está a caminho: um astronauta cuida disso.',
  },
  cleaning: {
    en: 'The cleaning is on the way: an astronaut takes care of it.',
    pt: 'A limpeza está a caminho: um astronauta cuida disso.',
  },
  demolishing: {
    en: 'This will be demolished. The materials come back when the job ends.',
    pt: 'Isto vai ser demolido. Os materiais voltam quando o trabalho terminar.',
  },
  confirmDemolish: { en: 'Demolish this for sure?', pt: 'Demolir mesmo?' },
  yesDemolish: { en: 'Yes, demolish', pt: 'Sim, demolir' },
  keep: { en: 'Keep it', pt: 'Manter' },
  installing: { en: 'Installing…', pt: 'Instalando…' },
  demolishHint: {
    en: 'You get all the materials back.',
    pt: 'Você recebe todos os materiais de volta.',
  },
  title: { en: 'Upgrades', pt: 'Melhorias' },
  install: { en: 'Install', pt: 'Instalar' },
  installed: { en: 'Installed', pt: 'Instalada' },
  missing: { en: 'Missing', pt: 'Faltam' },
}

export function UpgradePanel() {
  const game = useGameStore((s) => s.game)
  const selectedStructureId = useGameStore((s) => s.selectedStructureId)
  const installUpgrade = useGameStore((s) => s.installUpgrade)
  const openQte = useGameStore((s) => s.openQte)
  const clean = useGameStore((s) => s.clean)
  const demolish = useGameStore((s) => s.demolish)
  const resumeJobs = useGameStore((s) => s.resumeJobs)
  const lastError = useGameStore((s) => s.lastError)
  const selectStructure = useGameStore((s) => s.selectStructure)
  const panelRef = useRef<HTMLElement>(null)
  // The structure whose demolition the player was asked to confirm.
  const [confirmFor, setConfirmFor] = useState<string | null>(null)
  const t = useT()
  const isOpen = Boolean(game?.structures.some(({ id }) => id === selectedStructureId))

  // Clicking anywhere outside the panel closes it (deselects the structure).
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) selectStructure(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen, selectStructure])

  const structure = game?.structures.find(({ id }) => id === selectedStructureId)
  const structureDef = structure && config.structures.find(({ id }) => id === structure.type)
  if (!game || !structure || !structureDef) return null

  const upgrades = structureDef.upgrades.map((id) =>
    config.upgrades.find((upgrade) => upgrade.id === id),
  )

  const paused = hasPausedJob({ game }, structure.id)
  const needsRepair = structure.status === 'damaged' || structure.status === 'short_circuit'
  const partsMissing = Math.max(
    0,
    Math.ceil(config.mission.repair.parts - (game.stock['repair_parts'] ?? 0)),
  )
  const label = t(structureDef.name)
  // Work already asked for on this structure: say so instead of offering the button again.
  const jobs = game.jobs.filter((j) => j.structureId === structure.id)
  const repairing = jobs.some((j) => j.kind === 'repair')
  const cleaning = jobs.some((j) => j.kind === 'clean')
  const demolishing = jobs.some((j) => j.kind === 'demolish')
  const dustStorm = game.activeEvents.some(
    (e) => e.kind === 'dust_storm' || e.kind === 'global_dust_storm',
  )
  const confirming = confirmFor === structure.id

  return (
    <section ref={panelRef} className={styles.upgrades} aria-label={label}>
      <h2>
        <Icon name="wrench" size={20} /> {label}
      </h2>
      <StructureInfo game={game} structure={structure} />
      <div className={styles.structureActions} data-testid="structure-actions">
        {paused && (
          <>
            <Button variant="primary" onClick={() => resumeJobs(structure.id)}>
              <Icon name="play" size={16} /> {t(strings.resume)}
            </Button>
            <p className={styles.hint}>{t(strings.resumeHint)}</p>
          </>
        )}
        {needsRepair && repairing && <p className={styles.hint}>{t(strings.repairing)}</p>}
        {needsRepair && !repairing && (
          <>
            <Button
              variant="primary"
              disabled={partsMissing > 0}
              aria-describedby={partsMissing > 0 ? 'missing-repair-parts' : undefined}
              onClick={() => openQte(structure.id)}
            >
              <Icon name="repair_parts" size={16} /> {t(strings.repair)}
            </Button>
            <p className={styles.hint}>
              {t(strings.repairHint).replace('{n}', String(config.mission.repair.parts))}
            </p>
            {partsMissing > 0 && (
              <p id="missing-repair-parts" className={styles.missing}>
                {t(strings.missingParts).replace('{n}', String(partsMissing))}
              </p>
            )}
          </>
        )}
        {structure.status === 'clogged' && cleaning && (
          <p className={styles.hint}>{t(strings.cleaning)}</p>
        )}
        {structure.status === 'clogged' && !cleaning && (
          <>
            <Button variant="primary" disabled={dustStorm} onClick={() => clean(structure.id)}>
              <Icon name="wrench" size={16} /> {t(strings.clean)}
            </Button>
            <p className={styles.hint}>
              {dustStorm
                ? t(strings.cleanStorm)
                : t(strings.cleanHint).replace('{n}', String(config.mission.jobs.cleanSeconds))}
            </p>
          </>
        )}
      </div>
      {upgrades.length > 0 && <h3 className={styles.infoTitle}>{t(strings.title)}</h3>}
      {upgrades.map((upgrade, index) => {
        if (!upgrade) {
          const missingId = structureDef.upgrades[index]
          return (
            <p key={missingId} role="alert">
              Missing upgrade configuration: {missingId}
            </p>
          )
        }

        const missing = Object.entries(upgrade.cost).filter(
          ([resourceId, amount]) => (game.stock[resourceId] ?? 0) < amount,
        )
        const isInstalled = structure.upgrades.includes(upgrade.id)
        const isInstalling = jobs.some((j) => j.kind === 'upgrade' && j.upgradeId === upgrade.id)
        const missingIds = missing.map(
          ([resourceId]) => `missing-upgrade-${upgrade.id}-${resourceId}`,
        )

        return (
          <Card
            key={upgrade.id}
            className={styles.upgradeCard}
            data-testid={`upgrade-${upgrade.id}`}
            title={t(upgrade.name)}
            badge={isInstalled ? t(strings.installed) : undefined}
          >
            <p>{t(upgrade.explain)}</p>
            <p className={styles.cost}>
              {Object.entries(upgrade.cost)
                .map(([resourceId, amount]) => {
                  const resource = config.resources.find(({ id }) => id === resourceId)
                  return `${amount} ${t(resource?.name) || resourceId}`
                })
                .join(' + ')}
            </p>
            {!isInstalled &&
              missing.map(([resourceId, amount]) => {
                const resource = config.resources.find(({ id }) => id === resourceId)
                const amountMissing = Math.ceil(amount - (game.stock[resourceId] ?? 0))
                return (
                  <p
                    key={resourceId}
                    id={`missing-upgrade-${upgrade.id}-${resourceId}`}
                    className={styles.missing}
                    data-testid={`missing-upgrade-${upgrade.id}-${resourceId}`}
                  >
                    {t(strings.missing)} {amountMissing} {t(resource?.name) || resourceId}
                  </p>
                )
              })}
            <Button
              data-testid={`install-${upgrade.id}`}
              disabled={isInstalled || isInstalling || missing.length > 0}
              aria-describedby={missingIds.length > 0 ? missingIds.join(' ') : undefined}
              onClick={() => installUpgrade(structure.id, upgrade.id)}
            >
              <Icon name="wrench" size={16} />
              {isInstalled
                ? t(strings.installed)
                : isInstalling
                  ? t(strings.installing)
                  : t(strings.install)}
            </Button>
          </Card>
        )
      })}
      {lastError && <p role="alert">{t(actionErrorMessages[lastError])}</p>}
      {/* Demolish comes last, far from Resume / Repair / Clean, and asks before it acts: a
          demolition cannot be undone and a double click must never reach it. */}
      <div className={styles.structureActions} data-testid="panel-demolish">
        {demolishing ? (
          <p className={styles.hint}>{t(strings.demolishing)}</p>
        ) : confirming ? (
          <>
            <p className={styles.hint} role="status">
              {t(strings.confirmDemolish)} {t(strings.demolishHint)}
            </p>
            <Button variant="secondary" onClick={() => setConfirmFor(null)}>
              {t(strings.keep)}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmFor(null)
                demolish(structure.id)
              }}
            >
              <Icon name="close" size={16} /> {t(strings.yesDemolish)}
            </Button>
          </>
        ) : (
          <>
            <p className={styles.hint}>{t(strings.demolishHint)}</p>
            <Button variant="danger" onClick={() => setConfirmFor(structure.id)}>
              <Icon name="close" size={16} /> {t(strings.demolish)}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
