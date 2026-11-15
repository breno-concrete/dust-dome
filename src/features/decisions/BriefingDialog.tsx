// Owner: Dev B. Commander briefing at the start of every season; the game is
// paused while it is open (constitution II.12). The texts come from narrator.json.
import { seasonDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { Icon } from '../../ui-kit/Icon'
import { Modal } from '../../ui-kit/Modal'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { RadiationAlarmModal } from './RadiationAlarmModal'

const strings = {
  commander: { en: 'Commander Vega', pt: 'Comandante Vega' },
  go: { en: 'Start the season', pt: 'Começar a estação' },
  year: { en: 'Year', pt: 'Ano' },
}

export function BriefingDialog() {
  const briefing = useGameStore((s) => s.game?.briefing)
  const dismiss = useGameStore((s) => s.dismissBriefing)
  const t = useT()
  // The radiation alarm lives here because this component is already mounted by the app shell.
  if (!briefing) return <RadiationAlarmModal />
  const season = seasonDef(briefing.season)
  const text = config.narrator.briefings[String(briefing.cycle)]?.[briefing.season]

  return (
    <Modal
      isOpen
      tone="light"
      title={`${t(strings.year)} ${briefing.cycle} · ${season ? t(season.name) : ''}`}
      footer={
        <Button className={styles.briefingButton} onClick={dismiss}>
          {t(strings.go)}
        </Button>
      }
    >
      <div className={styles.commander}>
        <span className={styles.portrait}>
          <Icon name="astronaut" size={34} />
        </span>
        <div>
          <strong>{t(strings.commander)}</strong>
          <p>{text ? t(text.text) : season ? t(season.explain) : ''}</p>
        </div>
      </div>
      {text?.warning && (
        <p className={styles.briefingWarning} role="alert" data-testid="briefing-warning">
          <Icon name="alert" size={22} />
          <span>{t(text.warning)}</span>
        </p>
      )}
    </Modal>
  )
}
