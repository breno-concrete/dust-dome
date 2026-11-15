// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { RepairQte } from './RepairQte'

describe('RepairQte', () => {
  beforeEach(() => act(() => useGameStore.getState().start(42)))
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    cleanup()
  })

  it('clicking every bolt finishes the QTE with success', async () => {
    act(() => useGameStore.getState().openQte('s1'))
    const finishSpy = vi.spyOn(useGameStore.getState(), 'finishQte')
    render(<RepairQte />)
    for (let i = 0; i < config.mission.repair.qteBolts; i++) {
      await userEvent.click(screen.getByRole('button', { name: /Bolt/i }))
    }
    expect(finishSpy).toHaveBeenCalledWith(true)
    expect(useGameStore.getState().qteFor).toBeNull()
  })

  it('fails when qteSeconds run out before every bolt is clicked', () => {
    vi.useFakeTimers()
    act(() => useGameStore.getState().openQte('s1'))
    const finishSpy = vi.spyOn(useGameStore.getState(), 'finishQte')
    render(<RepairQte />)

    act(() => {
      vi.advanceTimersByTime(config.mission.repair.qteSeconds * 1000 + 100)
    })

    expect(finishSpy).toHaveBeenCalledWith(false)
    expect(useGameStore.getState().qteFor).toBeNull()
  })

  it('shows one bolt at a time at a random spot on the structure', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.85)
      .mockReturnValueOnce(0.9)

    act(() => useGameStore.getState().openQte('s1'))
    render(<RepairQte />)

    const firstBolts = screen.getAllByRole('button', { name: /Bolt/i })
    expect(firstBolts).toHaveLength(1)
    const firstLeft = parseFloat(firstBolts[0].style.left)
    const firstTop = parseFloat(firstBolts[0].style.top)
    expect(firstLeft).toBeGreaterThanOrEqual(15)
    expect(firstLeft).toBeLessThanOrEqual(85)
    expect(firstTop).toBeGreaterThanOrEqual(15)
    expect(firstTop).toBeLessThanOrEqual(85)

    fireEvent.click(firstBolts[0])

    const nextBolts = screen.getAllByRole('button', { name: /Bolt/i })
    expect(nextBolts).toHaveLength(1)
    const nextLeft = parseFloat(nextBolts[0].style.left)
    const nextTop = parseFloat(nextBolts[0].style.top)
    expect(nextLeft).toBeGreaterThanOrEqual(15)
    expect(nextLeft).toBeLessThanOrEqual(85)
    expect(nextTop).toBeGreaterThanOrEqual(15)
    expect(nextTop).toBeLessThanOrEqual(85)
    expect([nextLeft, nextTop]).not.toEqual([firstLeft, firstTop])
  })

  it('displays and updates the remaining countdown timer', () => {
    vi.useFakeTimers()
    act(() => useGameStore.getState().openQte('s1'))
    render(<RepairQte />)

    const timerBar = screen.getByRole('progressbar')
    expect(timerBar).toBeTruthy()
    expect(screen.getByText(new RegExp(`${config.mission.repair.qteSeconds}`))).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    const expectedLeft = config.mission.repair.qteSeconds - 2
    expect(screen.getByText(new RegExp(`${expectedLeft}`))).toBeTruthy()
  })

  it('clicking Give up ends the QTE with failure', () => {
    act(() => useGameStore.getState().openQte('s1'))
    const finishSpy = vi.spyOn(useGameStore.getState(), 'finishQte')
    render(<RepairQte />)

    fireEvent.click(screen.getByRole('button', { name: /Give up/i }))
    expect(finishSpy).toHaveBeenCalledWith(false)
    expect(useGameStore.getState().qteFor).toBeNull()
  })
})
