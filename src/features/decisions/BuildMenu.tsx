// Owner: Dev B. Build menu: every structure with its cost and fact sheet.
// Clicking one starts placement; the scene (Dev C) shows where it goes.
// TODO(Dev B): group by level, disable what the player cannot afford, upgrades menu.
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'

const strings = {
  title: { en: 'Build', pt: 'Construir' },
  cancel: { en: 'Cancel', pt: 'Cancelar' },
}

export function BuildMenu() {
  const placing = useGameStore((s) => s.placing)
  const beginPlacement = useGameStore((s) => s.beginPlacement)
  const t = useT()

  return (
    <aside className={styles.build} aria-label={t(strings.title)}>
      <h2>{t(strings.title)}</h2>
      {config.structures.map((s) => (
        <Button
          key={s.id}
          variant={placing === s.id ? 'primary' : 'secondary'}
          title={t(s.explain)}
          onClick={() => beginPlacement(placing === s.id ? null : s.id)}
        >
          {t(s.name)} ·{' '}
          {Object.entries(s.cost)
            .map(([r, n]) => `${n} ${r}`)
            .join(' + ')}
        </Button>
      ))}
      {placing && <Button onClick={() => beginPlacement(null)}>{t(strings.cancel)}</Button>}
    </aside>
  )
}
