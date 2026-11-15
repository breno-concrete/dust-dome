// Owner: Dev B. What this device can play on the title screen.

/** True when the browser can draw the 3D menu. School laptops and old phones may not. */
export function canPlay3d(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** True when the player turned on "reduce motion" in the device settings. */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}
