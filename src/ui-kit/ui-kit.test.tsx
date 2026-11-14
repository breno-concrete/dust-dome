// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Card } from './Card'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { ResourceBar } from './ResourceBar'

describe('UI Kit Components', () => {
  afterEach(cleanup)

  describe('Button', () => {
    it('renders with text and triggers click event', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click Me</Button>)
      const btn = screen.getByRole('button', { name: 'Click Me' })
      expect(btn).toBeDefined()
      await userEvent.click(btn)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger click when disabled', async () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      const btn = screen.getByRole('button', { name: 'Disabled' })
      expect(btn).toBeDefined()
      await userEvent.click(btn)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('renders icon when provided', () => {
      render(
        <Button icon={<Icon name="play" data-testid="play-icon" />}>
          Play
        </Button>,
      )
      expect(screen.getByTestId('play-icon')).toBeDefined()
    })
  })

  describe('ResourceBar', () => {
    it('renders label, current stock and target values', () => {
      render(
        <ResourceBar
          id="oxygen"
          label="Oxygen"
          current={12}
          target={16}
          data-testid="res-bar"
        />,
      )
      const bar = screen.getByTestId('res-bar')
      expect(bar.textContent).toContain('Oxygen')
      expect(bar.textContent).toContain('12')
      expect(bar.textContent).toContain('/ 16 U')
    })

    it('shows alert badge and low styling when isLow is true', () => {
      render(
        <ResourceBar
          id="water"
          label="Water"
          current={3}
          target={32}
          isLow={true}
          data-testid="water-bar"
        />,
      )
      const bar = screen.getByTestId('water-bar')
      expect(bar.className).toContain('low')
      expect(bar.querySelector('[title="Low reserve warning!"]')).toBeDefined()
    })
  })

  describe('Card', () => {
    it('renders title, badge and children', () => {
      render(
        <Card title="Habitat" badge="Level 1">
          Card Body Text
        </Card>,
      )
      expect(screen.getByText('Habitat')).toBeDefined()
      expect(screen.getByText('Level 1')).toBeDefined()
      expect(screen.getByText('Card Body Text')).toBeDefined()
    })
  })

  describe('Modal', () => {
    it('renders dialog when isOpen is true', () => {
      render(
        <Modal isOpen={true} title="Emergency Alert">
          Radiation warning active!
        </Modal>,
      )
      expect(screen.getByRole('dialog', { name: 'Emergency Alert' })).toBeDefined()
      expect(screen.getByText('Radiation warning active!')).toBeDefined()
    })

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} title="Hidden Modal">
          Content
        </Modal>,
      )
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('calls onClose when close button is clicked', async () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen={true} title="Test Modal" onClose={handleClose}>
          Content
        </Modal>,
      )
      const closeBtn = screen.getByRole('button', { name: 'Close dialog' })
      await userEvent.click(closeBtn)
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Icon', () => {
    it('renders SVG for requested icon', () => {
      const { container } = render(<Icon name="power" />)
      expect(container.querySelector('svg')).toBeDefined()
    })
  })
})
