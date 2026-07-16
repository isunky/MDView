import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import {
  loadReadingSession,
  saveReadingSession,
  type ReadingViewMode,
} from '../domain/readingSessions'

const SAVE_DELAY_MS = 250

type ReadingSnapshot = {
  scrollTop: number
  previewZoom: number
  viewMode: ReadingViewMode
  outlineWidth: number
  isOutlineOpen: boolean
}

type UseReadingSessionOptions = Omit<ReadingSnapshot, 'scrollTop'> & {
  documentPath: string | null
  previewPanelRef: RefObject<HTMLElement | null>
  onRestore: (session: Omit<ReadingSnapshot, 'scrollTop'>) => void
}

export function useReadingSession({
  documentPath,
  previewPanelRef,
  onRestore,
  previewZoom,
  viewMode,
  outlineWidth,
  isOutlineOpen,
}: UseReadingSessionOptions) {
  const snapshot = useMemo<ReadingSnapshot>(() => ({
    previewZoom,
    viewMode,
    outlineWidth,
    isOutlineOpen,
    scrollTop: 0,
  }), [isOutlineOpen, outlineWidth, previewZoom, viewMode])
  const latestSnapshotRef = useRef<ReadingSnapshot>({ ...snapshot, scrollTop: 0 })
  const snapshotRef = useRef(snapshot)
  const pendingRestoreRef = useRef<{ path: string; snapshot: ReadingSnapshot } | null>(null)

  useLayoutEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    const pendingRestore = pendingRestoreRef.current
    if (pendingRestore?.path === documentPath) {
      const hasRestoredValues = pendingRestore.snapshot.previewZoom === snapshot.previewZoom
        && pendingRestore.snapshot.viewMode === snapshot.viewMode
        && pendingRestore.snapshot.outlineWidth === snapshot.outlineWidth
        && pendingRestore.snapshot.isOutlineOpen === snapshot.isOutlineOpen

      if (!hasRestoredValues) {
        return
      }

      pendingRestoreRef.current = null
    }

    latestSnapshotRef.current = {
      ...snapshot,
      scrollTop: latestSnapshotRef.current.scrollTop,
    }
  }, [documentPath, snapshot])

  const persist = useCallback((path = documentPath) => {
    if (!path) {
      return
    }

    saveReadingSession(path, latestSnapshotRef.current)
  }, [documentPath])

  useLayoutEffect(() => {
    if (!documentPath) {
      return
    }

    const session = loadReadingSession(documentPath)
    if (!session) {
      pendingRestoreRef.current = null
      latestSnapshotRef.current = { ...snapshotRef.current, scrollTop: 0 }
      return
    }

    pendingRestoreRef.current = { path: documentPath, snapshot: session }
    latestSnapshotRef.current = session
    onRestore({
      previewZoom: session.previewZoom,
      viewMode: session.viewMode,
      outlineWidth: session.outlineWidth,
      isOutlineOpen: session.isOutlineOpen,
    })
  }, [documentPath, onRestore])

  useEffect(() => {
    if (!documentPath) {
      return
    }

    if (pendingRestoreRef.current?.path === documentPath) {
      return
    }

    const timeoutId = window.setTimeout(() => persist(documentPath), SAVE_DELAY_MS)
    return () => {
      window.clearTimeout(timeoutId)
      persist(documentPath)
    }
  }, [
    documentPath,
    snapshot.isOutlineOpen,
    snapshot.outlineWidth,
    snapshot.previewZoom,
    snapshot.viewMode,
    persist,
  ])

  useEffect(() => {
    const previewPanel = previewPanelRef.current
    if (!documentPath || !previewPanel) {
      return
    }
    const activePreviewPanel = previewPanel

    let timeoutId: number | null = null
    function handleScroll() {
      latestSnapshotRef.current = {
        ...latestSnapshotRef.current,
        scrollTop: activePreviewPanel.scrollTop,
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => persist(documentPath), SAVE_DELAY_MS)
    }

    activePreviewPanel.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      activePreviewPanel.removeEventListener('scroll', handleScroll)
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      persist(documentPath)
    }
  }, [documentPath, persist, previewPanelRef])

  useEffect(() => {
    if (!documentPath) {
      return
    }

    function handlePageHide() {
      persist(documentPath)
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [documentPath, persist])

  useEffect(() => {
    const session = documentPath ? loadReadingSession(documentPath) : null
    const previewPanel = previewPanelRef.current
    if (!session || !previewPanel) {
      return
    }

    let canceled = false
    let frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(() => {
        if (!canceled) {
          previewPanel.scrollTop = session.scrollTop
        }
      })
    })
    const settleTimeout = window.setTimeout(() => {
      if (!canceled) {
        previewPanel.scrollTop = session.scrollTop
      }
    }, 320)
    const cancelRestore = () => {
      canceled = true
    }

    previewPanel.addEventListener('wheel', cancelRestore, { passive: true })
    previewPanel.addEventListener('pointerdown', cancelRestore, { passive: true })
    previewPanel.addEventListener('keydown', cancelRestore)

    return () => {
      canceled = true
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(settleTimeout)
      previewPanel.removeEventListener('wheel', cancelRestore)
      previewPanel.removeEventListener('pointerdown', cancelRestore)
      previewPanel.removeEventListener('keydown', cancelRestore)
    }
  }, [documentPath, previewPanelRef])
}
