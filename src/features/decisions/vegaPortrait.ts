// Owner: shared (UI + Scene). Pure mapping from game context (season briefings,
// radiation alerts, mission outcome) to Commander Vega portrait moods and static-frame animations.
import type { SeasonId } from '../../engine/types'

export const VEGA_MOODS = [
  'neutral',
  'welcome',
  'warning',
  'caring',
  'celebrating',
  'alert',
] as const

export type VegaMood = (typeof VEGA_MOODS)[number]

const MOOD_FRAMES: Record<VegaMood, readonly string[]> = {
  neutral: ['/narrator/vega-neutral.png'],
  welcome: [
    '/narrator/vega-welcome-mid1.png',
    '/narrator/vega-welcome-mid2.png',
    '/narrator/vega-welcome.png',
  ],
  warning: ['/narrator/vega-warning-mid.png', '/narrator/vega-warning.png'],
  caring: ['/narrator/vega-caring-mid.png', '/narrator/vega-caring.png'],
  celebrating: ['/narrator/vega-celebrating-mid.png', '/narrator/vega-celebrating.png'],
  alert: ['/narrator/vega-alert-mid.png', '/narrator/vega-alert.png'],
}

export function moodForBriefing(cycle: number, season: SeasonId, hasWarning: boolean): VegaMood {
  if (cycle >= 3 && season === 'summer') return 'alert'
  if (hasWarning) return 'warning'
  if (season === 'winter' && cycle >= 3) return 'caring'
  if (season === 'winter') return 'warning'
  if (cycle === 2 && season === 'spring') return 'celebrating'
  if (cycle === 1 && season === 'spring') return 'welcome'
  if (cycle === 4 && season === 'spring') return 'welcome'
  if (cycle >= 2 && (season === 'summer' || season === 'autumn')) return 'warning'
  return 'neutral'
}

export function framesForMood(mood: VegaMood): readonly string[] {
  return MOOD_FRAMES[mood]
}
