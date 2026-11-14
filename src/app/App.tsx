// Owner: Breno. Built once; every area already has its slot:
//   scene layer (Dev C) behind, UI layer (Dev B) on top, QTE overlay (Dev C).
import { lazy, Suspense, useEffect } from 'react'
import { BriefingDialog } from '../features/decisions/BriefingDialog'
import { BuildMenu } from '../features/decisions/BuildMenu'
import { PowerPanel } from '../features/decisions/PowerPanel'
import { EndScreen } from '../features/end/EndScreen'
import { Hud } from '../features/hud/Hud'
import { RepairQte } from '../features/repair/RepairQte'
import { SourcesScreen } from '../features/sources/SourcesScreen'
import { TitleScreen } from '../features/title/TitleScreen'
import styles from './App.module.css'
import { startLoop } from './loop'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { useGameStore } from './store'

// three.js is heavy: load it only when the mission starts.
const Scene = lazy(() => import('../features/scene/Scene'))

export default function App() {
  const screen = useGameStore((s) => s.screen)

  useEffect(() => startLoop(), [])

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
            <RepairQte />
          </div>
        </div>
      )
    case 'end':
      return <EndScreen />
    case 'sources':
      return <SourcesScreen />
  }
}
