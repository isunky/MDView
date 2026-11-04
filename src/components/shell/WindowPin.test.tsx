import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nativeWindowFrame } from '../../platform/windowFrame'
import { WindowPin } from './WindowPin'

const key = 'mdview.windowAlwaysOnTop.v1'

beforeEach(() => localStorage.removeItem(key))

describe('WindowPin', () => {
  it('starts unpinned and remembers successful changes', async () => {
    const setAlwaysOnTop = vi.fn(async () => undefined)
    const frame = { ...nativeWindowFrame, isAlwaysOnTop: vi.fn(async () => false), setAlwaysOnTop }
    render(<WindowPin frame={frame} pinLabel="Pin" unpinLabel="Unpin" />)

    const button = screen.getByRole('button', { name: 'Pin' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unpin' })).toHaveAttribute('aria-pressed', 'true'))
    expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(localStorage.getItem(key)).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }))
    await waitFor(() => expect(localStorage.getItem(key)).toBe('false'))
  })

  it('restores the saved preference', async () => {
    localStorage.setItem(key, 'true')
    const setAlwaysOnTop = vi.fn(async () => undefined)
    const frame = { ...nativeWindowFrame, isAlwaysOnTop: vi.fn(async () => false), setAlwaysOnTop }
    render(<WindowPin frame={frame} pinLabel="Pin" unpinLabel="Unpin" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unpin' })).toBeEnabled())
    expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
  })

  it('keeps the old state and reports a failed change', async () => {
    const onError = vi.fn()
    const frame = { ...nativeWindowFrame, isAlwaysOnTop: vi.fn(async () => false), setAlwaysOnTop: vi.fn().mockRejectedValue(new Error('denied')) }
    render(<WindowPin frame={frame} pinLabel="Pin" unpinLabel="Unpin" onError={onError} />)
    const button = screen.getByRole('button', { name: 'Pin' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem(key)).toBeNull()
  })
})
