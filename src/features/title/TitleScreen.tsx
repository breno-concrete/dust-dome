// Owner: Dev B. Title screen: play, data sources, language toggle.
// "Play game" plays the landing (MenuScene) and only then starts the game. Where the
// 3D menu cannot play (no WebGL, reduced motion, a crash), the mission starts right away.
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useGameStore } from '../../app/store'
import { Button } from '../../ui-kit/Button'
import { Icon } from '../../ui-kit/Icon'
import { useLang, useT } from '../../ui-kit/i18n'
import logo from './logo.png'
import planetPicture from './planet.webp'
import { canPlay3d, prefersReducedMotion } from './motion'
import styles from './TitleScreen.module.css'
import { TRANSITION_SECONDS } from './transition'

// three.js is heavy: the buttons show first, the planet arrives when it is ready.
const MenuScene = lazy(() => import('./MenuScene'))

/** If the landing never reports back (lost WebGL context, frozen tab), start anyway. */
const STALL_MARGIN_SECONDS = 4

const strings = {
  logo: {
    en: 'Dust & Dome: Mars Survival Simulator',
    pt: 'Dust & Dome: simulador de sobrevivência em Marte',
  },
  start: { en: 'Play game', pt: 'Jogar' },
  sources: { en: 'Where does the science come from?', pt: 'De onde vem a ciência?' },
  // The button names the language the menu is in now.
  language: { en: 'English', pt: 'Português' },
  landing: { en: 'Landing on Mars…', pt: 'Pousando em Marte…' },
  skip: { en: 'Skip', pt: 'Pular' },
}

// The sky: the same stars on every visit. One in three is a four-point sparkle that twinkles.
const STARS = (() => {
  let seed = 11
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: 42 }, (_, i) => {
    const sparkle = i % 3 === 0
    return {
      sparkle,
      style: {
        left: `${(random() * 100).toFixed(1)}%`,
        top: `${(random() * 100).toFixed(1)}%`,
        width: sparkle ? 10 + Math.round(random() * 8) : 2 + Math.round(random() * 2),
        animationDelay: `${(random() * -6).toFixed(1)}s`,
      } satisfies CSSProperties,
    }
  })
})()

function GlobeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z" />
    </svg>
  )
}

/** Keeps the menu usable when the 3D scene fails to load or crashes. */
class SceneBoundary extends Component<
  { fallback: ReactNode; onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function TitleScreen() {
  const start = useGameStore((s) => s.start)
  const goTo = useGameStore((s) => s.goTo)
  const { lang, setLang } = useLang()
  const t = useT()

  const [has3d] = useState(canPlay3d)
  const [sceneFailed, setSceneFailed] = useState(false)
  // three.js takes a moment to arrive: until the 3D planet draws, its picture holds its place.
  const [sceneReady, setSceneReady] = useState(false)
  const [launching, setLaunching] = useState(false)
  const started = useRef(false)

  // The landing, the Skip button and the stall timer can all get here: start only once.
  const beginMission = useCallback(() => {
    if (started.current) return
    started.current = true
    start()
  }, [start])

  useEffect(() => {
    if (!launching) return
    const stall = setTimeout(beginMission, (TRANSITION_SECONDS + STALL_MARGIN_SECONDS) * 1000)
    return () => clearTimeout(stall)
  }, [launching, beginMission])

  const still = prefersReducedMotion()
  const show3d = has3d && !sceneFailed

  const onStart = () => {
    if (show3d && !still) setLaunching(true)
    else beginMission()
  }

  const onSceneError = () => {
    setSceneFailed(true)
    if (launching) beginMission()
  }

  const placeholderHidden = show3d && sceneReady

  return (
    <main className={styles.root}>
      <div className={styles.stars} aria-hidden="true">
        {STARS.map((star, i) => (
          <span key={i} className={star.sparkle ? styles.sparkle : styles.dot} style={star.style} />
        ))}
      </div>

      <img
        className={placeholderHidden ? `${styles.planet} ${styles.handedOver}` : styles.planet}
        src={planetPicture}
        alt=""
        width={1024}
        height={1024}
        fetchPriority="high"
        draggable={false}
        data-testid="planet-placeholder"
        data-hidden={String(placeholderHidden)}
      />

      {show3d && (
        <SceneBoundary fallback={null} onError={onSceneError}>
          <Suspense fallback={null}>
            <MenuScene
              launching={launching}
              still={still}
              onReady={() => setSceneReady(true)}
              onLanded={beginMission}
            />
          </Suspense>
        </SceneBoundary>
      )}

      <div className={styles.content}>
        <h1 className={launching ? `${styles.logo} ${styles.leaving}` : styles.logo}>
          <img src={logo} alt={t(strings.logo)} width={621} height={317} />
        </h1>

        {launching ? (
          <div className={styles.landing}>
            <p className={styles.landingText} role="status">
              {t(strings.landing)}
            </p>
            <Button className={styles.skip} variant="secondary" autoFocus onClick={beginMission}>
              {t(strings.skip)}
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.menu}>
              <Button
                className={styles.play}
                icon={<Icon name="play" size={22} fill="currentColor" />}
                onClick={onStart}
              >
                {t(strings.start)}
              </Button>
              <Button
                className={styles.sources}
                variant="secondary"
                onClick={() => goTo('sources')}
              >
                {t(strings.sources)}
              </Button>
            </div>
            <Button
              className={styles.language}
              variant="secondary"
              icon={<GlobeIcon />}
              onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
            >
              {t(strings.language)}
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
