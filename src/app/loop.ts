// Owner: Breno. Real-time driver: advances the store every 250 ms of real time.
// The engine itself has no clock (constitution VI).
import { useGameStore } from './store'

const STEP_MS = 250

/**
 * Longest real time one loop call may pass on. Browsers slow timers down in a hidden tab (down
 * to one call a minute), and without a cap the game would jump minutes ahead at once, so the
 * crew could die without a visible warning (constitution VII). With the cap a hidden tab
 * barely moves, and the game goes on where the player left it.
 */
export const MAX_REAL_STEP_SECONDS = 1

/** Real seconds between two loop calls, never negative and never above the cap. */
export function realStep(lastMs: number, nowMs: number): number {
  return Math.min(MAX_REAL_STEP_SECONDS, Math.max(0, (nowMs - lastMs) / 1000))
}

export function startLoop(): () => void {
  let last = performance.now()
  const id = setInterval(() => {
    const now = performance.now()
    useGameStore.getState().advance(realStep(last, now))
    last = now
  }, STEP_MS)
  return () => clearInterval(id)
}
