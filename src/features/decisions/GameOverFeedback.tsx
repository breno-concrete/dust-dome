// Owner: Dev B. Commander Vega's advice on the game over screen: what to try next time.
// Shown only after a loss. The EndScreen (area data/) mounts it; see the contract change request.
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Icon } from '../../ui-kit/Icon'
import { useT } from '../../ui-kit/i18n'
import { buildGameOverFeedback } from './feedback'
import styles from './Panel.module.css'

const strings = {
  commander: { en: 'Commander Vega', pt: 'Comandante Vega' },
  title: { en: 'My tips for the next try', pt: 'Minhas dicas para a próxima tentativa' },
  intro: {
    en: "Don't give up, cadet! Every explorer learns from a hard day. I read the mission log, and this is what I would change:",
    pt: 'Não desista, cadete! Todo explorador aprende com um dia difícil. Eu li o diário da missão, e é isso que eu mudaria:',
  },
}

export function GameOverFeedback() {
  const game = useGameStore((s) => s.game)
  const t = useT()
  const feedback = game ? buildGameOverFeedback(game, config) : null
  if (!feedback) return null

  return (
    <section className={styles.vegaAdvice} aria-label={t(strings.commander)}>
      <h2>
        <Icon name="astronaut" size={22} /> {t(strings.title)}
      </h2>
      <p className={styles.vegaAdviceIntro}>{t(strings.intro)}</p>
      <ul className={styles.vegaAdviceList}>
        {feedback.tips.map((tip) => (
          <li key={tip.id} data-testid={`tip-${tip.id}`}>
            {t(tip.text)}
          </li>
        ))}
      </ul>
    </section>
  )
}
