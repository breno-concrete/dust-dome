// Owner: Dev B. Commander Vega's tutorial. Reading steps are a dialog; "do it" steps are a small
// card, so the player can click on the game while Vega waits. The game stays paused the whole
// time because the first season briefing is still waiting (constitution II.12).
import { useEffect, useState } from 'react'
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { Modal } from '../../ui-kit/Modal'
import { useT } from '../../ui-kit/i18n'
import styles from './Panel.module.css'
import { VegaPortrait } from './VegaPortrait'
import { isStepDone, TUTORIAL_STEPS, useTutorialUi, type StepContext } from './tutorial'

const strings = {
  commander: { en: 'Commander Vega', pt: 'Comandante Vega' },
  title: { en: 'Mission training', pt: 'Treinamento da missão' },
  next: { en: 'Next', pt: 'Próximo' },
  back: { en: 'Back', pt: 'Voltar' },
  start: { en: 'Start', pt: 'Começar' },
  skipTutorial: { en: 'Skip tutorial', pt: 'Pular tutorial' },
  skipStep: { en: 'Skip this step', pt: 'Pular este passo' },
  waiting: { en: 'Waiting for you…', pt: 'Esperando você…' },
}

/** Back goes to the step before, skipping "do it" steps (they would finish again at once). */
function previousReadingStep(from: number): number {
  let i = from - 1
  while (i > 0 && TUTORIAL_STEPS[i]!.kind === 'do') i -= 1
  return i
}

export function TutorialDialog({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [index, setIndex] = useState(0)
  const setHighlight = useTutorialUi((s) => s.setHighlight)

  const placing = useGameStore((s) => s.placing)
  const selectedStructureId = useGameStore((s) => s.selectedStructureId)
  const structures = useGameStore((s) => s.game?.structures)
  const powerModes = useGameStore((s) => s.game?.powerModes)

  // What the base looked like when the tutorial opened, to notice what the player changes.
  const [start] = useState(() => ({
    solarPanels: structures?.filter((s) => s.type === 'solar_panel').length ?? 0,
    powerModes: { ...(powerModes ?? {}) } as StepContext['powerModes'],
  }))
  const ctx: StepContext = {
    placing,
    solarPanels: structures?.filter((s) => s.type === 'solar_panel').length ?? 0,
    solarPanelsAtStart: start.solarPanels,
    selectedStructureId,
    powerModes: powerModes ?? {},
    powerModesAtStart: start.powerModes,
  }

  // A "do it" step ends by itself when the player does what Vega asked.
  let current = index
  while (
    current < TUTORIAL_STEPS.length - 1 &&
    TUTORIAL_STEPS[current]!.check !== undefined &&
    isStepDone(TUTORIAL_STEPS[current]!.check!, ctx)
  ) {
    current += 1
  }
  const step = TUTORIAL_STEPS[current]!
  const isLast = current === TUTORIAL_STEPS.length - 1

  // Point the dock buttons out while a step asks for them, and stop when the tutorial ends.
  useEffect(() => {
    setHighlight(step.highlight ?? null)
    return () => setHighlight(null)
  }, [step, setHighlight])

  const counter = `${current + 1} / ${TUTORIAL_STEPS.length}`
  if (step.kind === 'do') {
    return (
      <aside className={styles.tutorialCard} aria-label={t(strings.commander)}>
        <div className={styles.commander}>
          <div className={styles.tutorialPortrait}>
            <VegaPortrait mood={step.mood} variant="briefing" />
          </div>
          <div className={styles.commanderCopy}>
            <strong>{t(strings.commander)}</strong>
            <p aria-live="polite">{t(step.text)}</p>
            <p className={styles.tutorialWaiting}>
              {t(strings.waiting)} <span>{counter}</span>
            </p>
          </div>
        </div>
        <div className={styles.tutorialActions}>
          <Button variant="secondary" onClick={() => setIndex(current + 1)}>
            {t(strings.skipStep)}
          </Button>
          <Button variant="secondary" onClick={onDone}>
            {t(strings.skipTutorial)}
          </Button>
        </div>
      </aside>
    )
  }

  return (
    <Modal
      isOpen
      tone="light"
      title={t(strings.title)}
      footer={
        <div className={styles.tutorialFooter}>
          <span className={styles.tutorialCounter}>{counter}</span>
          <Button variant="secondary" onClick={onDone}>
            {t(strings.skipTutorial)}
          </Button>
          {current > 0 && (
            <Button variant="secondary" onClick={() => setIndex(previousReadingStep(current))}>
              {t(strings.back)}
            </Button>
          )}
          <Button
            className={styles.briefingButton}
            onClick={isLast ? onDone : () => setIndex(current + 1)}
          >
            {t(isLast ? strings.start : strings.next)}
          </Button>
        </div>
      }
    >
      <div className={styles.commander}>
        <VegaPortrait mood={step.mood} variant="briefing" />
        <div className={styles.commanderCopy}>
          <strong>{t(strings.commander)}</strong>
          <p>{t(step.text)}</p>
        </div>
      </div>
    </Modal>
  )
}
