// Owner: Dev A. Mission result + debrief (constitution VII, II.12): what happened
// cycle by cycle, why each loss happened, the real science behind it.
// TODO(Dev A, US4): debrief from game.log causes + texts + sources.
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'

const strings = {
  won: { en: 'The base is ready for the colonists!', pt: 'A base está pronta para os colonos!' },
  lost: { en: 'The mission had to end.', pt: 'A missão precisou terminar.' },
  again: { en: 'Try another strategy', pt: 'Tentar outra estratégia' },
}

export function EndScreen() {
  const game = useGameStore((s) => s.game)
  const goTo = useGameStore((s) => s.goTo)
  const t = useT()
  if (!game) return null

  return (
    <main className="screen">
      <h1>{t(game.status === 'won' ? strings.won : strings.lost)}</h1>
      {game.lostReason && <p>{game.lostReason}</p>}
      <Button onClick={() => goTo('title')}>{t(strings.again)}</Button>
    </main>
  )
}
