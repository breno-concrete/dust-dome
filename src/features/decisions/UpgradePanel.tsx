// Owner: Dev B. Shows only upgrades allowed for the selected structure.
import { useEffect, useRef } from 'react'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { Card } from '../../ui-kit/Card'
import { Icon } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { StructureInfo } from './StructureInfo'

const strings = {
  repair: { en: 'Repair', pt: 'Reparar' },
  clean: { en: 'Clean', pt: 'Limpar' },
  demolish: { en: 'Demolish', pt: 'Demolir' },
  missingParts: { en: 'Missing {n} repair parts', pt: 'Faltam {n} peças de reparo' },
  cleanHint: {
    en: 'Dust is clogging it. Someone goes outside for 10 seconds.',
    pt: 'A poeira está entupindo. Alguém sai por 10 segundos.',
  },
  repairHint: {
    en: 'It is broken. Spend repair parts and play the bolt game.',
    pt: 'Está quebrada. Gaste peças de reparo e jogue o jogo dos parafusos.',
  },
  demolishHint: {
    en: 'You get all the materials back.',
    pt: 'Você recebe todos os materiais de volta.',
  },
  title: { en: 'Upgrades', pt: 'Melhorias' },
  install: { en: 'Install', pt: 'Instalar' },
  installed: { en: 'Installed', pt: 'Instalada' },
  missing: { en: 'Missing', pt: 'Faltam' },
  notEnoughResources: {
    en: 'There are not enough materials for this action.',
    pt: 'Não há materiais suficientes para esta ação.',
  },
  tileBlocked: {
    en: 'That spot is blocked. Choose a free tile.',
    pt: 'Esse espaço está ocupado. Escolha um espaço livre.',
  },
  outOfBounds: {
    en: 'That spot is outside the base grid.',
    pt: 'Esse espaço está fora da grade da base.',
  },
  notConnected: {
    en: 'Habitat modules must stay connected side by side.',
    pt: 'Os módulos habitacionais precisam ficar conectados lado a lado.',
  },
  lastHabitat: {
    en: 'The last habitat cannot be removed.',
    pt: 'O último habitat não pode ser removido.',
  },
  noRoomForCrew: {
    en: 'Move the crew before removing this habitat.',
    pt: 'Mova a tripulação antes de remover este habitat.',
  },
  externalJobsBlocked: {
    en: 'Outdoor jobs are blocked this season.',
    pt: 'Trabalhos externos estão bloqueados nesta estação.',
  },
  notAllowed: {
    en: 'You cannot do this right now.',
    pt: 'Você não pode fazer isso agora.',
  },
  notImplemented: {
    en: 'This action is not ready yet.',
    pt: 'Esta ação ainda não está disponível.',
  },
}

const actionErrorMessages = {
  not_enough_resources: strings.notEnoughResources,
  tile_blocked: strings.tileBlocked,
  out_of_bounds: strings.outOfBounds,
  not_connected: strings.notConnected,
  last_habitat: strings.lastHabitat,
  no_room_for_crew: strings.noRoomForCrew,
  external_jobs_blocked: strings.externalJobsBlocked,
  not_allowed: strings.notAllowed,
  not_implemented: strings.notImplemented,
}

export function UpgradePanel() {
  const game = useGameStore((s) => s.game)
  const selectedStructureId = useGameStore((s) => s.selectedStructureId)
  const installUpgrade = useGameStore((s) => s.installUpgrade)
  const openQte = useGameStore((s) => s.openQte)
  const clean = useGameStore((s) => s.clean)
  const demolish = useGameStore((s) => s.demolish)
  const lastError = useGameStore((s) => s.lastError)
  const selectStructure = useGameStore((s) => s.selectStructure)
  const panelRef = useRef<HTMLElement>(null)
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

  const needsRepair = structure.status === 'damaged' || structure.status === 'short_circuit'
  const partsMissing = Math.max(
    0,
    Math.ceil(config.mission.repair.parts - (game.stock['repair_parts'] ?? 0)),
  )
  const label = t(structureDef.name)

  return (
    <section ref={panelRef} className={styles.upgrades} aria-label={label}>
      <h2>
        <Icon name="wrench" size={20} /> {label}
      </h2>
      <StructureInfo game={game} structure={structure} />
      <div className={styles.structureActions} data-testid="structure-actions">
        {needsRepair && (
          <>
            <Button
              variant="primary"
              disabled={partsMissing > 0}
              aria-describedby={partsMissing > 0 ? 'missing-repair-parts' : undefined}
              onClick={() => openQte(structure.id)}
            >
              <Icon name="repair_parts" size={16} /> {t(strings.repair)}
            </Button>
            <p className={styles.hint}>{t(strings.repairHint)}</p>
            {partsMissing > 0 && (
              <p id="missing-repair-parts" className={styles.missing}>
                {t(strings.missingParts).replace('{n}', String(partsMissing))}
              </p>
            )}
          </>
        )}
        {structure.status === 'clogged' && (
          <>
            <Button variant="primary" onClick={() => clean(structure.id)}>
              <Icon name="wrench" size={16} /> {t(strings.clean)}
            </Button>
            <p className={styles.hint}>{t(strings.cleanHint)}</p>
          </>
        )}
        <Button variant="danger" onClick={() => demolish(structure.id)}>
          <Icon name="close" size={16} /> {t(strings.demolish)}
        </Button>
        <p className={styles.hint}>{t(strings.demolishHint)}</p>
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
              disabled={isInstalled || missing.length > 0}
              aria-describedby={missingIds.length > 0 ? missingIds.join(' ') : undefined}
              onClick={() => installUpgrade(structure.id, upgrade.id)}
            >
              <Icon name="wrench" size={16} />
              {isInstalled ? t(strings.installed) : t(strings.install)}
            </Button>
          </Card>
        )
      })}
      {lastError && <p role="alert">{t(actionErrorMessages[lastError])}</p>}
    </section>
  )
}
