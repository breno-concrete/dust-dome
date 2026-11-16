// Owner: Breno. Built once; every area already has its slot:
//   scene layer (Dev C) behind, UI layer (Dev B) on top, QTE overlay (Dev C).
import { lazy, Suspense, useEffect } from 'react'
import { BriefingDialog } from '../features/decisions/BriefingDialog'
import { BuildMenu } from '../features/decisions/BuildMenu'
import { PowerPanel } from '../features/decisions/PowerPanel'
import { RadiationAlarmModal } from '../features/decisions/RadiationAlarmModal'
import { VegaNotice } from '../features/decisions/VegaNotice'
import { EndScreen } from '../features/end/EndScreen'
import { Hud } from '../features/hud/Hud'
import { RepairQte } from '../features/repair/RepairQte'
import { SourcesScreen } from '../features/sources/SourcesScreen'
import { TitleScreen } from '../features/title/TitleScreen'
import { useT } from '../ui-kit/i18n'
import styles from './App.module.css'
import { startLoop } from './loop'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { useGameStore } from './store'

const portraitStrings = {
  title: {
    en: 'Rotate to landscape',
    pt: 'Gire para a horizontal',
  },
  message: {
    en: 'Rotate your phone to landscape to command the outpost.',
    pt: 'Gire seu celular para a horizontal para comandar a base.',
  },
}

function PortraitOverlay() {
  const t = useT()

  return (
    <div className={styles.portraitOverlay} data-testid="portrait-overlay">
      <div className={styles.portraitCard}>
        <svg
          className={styles.portraitIcon}
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="20" y="10" width="24" height="44" rx="4" />
          <line x1="29" y1="48" x2="35" y2="48" />
          <path d="M12 24a18 18 0 0 1 6-10" />
          <polyline points="10 18 12 25 18 22" />
          <path d="M52 40a18 18 0 0 1-6 10" />
          <polyline points="54 46 52 39 46 42" />
        </svg>
        <p className={styles.portraitTitle}>{t(portraitStrings.title)}</p>
        <p className={styles.portraitMessage}>{t(portraitStrings.message)}</p>
      </div>
    </div>
  )
}

// three.js is heavy: load it only when the mission starts.
const Scene = lazy(() => import('../features/scene/Scene'))

export default function App() {
  const screen = useGameStore((s) => s.screen)

  useEffect(() => startLoop(), [])

  const content = (() => {
    switch (screen) {
      case 'title':
        return <TitleScreen />
      case 'game':
        return (
          <div className={styles.stage}>
            <div className={styles.sceneLayer}>
              {/* If WebGL fails, the game stays playable with the 2D UI alone. */}
              <SceneErrorBoundary>
                <Suspense fallback={null}>
                  <Scene />
                </Suspense>
              </SceneErrorBoundary>
            </div>
            <div className={styles.uiLayer}>
              <Hud />
              <BuildMenu />
              <PowerPanel />
              <BriefingDialog />
              {/* The commander announces losses and explains the exposure limit (II.9, II.12). */}
              <VegaNotice />
              {/* Mounted by the shell so it shows on top of any panel or briefing. */}
              <RadiationAlarmModal />
              <RepairQte />
            </div>
          </div>
        )
      case 'end':
        return <EndScreen />
      case 'sources':
        return <SourcesScreen />
    }
  })()

  return (
    <>
      {content}
      <PortraitOverlay />
    </>
  )
}
