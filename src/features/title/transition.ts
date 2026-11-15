// Owner: Dev B. Timeline of the "Start mission" animation, as a pure function of time:
// the camera flies to Mars, a rocket passes by, dust hides the cut to the surface,
// the rocket lands, the screen fades into the game. MenuScene only draws what this says.

/** Which 3D set the camera is in. */
export type TransitionSet = 'space' | 'surface'

export interface TransitionFrame {
  set: TransitionSet
  /** Camera flying from the menu view (0) to the landing site on the planet (1). */
  approach: number
  /** Rocket flying from behind the camera (0) to the planet (1). */
  flyby: number
  /** Dust covering the whole screen, 0–1. It is 1 while the set changes. */
  wash: number
  /** Rocket coming down on the surface: 0 = high above, 1 = on the ground. */
  descent: number
  /** After touching the ground: dust puff and bounce, 0–1. */
  touchdown: number
  /** Final fade into the game, 0–1. */
  fade: number
  done: boolean
}

/** Seconds from the click on "Start mission" to the first frame of the game. */
export const TRANSITION_SECONDS = 6.5

// Seconds since the click. Each pair is [start, end] of one movement.
const APPROACH = [0, 2.8] as const
const FLYBY = [0.1, 2.5] as const
const WASH_IN = [2.2, 2.8] as const
const CUT_TO_SURFACE = 3
const WASH_OUT = [3.2, 3.9] as const
const DESCENT = [3.1, 5.3] as const
const TOUCHDOWN = [5.3, 6] as const
const FADE = [5.9, TRANSITION_SECONDS] as const

/** How far `seconds` is inside [start, end], from 0 to 1. */
function progress(seconds: number, [start, end]: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (seconds - start) / (end - start)))
}

const easeInOut = (p: number) => p * p * (3 - 2 * p)
const easeIn = (p: number) => p * p * p
const easeOut = (p: number) => 1 - (1 - p) * (1 - p)

export function transitionFrame(seconds: number): TransitionFrame {
  const t = Math.min(TRANSITION_SECONDS, Math.max(0, seconds))
  return {
    set: t < CUT_TO_SURFACE ? 'space' : 'surface',
    // Slow start, fast arrival: it feels like falling toward the planet.
    approach: easeIn(progress(t, APPROACH)),
    // The rocket overtakes the slow camera early, then gets small in the distance.
    flyby: easeInOut(progress(t, FLYBY)),
    wash: easeInOut(progress(t, WASH_IN)) * (1 - easeInOut(progress(t, WASH_OUT))),
    // Slows down before the ground, like a real landing burn.
    descent: easeOut(progress(t, DESCENT)),
    touchdown: progress(t, TOUCHDOWN),
    fade: easeInOut(progress(t, FADE)),
    done: t >= TRANSITION_SECONDS,
  }
}
