import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSplitScrollSync } from './useSplitScrollSync'
import { getScrollMaximum, mapEditorScrollToPreview } from '../domain/splitScroll'

describe('useSplitScrollSync', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('synchronizes both directions and stops when disabled', () => {
    const animationFrames = new Map<number, FrameRequestCallback>()
    let nextAnimationFrame = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      nextAnimationFrame += 1
      animationFrames.set(nextAnimationFrame, callback)
      return nextAnimationFrame
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => animationFrames.delete(id))

    const editor = document.createElement('textarea')
    editor.style.lineHeight = '20px'
    Object.defineProperties(editor, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1_200 },
    })
    const previewPanel = document.createElement('section')
    Object.defineProperties(previewPanel, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 2_000 },
    })
    previewPanel.getBoundingClientRect = vi.fn(() => DOMRect.fromRect({ y: 0 }))
    const preview = document.createElement('article')
    const anchor = document.createElement('p')
    anchor.dataset.mdviewSourceStart = '20'
    anchor.getBoundingClientRect = vi.fn(() => DOMRect.fromRect({ y: 400 - previewPanel.scrollTop }))
    preview.append(anchor)

    const editorRef = {
      current: {
        focus: () => undefined,
        getScrollElement: () => editor,
        getSelection: () => ({ start: 0, end: 0 }),
        setSelection: () => undefined,
      },
    }
    const previewPanelRef = { current: previewPanel }
    const previewRef = { current: preview }
    const { result } = renderHook(() => useSplitScrollSync({
      editorRef,
      isSplit: true,
      previewContent: Array.from({ length: 40 }, (_, index) => `Line ${index + 1}`).join('\n'),
      previewPanelRef,
      previewRef,
      previewZoom: 1,
    }))

    expect(result.current.isSplitScrollSyncEnabled).toBe(true)
    expect(getScrollMaximum(previewPanel)).toBe(1_600)
    flushAnimationFrames(animationFrames)
    expect(window.requestAnimationFrame).toHaveBeenCalled()
    const initialAnimationFrameCalls = vi.mocked(window.requestAnimationFrame).mock.calls.length

    act(() => {
      editor.scrollTop = 348
      expect(mapEditorScrollToPreview(editor, previewPanel, 40, 20, 0, [{ sourceLine: 20, previewTop: 400 }])).toBeCloseTo(400)
      editor.dispatchEvent(new Event('scroll'))
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(initialAnimationFrameCalls + 1)
      flushAnimationFrames(animationFrames)
    })
    expect(editor.scrollTop).toBe(348)
    expect(previewPanel.scrollTop).toBeGreaterThan(300)

    act(() => {
      previewPanel.scrollTop = 900
      previewPanel.dispatchEvent(new Event('scroll'))
      flushAnimationFrames(animationFrames)
    })
    expect(editor.scrollTop).toBeGreaterThan(500)

    act(() => result.current.toggleSplitScrollSync())
    const previousPreviewTop = previewPanel.scrollTop
    act(() => {
      editor.scrollTop = 100
      editor.dispatchEvent(new Event('scroll'))
    })
    expect(previewPanel.scrollTop).toBe(previousPreviewTop)
  })
})

function flushAnimationFrames(animationFrames: Map<number, FrameRequestCallback>) {
  while (animationFrames.size > 0) {
    const callbacks = [...animationFrames.values()]
    animationFrames.clear()
    callbacks.forEach((callback) => callback(0))
  }
}
