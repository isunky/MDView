import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocumentOutline } from './DocumentOutline'
import type { MarkdownOutlineItem } from '../domain/markdownOutline'
import { translations } from '../i18n'

describe('DocumentOutline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('distinguishes a single-click jump from a double-click collapse and cancels pending jumps on unmount', () => {
    vi.useFakeTimers()
    const onJump = vi.fn()
    const onToggleBranch = vi.fn()
    const view = render(<DocumentOutline
      items={[
        { id: 'intro', level: 1, text: 'Intro' },
        { id: 'details', level: 2, text: 'Details' },
      ]}
      maxDepth={5}
      onJump={onJump}
      onToggleBranch={onToggleBranch}
      onMaxDepthChange={vi.fn()}
      onClose={vi.fn()}
      t={translations.en}
    />)
    try {
      const heading = screen.getByRole('button', { name: 'Jump to Intro' })
      fireEvent.click(heading, { detail: 1 })
      expect(onJump).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(300))
      expect(onJump).toHaveBeenCalledExactlyOnceWith('intro')

      onJump.mockClear()
      fireEvent.click(heading, { detail: 1 })
      act(() => vi.advanceTimersByTime(100))
      fireEvent.click(heading, { detail: 2 })
      fireEvent.doubleClick(heading, { detail: 2 })
      act(() => vi.advanceTimersByTime(500))
      expect(onToggleBranch).toHaveBeenCalledExactlyOnceWith('intro')
      expect(onJump).not.toHaveBeenCalled()

      fireEvent.click(heading, { detail: 1 })
      view.unmount()
      act(() => vi.advanceTimersByTime(500))
      expect(onJump).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      vi.useRealTimers()
    }
  })

  it('marks the active heading for visual and accessibility state', () => {
    render(
      <DocumentOutline
        items={[
          { id: 'intro', level: 1, text: 'Intro' },
          { id: 'details', level: 2, text: 'Details' },
        ]}
        activeId="details"
        maxDepth={3}
        onJump={vi.fn()}
        onMaxDepthChange={vi.fn()}
        onClose={vi.fn()}
        t={translations.en}
      />,
    )

    const inactiveHeading = screen.getByRole('button', { name: 'Jump to Intro' })
    const activeHeading = screen.getByRole('button', { name: 'Jump to Details' })

    expect(inactiveHeading).not.toHaveClass('active')
    expect(inactiveHeading).not.toHaveAttribute('aria-current')
    expect(activeHeading).toHaveClass('active')
    expect(activeHeading).toHaveAttribute('aria-current', 'location')
    expect(screen.queryByText('2 headings')).not.toBeInTheDocument()
  })

  it('keeps the active heading visible when the current reading heading changes', () => {
    const scrollIntoView = vi.fn()
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView

    try {
      const items: MarkdownOutlineItem[] = [
        { id: 'intro', level: 1, text: 'Intro' },
        { id: 'details', level: 2, text: 'Details' },
      ]
      const props = {
        items,
        maxDepth: 3 as const,
        onJump: vi.fn(),
        onMaxDepthChange: vi.fn(),
        onClose: vi.fn(),
        t: translations.en,
      }
      const { rerender } = render(<DocumentOutline {...props} activeId="intro" />)

      expect(scrollIntoView).toHaveBeenLastCalledWith({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto',
      })

      scrollIntoView.mockClear()
      rerender(<DocumentOutline {...props} activeId="details" />)

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto',
      })
      expect(screen.getByRole('button', { name: 'Jump to Details' })).toHaveAttribute(
        'aria-current',
        'location',
      )
    } finally {
      window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it('changes the maximum outline depth from the header icon', async () => {
    const user = userEvent.setup()
    const onMaxDepthChange = vi.fn()
    render(
      <DocumentOutline
        items={[]}
        maxDepth={3}
        onJump={vi.fn()}
        onMaxDepthChange={onMaxDepthChange}
        onClose={vi.fn()}
        t={translations.en}
      />,
    )

    await user.click(screen.getByLabelText('Set outline depth'))
    expect(screen.getByRole('button', { name: 'Show through heading level 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Show through heading level 4' }))

    expect(onMaxDepthChange).toHaveBeenCalledWith(4)

    await user.click(screen.getByLabelText('Set outline depth'))
    await user.click(screen.getByRole('button', { name: 'Show through heading level 5' }))

    expect(onMaxDepthChange).toHaveBeenCalledWith(5)
  })
})
