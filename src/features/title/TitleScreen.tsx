// Owner: Dev B. Title screen: start, data sources, language toggle.
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { useLang, useT } from '../../ui-kit/i18n'

const strings = {
  title: { en: 'Mars Outpost', pt: 'Mars Outpost' },
  tagline: {
    en: 'Four astronauts, four Martian years: build a base where colonists can live.',
    pt: 'Quatro astronautas, quatro anos marcianos: construa uma base onde colonos possam viver.',
  },
  start: { en: 'Start mission', pt: 'Começar missão' },
  sources: { en: 'Where does the science come from?', pt: 'De onde vem a ciência?' },
  language: { en: 'Português', pt: 'English' },
}

export function TitleScreen() {
  const start = useGameStore((s) => s.start)
  const goTo = useGameStore((s) => s.goTo)
  const { lang, setLang } = useLang()
  const t = useT()

  return (
    <main className="screen">
      <h1>{t(strings.title)}</h1>
      <p>{t(strings.tagline)}</p>
      <p>
        <Button onClick={() => start()}>{t(strings.start)}</Button>
      </p>
      <p>
        <Button variant="secondary" onClick={() => goTo('sources')}>
          {t(strings.sources)}
        </Button>{' '}
        <Button variant="secondary" onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}>
          {t(strings.language)}
        </Button>
      </p>
    </main>
  )
}
