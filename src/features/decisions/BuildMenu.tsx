// Owner: Dev B. Build menu: structures grouped by technology level.
import { useState } from 'react'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { Card } from '../../ui-kit/Card'
import { Icon, type IconName } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import { Modal } from '../../ui-kit/Modal'
import styles from './Panel.module.css'
import { UpgradePanel } from './UpgradePanel'

const strings = {
  title: { en: 'Build menu', pt: 'Menu de construção' },
  open: { en: 'Build base', pt: 'Construir' },
  whereToBuild: { en: 'Where shall we build?', pt: 'Onde vamos construir?' },
  pickSpot: { en: 'Pick a free spot on the base.', pt: 'Escolha um espaço livre na base.' },
  cancelPlacement: { en: 'Cancel placement', pt: 'Cancelar posicionamento' },
  scienceFacts: { en: 'Science facts', pt: 'Fatos científicos' },
  missing: { en: 'Missing', pt: 'Faltam' },
  level: {
    1: { en: 'Level 1 · Raw materials', pt: 'Nível 1 · Recursos brutos' },
    2: { en: 'Level 2 · Processed metals', pt: 'Nível 2 · Metais processados' },
    3: { en: 'Level 3 · Advanced structures', pt: 'Nível 3 · Estruturas avançadas' },
  },
}

const LEVELS = [1, 2, 3] as const

export function BuildMenu() {
  const game = useGameStore((s) => s.game)
  const placing = useGameStore((s) => s.placing)
  const beginPlacement = useGameStore((s) => s.beginPlacement)
  const [isOpen, setIsOpen] = useState(false)
  const t = useT()

  if (!game) return null

  return (
    <>
      {placing && (
        <div className={styles.placementBanner} role="status">
          <span>
            {t(strings.whereToBuild)}
            <small>{t(strings.pickSpot)}</small>
          </span>
          <Button
            variant="secondary"
            className={styles.cancelPlacement}
            onClick={() => beginPlacement(null)}
          >
            {t(strings.cancelPlacement)}
          </Button>
        </div>
      )}
      <button
        type="button"
        className={styles.buildDock}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Icon name="build" size={30} />
        {t(strings.open)}
      </button>
      <Modal
        isOpen={isOpen}
        size="wide"
        tone="light"
        title={t(strings.title)}
        onClose={() => setIsOpen(false)}
      >
        <div className={styles.buildCatalog}>
          {LEVELS.map((level) => {
            const structures = config.structures.filter((structure) => structure.level === level)
            if (structures.length === 0) return null

            return (
              <section
                key={level}
                className={styles.levelGroup}
                data-testid={`build-level-${level}`}
                aria-labelledby={`build-level-title-${level}`}
              >
                <h3 id={`build-level-title-${level}`} className={styles.levelTitle}>
                  <Icon name="layers" size={18} />
                  {t(strings.level[level])}
                </h3>
                <div className={styles.cardGrid}>
                  {structures.map((structure) => {
                    const costs = Object.entries(structure.cost)
                    const missing = costs.filter(
                      ([resourceId, amount]) => (game.stock[resourceId] ?? 0) < amount,
                    )
                    const missingIds = missing.map(
                      ([resourceId]) => `missing-${structure.id}-${resourceId}`,
                    )

                    return (
                      <Card
                        key={structure.id}
                        className={styles.structureCard}
                        data-testid={`build-card-${structure.id}`}
                      >
                        <Button
                          data-testid={`build-${structure.id}`}
                          variant="secondary"
                          className={[
                            styles.buildButton,
                            placing === structure.id && styles.buildButtonActive,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={missing.length > 0}
                          aria-describedby={
                            missingIds.length > 0 ? missingIds.join(' ') : undefined
                          }
                          onClick={() => {
                            beginPlacement(structure.id)
                            setIsOpen(false)
                          }}
                        >
                          <span className={[styles.preview, styles[`tier${level}`]].join(' ')}>
                            <Icon name="box" size={38} />
                            <span className={styles.plus}>
                              <Icon name="plus" size={16} />
                            </span>
                          </span>
                          <span className={styles.structureName}>{t(structure.name)}</span>
                        </Button>
                        <p className={styles.cost}>
                          {costs.map(([resourceId, amount]) => {
                            const resource = config.resources.find(({ id }) => id === resourceId)
                            return (
                              <span key={resourceId} className={styles.costItem}>
                                <Icon name={(resource?.icon ?? 'box') as IconName} size={16} />
                                <strong>{amount}</strong> {t(resource?.name) || resourceId}
                              </span>
                            )
                          })}
                        </p>
                        {missing.map(([resourceId, amount]) => {
                          const resource = config.resources.find(({ id }) => id === resourceId)
                          const amountMissing = amount - (game.stock[resourceId] ?? 0)
                          return (
                            <p
                              key={resourceId}
                              id={`missing-${structure.id}-${resourceId}`}
                              className={styles.missing}
                              data-testid={`missing-${structure.id}-${resourceId}`}
                            >
                              {t(strings.missing)} {amountMissing} {t(resource?.name) || resourceId}
                            </p>
                          )
                        })}
                        <details className={styles.science}>
                          <summary>
                            <Icon name="chevron" size={16} />
                            {t(strings.scienceFacts)}
                          </summary>
                          <p>{t(structure.explain)}</p>
                          {structure.source && (
                            <a
                              className={styles.sourceLink}
                              href={structure.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {structure.source.label}
                            </a>
                          )}
                        </details>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </Modal>
      <UpgradePanel />
    </>
  )
}
