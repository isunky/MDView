import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AppWindowFrame } from '../platform/windowFrame'
import { WindowControls } from './WindowControls'

describe('WindowControls', () => {
  it('runs the native window actions and reflects the maximized state', async () => {
    const user = userEvent.setup()
    let onMaximized: ((maximized: boolean) => void) | undefined
    const unsubscribe = vi.fn()
    const frame = createWindowFrame({
      subscribeMaximized: vi.fn(async (listener) => {
        onMaximized = listener
        return unsubscribe
      }),
    })

    const { unmount } = render(<WindowControls
      frame={frame}
      labels={{ close: 'Close', maximize: 'Maximize', minimize: 'Minimize', restore: 'Restore' }}
    />)

    await user.click(screen.getByRole('button', { name: 'Minimize' }))
    await user.click(screen.getByRole('button', { name: 'Maximize' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(frame.minimize).toHaveBeenCalledOnce()
    expect(frame.toggleMaximize).toHaveBeenCalledOnce()
    expect(frame.close).toHaveBeenCalledOnce()

    act(() => onMaximized?.(true))
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()

    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})

function createWindowFrame(overrides: Partial<AppWindowFrame> = {}): AppWindowFrame {
  return {
    kind: 'windows-custom',
    close: vi.fn(async () => undefined),
    minimize: vi.fn(async () => undefined),
    startDragging: vi.fn(async () => undefined),
    toggleMaximize: vi.fn(async () => undefined),
    subscribeMaximized: vi.fn(async () => () => undefined),
    ...overrides,
  }
}
