import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { MarkdownEditorHandle } from '../components/MarkdownEditor'
import {
  getScrollMaximum,
  mapEditorScrollToPreview,
  mapPreviewScrollToEditor,
  normalizeSplitScrollAnchors,
  type SplitScrollAnchor,
} from '../domain/splitScroll'
import {
  loadSplitScrollPreferences,
  saveSplitScrollPreferences,
} from '../domain/splitScrollPreferences'

type ScrollSource = 'editor' | 'preview'

type UseSplitScrollSyncOptions = {
  editorRef: RefObject<MarkdownEditorHandle | null>
  isSplit: boolean
  previewContent: string
  previewPanelRef: RefObject<HTMLElement | null>
  previewRef: RefObject<HTMLElement | null>
  previewZoom: number
}

type PendingProgrammaticScroll = {
  source: ScrollSource
  top: number
} | null

export function useSplitScrollSync({
  editorRef,
  isSplit,
  previewContent,
  previewPanelRef,
  previewRef,
  previewZoom,
}: UseSplitScrollSyncOptions) {
  const [isEnabled, setIsEnabled] = useState(() => loadSplitScrollPreferences().enabled)
  const anchorsRef = useRef<SplitScrollAnchor[]>([])
  const lastSourceRef = useRef<ScrollSource>('editor')
  const pendingProgrammaticScrollRef = useRef<PendingProgrammaticScroll>(null)
  const pendingSyncSourceRef = useRef<ScrollSource | null>(null)
  const syncFrameRef = useRef<number | null>(null)
  const programmaticClearFrameRef = useRef<number | null>(null)
  const lineCount = useMemo(() => Math.max(1, previewContent.split(/\r?\n/).length), [previewContent])

  useEffect(() => {
    saveSplitScrollPreferences({ enabled: isEnabled })
  }, [isEnabled])

  const measureAnchors = useCallback(() => {
    const previewPanel = previewPanelRef.current
    const preview = previewRef.current
    if (!previewPanel || !preview) {
      anchorsRef.current = []
      return
    }

    const panelTop = previewPanel.getBoundingClientRect().top
    const previewMaximum = getScrollMaximum(previewPanel)
    const rawAnchors = Array.from(
      preview.querySelectorAll<HTMLElement>('[data-mdview-source-start]'),
    ).flatMap((element) => {
      const sourceLine = Number(element.dataset.mdviewSourceStart)
      if (!Number.isFinite(sourceLine) || sourceLine < 1) {
        return []
      }

      return [{
        sourceLine,
        previewTop: previewPanel.scrollTop + element.getBoundingClientRect().top - panelTop,
      }]
    })

    anchorsRef.current = normalizeSplitScrollAnchors(rawAnchors, lineCount, previewMaximum)
  }, [lineCount, previewPanelRef, previewRef])

  const scheduleSync = useCallback((source: ScrollSource) => {
    if (!isSplit || !isEnabled) {
      return
    }

    pendingSyncSourceRef.current = source
    if (syncFrameRef.current !== null) {
      return
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = null
      const activeSource = pendingSyncSourceRef.current
      pendingSyncSourceRef.current = null
      const editor = editorRef.current?.getScrollElement()
      const previewPanel = previewPanelRef.current
      if (!activeSource || !editor || !previewPanel) {
        return
      }

      if (anchorsRef.current.length === 0) {
        measureAnchors()
      }
      const editorStyle = window.getComputedStyle(editor)
      const lineHeight = Number.parseFloat(editorStyle.lineHeight) || 23
      const paddingTop = Number.parseFloat(editorStyle.paddingTop) || 0
      const nextTop = activeSource === 'editor'
        ? mapEditorScrollToPreview(editor, previewPanel, lineCount, lineHeight, paddingTop, anchorsRef.current)
        : mapPreviewScrollToEditor(previewPanel, editor, lineCount, lineHeight, paddingTop, anchorsRef.current)
      const target = activeSource === 'editor' ? previewPanel : editor
      const targetSource: ScrollSource = activeSource === 'editor' ? 'preview' : 'editor'

      if (Math.abs(target.scrollTop - nextTop) < 1) {
        return
      }

      pendingProgrammaticScrollRef.current = { source: targetSource, top: nextTop }
      target.scrollTop = nextTop
      if (programmaticClearFrameRef.current !== null) {
        window.cancelAnimationFrame(programmaticClearFrameRef.current)
      }
      programmaticClearFrameRef.current = window.requestAnimationFrame(() => {
        pendingProgrammaticScrollRef.current = null
        programmaticClearFrameRef.current = null
      })
    })
  }, [editorRef, isEnabled, isSplit, lineCount, measureAnchors, previewPanelRef])

  useEffect(() => {
    if (!isSplit || !isEnabled) {
      return
    }

    const editor = editorRef.current?.getScrollElement()
    const previewPanel = previewPanelRef.current
    if (!editor || !previewPanel) {
      return
    }

    function handleScroll(source: ScrollSource, element: HTMLElement) {
      const pending = pendingProgrammaticScrollRef.current
      if (pending?.source === source && Math.abs(element.scrollTop - pending.top) < 2) {
        pendingProgrammaticScrollRef.current = null
        return
      }

      lastSourceRef.current = source
      scheduleSync(source)
    }

    const onEditorScroll = () => handleScroll('editor', editor)
    const onPreviewScroll = () => handleScroll('preview', previewPanel)
    editor.addEventListener('scroll', onEditorScroll, { passive: true })
    previewPanel.addEventListener('scroll', onPreviewScroll, { passive: true })

    return () => {
      editor.removeEventListener('scroll', onEditorScroll)
      previewPanel.removeEventListener('scroll', onPreviewScroll)
    }
  }, [editorRef, isEnabled, isSplit, previewPanelRef, scheduleSync])

  useEffect(() => {
    if (!isSplit || !isEnabled) {
      return
    }

    const previewPanel = previewPanelRef.current
    const preview = previewRef.current
    if (!previewPanel) {
      return
    }

    let frameId: number | null = null
    function scheduleMeasurement() {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        measureAnchors()
      })
    }

    scheduleMeasurement()
    window.addEventListener('resize', scheduleMeasurement)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMeasurement)
    resizeObserver?.observe(previewPanel)
    if (preview) {
      resizeObserver?.observe(preview)
    }

    return () => {
      window.removeEventListener('resize', scheduleMeasurement)
      resizeObserver?.disconnect()
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [isEnabled, isSplit, measureAnchors, previewContent, previewPanelRef, previewRef, previewZoom])

  useEffect(() => {
    if (isSplit && isEnabled) {
      scheduleSync(lastSourceRef.current)
    }
  }, [isEnabled, isSplit, scheduleSync])

  useEffect(() => {
    return () => {
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current)
      }
      if (programmaticClearFrameRef.current !== null) {
        window.cancelAnimationFrame(programmaticClearFrameRef.current)
      }
    }
  }, [])

  return {
    isSplitScrollSyncEnabled: isEnabled,
    toggleSplitScrollSync: () => setIsEnabled((current) => !current),
  }
}
