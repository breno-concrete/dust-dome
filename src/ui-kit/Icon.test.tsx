// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Icon } from './Icon'

describe('Figma menu icons', () => {
  afterEach(cleanup)

  it.each(['build', 'box', 'chevron', 'layers', 'wrench', 'plus', 'check'] as const)(
    'renders the %s icon as an SVG',
    (name) => {
      const { container } = render(<Icon name={name} />)
      const svg = container.querySelector('svg')

      expect(svg).not.toBeNull()
      expect(svg?.childElementCount).toBeGreaterThan(0)
    },
  )
})
