// Owner: Dev B. Inline SVG icons for resources, vitals, crew and controls.
// Icon paths sourced from the Figma Make prototype ("Menu para Base Espacial.zip") and adapted
// to the game's resource and status vocabulary.
import type { SVGProps } from 'react'

export type IconName =
  | 'oxygen'
  | 'water'
  | 'food'
  | 'power'
  | 'hematite'
  | 'regolith'
  | 'iron'
  | 'steel'
  | 'repair_parts'
  | 'astronaut'
  | 'radiation'
  | 'alert'
  | 'pause'
  | 'play'
  | 'speed2'
  | 'speed4'
  | 'build'
  | 'box'
  | 'chevron'
  | 'layers'
  | 'wrench'
  | 'close'
  | 'plus'
  | 'check'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number | string
}

export function Icon({ name, size = 20, style, ...rest }: IconProps) {
  const commonProps: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    style: { display: 'inline-block', verticalAlign: 'middle', ...style },
    ...rest,
  }

  switch (name) {
    // === Vitals ===
    // Oxygen: two linked molecular orbs (O₂ molecule feel) — from Figma prototype
    case 'oxygen':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="9" r="5" />
          <circle cx="17" cy="16" r="4" />
          <path d="m11 13 3 1" />
        </svg>
      )
    // Water: raindrop silhouette — from Figma prototype
    case 'water':
      return (
        <svg {...commonProps}>
          <path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12ZM8 15a4 4 0 0 0 3 4" />
        </svg>
      )
    // Food: leaf/plant shape — from Figma prototype
    case 'food':
      return (
        <svg {...commonProps}>
          <path d="M19 4C8 3 4 8 6 14s11 7 13-10Z" />
          <path d="m5 20 9-10M10 14l-1-4" />
        </svg>
      )

    // === Power ===
    // Power/energy: lightning bolt — from Figma prototype
    case 'power':
      return (
        <svg {...commonProps}>
          <path d="m14 2-9 12h7l-2 8 9-12h-7Z" />
        </svg>
      )

    // === Materials / Wallet ===
    // Hematite: angular mineral crystal with facet lines — from Figma prototype
    case 'hematite':
      return (
        <svg {...commonProps}>
          <path d="m7 4 9-1 6 10-7 8-12-5Z" />
          <path d="m7 4 4 9 5-10M3 16l8-3 4 8m-4-8 11 0" />
        </svg>
      )
    // Regolith: stacked soil/sediment layers — from Figma prototype
    case 'regolith':
      return (
        <svg {...commonProps}>
          <path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      )
    // Iron: open hexagonal ingot with centre spine — from Figma prototype
    case 'iron':
      return (
        <svg {...commonProps}>
          <path d="m5 6 7-3 7 3v12l-7 3-7-3Z" />
          <path d="m5 6 7 3 7-3M12 9v12" />
        </svg>
      )
    // Steel: isometric box with lid lines — heavier box conveys processed metal
    case 'steel':
      return (
        <svg {...commonProps}>
          <path d="m3 6 9-4 9 4v12l-9 4-9-4ZM3 6l9 4 9-4M12 10v12m-5-18 10 4" />
        </svg>
      )
    // Repair parts: wrench — from Figma prototype
    case 'repair_parts':
      return (
        <svg {...commonProps}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
        </svg>
      )

    // === Crew ===
    // Astronaut: crew/group icon with suit collar detail — adapted from Figma prototype crew icon
    case 'astronaut':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 7m2 4a6 6 0 0 1 3 6" />
        </svg>
      )
    // Radiation: hazard symbol — 8-ray starburst around core circle
    case 'radiation':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 22v-4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83" />
        </svg>
      )
    // Alert: warning triangle with exclamation mark
    case 'alert':
      return (
        <svg {...commonProps}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )

    // === Time controls ===
    // Pause: two vertical bars with heavier weight — from Figma prototype
    case 'pause':
      return (
        <svg {...commonProps}>
          <path d="M8 5v14M16 5v14" strokeWidth={3} />
        </svg>
      )
    // Play: filled triangle — from Figma prototype
    case 'play':
      return (
        <svg {...commonProps}>
          <path d="m9 5 10 7-10 7Z" />
        </svg>
      )
    // Speed ×2: two forward chevrons — adapted from Figma prototype "forward" icon
    case 'speed2':
      return (
        <svg {...commonProps}>
          <path d="m4 6 8 6-8 6ZM13 6l8 6-8 6Z" />
        </svg>
      )
    // Speed ×4: two chevrons + right edge bar for ×4 feel
    case 'speed4':
      return (
        <svg {...commonProps}>
          <path d="m2 6 7 6-7 6ZM10 6l7 6-7 6Z" />
          <line x1="20" y1="6" x2="20" y2="18" strokeWidth={2.5} />
        </svg>
      )
    case 'build':
      return (
        <svg {...commonProps}>
          <path d="m14 5 5 5M10 3l3-1 9 9-4 4-9-9ZM3 20l10-10 3 3L6 23Z" />
        </svg>
      )
    case 'box':
      return (
        <svg {...commonProps}>
          <path d="m3 6 9-4 9 4v12l-9 4-9-4ZM3 6l9 4 9-4M12 10v12m-5-18 10 4" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...commonProps}>
          <path d="m9 5 7 7-7 7" />
        </svg>
      )
    case 'layers':
      return (
        <svg {...commonProps}>
          <path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      )
    case 'wrench':
      return (
        <svg {...commonProps}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
        </svg>
      )
    // Close: X cross — from Figma prototype
    case 'close':
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12M6 18 18 6" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...commonProps}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'check':
      return (
        <svg {...commonProps}>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )
    default:
      return null
  }
}
