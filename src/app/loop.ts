// Owner: Breno. Real-time driver: advances the store every 250 ms of real time.
// The engine itself has no clock (constitution VI).
import { useGameStore } from './store'

const STEP_MS = 250

export function startLoop(): () => void {
  let last = performance.now()
  const id = setInterval(() => {
    const now = performance.now()
    useGameStore.getState().advance((now - last) / 1000)
    last = now
  }, STEP_MS)
  return () => clearInterval(id)
}
