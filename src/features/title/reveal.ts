// Owner: Dev B. The little base on the menu planet is not there from the start: the planet
// shows first, already textured, and the pieces pop in one by one. That gives three.js time
// to arrive and makes the screen feel alive. Pure timing, so it is easy to test.

/** Seconds, counted from the first frame of the 3D planet, before the first piece appears. */
const FIRST_AT = 0.5
/** Seconds between the start of one piece and the start of the next. */
const GAP = 0.32
/** Seconds one piece takes to pop in. */
const POP_SECONDS = 0.55

/** How far piece `index` (0 is the first) is into its pop, from 0 to 1. */
export function revealProgress(seconds: number, index: number): number {
  const into = (seconds - FIRST_AT - index * GAP) / POP_SECONDS
  // The tolerance keeps "exactly on time" from landing at 0.9999999 after the float math.
  return into >= 1 - 1e-9 ? 1 : Math.max(0, into)
}

/** Seconds from the first frame until all `count` pieces are in place. */
export function revealSeconds(count: number): number {
  return FIRST_AT + (count - 1) * GAP + POP_SECONDS
}

/** Size while popping in, 0 to 1 with a small overshoot: it lands with a bounce. */
export function popScale(progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  const c1 = 1.70158
  const c3 = c1 + 1
  const back = progress - 1
  return 1 + c3 * back ** 3 + c1 * back ** 2
}
