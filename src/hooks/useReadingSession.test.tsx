import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadReadingSession,
  saveReadingSession,
  type ReadingViewMode,
} from '../domain/readingSessions'
import { useReadingSession } from './useReadingSession'

describe('useReadingSession', () => {
  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('keeps restored preferences until the restored UI state is ready to persist', () => {
    vi.useFakeTimers()
    const path = '/docs/guide.md'
    saveReadingSession(path, {
      scrollTop: 180,
      previewZoom: 1.3,
      viewMode: 'split',
      outlineWidth: 320,
      isOutlineOpen: false,
    })
    const onRestore = vi.fn()
    const previewPanelRef = { current: document.createElement('section') }
    const { rerender } = renderHook(
      (props) => useReadingSession(props),
      {
        initialProps: {
          documentPath: path,
          previewPanelRef,
          onRestore,
          previewZoom: 1,
          viewMode: 'preview' as ReadingViewMode,
          outlineWidth: 260,
          isOutlineOpen: true,
        },
      },
    )

    expect(onRestore).toHaveBeenCalledWith({
      previewZoom: 1.3,
      viewMode: 'split',
      outlineWidth: 320,
      isOutlineOpen: false,
    })

    rerender({
      documentPath: path,
      previewPanelRef,
      onRestore,
      previewZoom: 1.3,
      viewMode: 'split',
      outlineWidth: 320,
      isOutlineOpen: false,
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(loadReadingSession(path)).toMatchObject({
      scrollTop: 180,
      previewZoom: 1.3,
      viewMode: 'split',
      outlineWidth: 320,
      isOutlineOpen: false,
    })
  })
})
