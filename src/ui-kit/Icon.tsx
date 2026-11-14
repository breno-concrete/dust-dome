// Owner: Dev B. Inline SVG icons for resources, vitals, crew and controls.
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
  | 'close'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number | string
}

export function Icon({ name, size = 20, style, ...rest }: IconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': 'true',
    style: { display: 'inline-block', verticalAlign: 'middle', ...style },
    ...rest,
  }

  switch (name) {
    case 'oxygen':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      )
    case 'water':
      return (
        <svg {...commonProps}>
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      )
    case 'food':
      return (
        <svg {...commonProps}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      )
    case 'power':
      return (
        <svg {...commonProps}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'hematite':
      return (
        <svg {...commonProps}>
          <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
        </svg>
      )
    case 'regolith':
      return (
        <svg {...commonProps}>
          <path d="M3 20h18L17 9l-5 4-4-5-5 12z" />
        </svg>
      )
    case 'iron':
      return (
        <svg {...commonProps}>
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <line x1="7" y1="7" x2="7" y2="17" />
          <line x1="17" y1="7" x2="17" y2="17" />
        </svg>
      )
    case 'steel':
      return (
        <svg {...commonProps}>
          <path d="M4 6h16v3H4zM7 9v6M17 9v6M4 15h16v3H4z" />
        </svg>
      )
    case 'repair_parts':
      return (
        <svg {...commonProps}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case 'astronaut':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="7" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          <path d="M9 11h6" />
        </svg>
      )
    case 'radiation':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 22v-4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...commonProps}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'pause':
      return (
        <svg {...commonProps}>
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      )
    case 'play':
      return (
        <svg {...commonProps}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )
    case 'speed2':
      return (
        <svg {...commonProps}>
          <polygon points="13 19 22 12 13 5 13 19" />
          <polygon points="2 19 11 12 2 5 2 19" />
        </svg>
      )
    case 'speed4':
      return (
        <svg {...commonProps}>
          <polygon points="11 19 19 12 11 5 11 19" />
          <polygon points="3 19 11 12 3 5 3 19" />
          <line x1="21" y1="5" x2="21" y2="19" />
        </svg>
      )
    case 'close':
      return (
        <svg {...commonProps}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )
    default:
      return null
  }
}
