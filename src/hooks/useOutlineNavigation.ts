import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { extractMarkdownOutline } from '../domain/markdownOutline'
import {
  MAX_OUTLINE_WIDTH,
  MIN_OUTLINE_WIDTH,
  clampOutlineWidth,
  loadOutlinePreferences,
  saveOutlinePreferences,
} from '../domain/outlinePreferences'
import {
  findActiveOutlineId,
  type OutlineHeadingPosition,
} from '../domain/outlineScroll'

const OUTLINE_KEYBOARD_STEP = 16
const PREVIEW_HEADING_SCROLL_OFFSET = 16
const PREVIEW_HEADING_ACTIVE_OFFSET = 24
const OUTLINE_JUMP_SETTLE_DELAY_MS = 120
const EMPTY_OUTLINE_ITEMS: ReturnType<typeof extractMarkdownOutline> = []

type OutlineResizeStart = {
  pointerX: number
  width: number
} | null

type UseOutlineNavigationOptions = {
  content: string
  isPreview: boolean
  previewZoom: number
  previewPanelRef: RefObject<HTMLElement | null>
  previewRef: RefObject<HTMLElement | null>
}

export function useOutlineNavigation({
  content,
  isPreview,
  previewZoom,
  previewPanelRef,
  previewRef,
}: UseOutlineNavigationOptions) {
  const initialPreferences = useMemo(() => loadOutlinePreferences(), [])
  const [isOutlineOpen, setIsOutlineOpen] = useState(initialPreferences.isOpen)
  const [outlineWidth, setOutlineWidth] = useState(initialPreferences.width)
  const [outlineResizeStart, setOutlineResizeStart] = useState<OutlineResizeStart>(null)
  const [pendingHeadingId, setPendingHeadingId] = useState<string | null>(null)
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null)
  const headingPositionsRef = useRef<OutlineHeadingPosition[]>([])
  const jumpLockRef = useRef<string | null>(null)
  const jumpSettleTimeoutRef = useRef<number | null>(null)
  const outlineItems = useMemo(
    () => isPreview ? extractMarkdownOutline(content) : EMPTY_OUTLINE_ITEMS,
    [content, isPreview],
  )
  const outlineIds = useMemo(() => outlineItems.map((item) => item.id), [outlineItems])

  const updateActiveOutlineFromPreview = useCallback(() => {
    const previewPanel = previewPanelRef.current
    if (!isPreview || !previewPanel) {
      setActiveOutlineId(null)
      return
    }

    const nextActiveId = findActiveOutlineId(
      headingPositionsRef.current,
      previewPanel.scrollTop,
      PREVIEW_HEADING_ACTIVE_OFFSET,
    )
    setActiveOutlineId((currentId) => currentId === nextActiveId ? currentId : nextActiveId)
  }, [isPreview, previewPanelRef])

  const releaseJumpLock = useCallback(() => {
    if (jumpSettleTimeoutRef.current !== null) {
      window.clearTimeout(jumpSettleTimeoutRef.current)
      jumpSettleTimeoutRef.current = null
    }

    jumpLockRef.current = null
    updateActiveOutlineFromPreview()
  }, [updateActiveOutlineFromPreview])

  const scheduleJumpRelease = useCallback(() => {
    if (jumpSettleTimeoutRef.current !== null) {
      window.clearTimeout(jumpSettleTimeoutRef.current)
    }

    jumpSettleTimeoutRef.current = window.setTimeout(
      releaseJumpLock,
      OUTLINE_JUMP_SETTLE_DELAY_MS,
    )
  }, [releaseJumpLock])

  useEffect(() => {
    saveOutlinePreferences({ width: outlineWidth, isOpen: isOutlineOpen })
  }, [isOutlineOpen, outlineWidth])

  useEffect(() => {
    return () => {
      if (jumpSettleTimeoutRef.current !== null) {
        window.clearTimeout(jumpSettleTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!pendingHeadingId) {
      return
    }

    const headingId = pendingHeadingId
    const timeoutId = window.setTimeout(() => {
      const previewPanel = previewPanelRef.current
      if (outlineIds.includes(headingId)) {
        setActiveOutlineId(headingId)
        jumpLockRef.current = headingId
        scheduleJumpRelease()
      }

      if (!previewPanel || !scrollPreviewHeadingIntoView(previewPanel, headingId)) {
        window.document.getElementById(headingId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
      setPendingHeadingId(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [content, outlineIds, pendingHeadingId, previewPanelRef, scheduleJumpRelease])

  useEffect(() => {
    if (!outlineResizeStart) {
      return
    }

    const resizeStart = outlineResizeStart

    function handlePointerMove(event: PointerEvent) {
      setOutlineWidth(
        clampOutlineWidth(resizeStart.width + event.clientX - resizeStart.pointerX),
      )
    }

    function handlePointerUp() {
      setOutlineResizeStart(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [outlineResizeStart])

  useEffect(() => {
    const previewPanel = previewPanelRef.current
    const preview = previewRef.current
    if (!isPreview || !previewPanel || outlineIds.length === 0) {
      headingPositionsRef.current = []
      return
    }

    const activePreviewPanel = previewPanel
    let frameId: number | null = null

    function measureHeadingPositions() {
      frameId = null
      const panelTop = activePreviewPanel.getBoundingClientRect().top
      headingPositionsRef.current = outlineIds.flatMap((id) => {
        const heading = window.document.getElementById(id)
        if (!(heading instanceof HTMLElement) || !activePreviewPanel.contains(heading)) {
          return []
        }

        return [{
          id,
          top: activePreviewPanel.scrollTop + heading.getBoundingClientRect().top - panelTop,
        }]
      })
      updateActiveOutlineFromPreview()
    }

    function scheduleHeadingMeasurement() {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(measureHeadingPositions)
      }
    }

    scheduleHeadingMeasurement()
    window.addEventListener('resize', scheduleHeadingMeasurement)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleHeadingMeasurement)
    resizeObserver?.observe(activePreviewPanel)
    if (preview) {
      resizeObserver?.observe(preview)
    }

    return () => {
      window.removeEventListener('resize', scheduleHeadingMeasurement)
      resizeObserver?.disconnect()
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [
    isOutlineOpen,
    isPreview,
    outlineIds,
    outlineWidth,
    previewPanelRef,
    previewRef,
    previewZoom,
    updateActiveOutlineFromPreview,
  ])

  useEffect(() => {
    const previewPanel = previewPanelRef.current
    if (!isPreview || !previewPanel || outlineIds.length === 0) {
      jumpLockRef.current = null
      setActiveOutlineId(null)
      return
    }

    const activePreviewPanel = previewPanel
    let frameId: number | null = null

    function updateActiveOutlineId() {
      frameId = null
      if (!jumpLockRef.current) {
        updateActiveOutlineFromPreview()
      }
    }

    function scheduleActiveOutlineUpdate() {
      if (jumpLockRef.current) {
        scheduleJumpRelease()
        return
      }

      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateActiveOutlineId)
      }
    }

    scheduleActiveOutlineUpdate()
    activePreviewPanel.addEventListener('scroll', scheduleActiveOutlineUpdate, { passive: true })

    return () => {
      activePreviewPanel.removeEventListener('scroll', scheduleActiveOutlineUpdate)
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [
    isPreview,
    outlineIds,
    previewPanelRef,
    scheduleJumpRelease,
    updateActiveOutlineFromPreview,
  ])

  const handleOutlineJump = useCallback((id: string) => {
    const previewPanel = previewPanelRef.current
    setActiveOutlineId(id)
    jumpLockRef.current = id
    scheduleJumpRelease()

    if (!previewPanel || !scrollPreviewHeadingIntoView(previewPanel, id)) {
      window.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [previewPanelRef, scheduleJumpRelease])

  const handleOutlineResizeKey = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    setOutlineWidth((currentWidth) =>
      clampOutlineWidth(
        currentWidth + (event.key === 'ArrowRight' ? OUTLINE_KEYBOARD_STEP : -OUTLINE_KEYBOARD_STEP),
      ),
    )
  }, [])

  const beginOutlineResize = useCallback((pointerX: number) => {
    setOutlineResizeStart({ pointerX, width: outlineWidth })
  }, [outlineWidth])
  const closeOutline = useCallback(() => setIsOutlineOpen(false), [])
  const openOutline = useCallback(() => setIsOutlineOpen(true), [])
  const queueHeadingJump = useCallback((headingId?: string) => {
    setPendingHeadingId(headingId ?? null)
  }, [])

  return {
    activeOutlineId,
    beginOutlineResize,
    closeOutline,
    handleOutlineJump,
    handleOutlineResizeKey,
    isOutlineOpen,
    openOutline,
    outlineItems,
    outlineWidth,
    queueHeadingJump,
  }
}

function scrollPreviewHeadingIntoView(previewPanel: HTMLElement, headingId: string): boolean {
  const heading = window.document.getElementById(headingId)
  if (!(heading instanceof HTMLElement) || !previewPanel.contains(heading)) {
    return false
  }

  const targetTop = Math.max(
    0,
    previewPanel.scrollTop +
      heading.getBoundingClientRect().top -
      previewPanel.getBoundingClientRect().top -
      PREVIEW_HEADING_SCROLL_OFFSET,
  )
  if (typeof previewPanel.scrollTo === 'function') {
    previewPanel.scrollTo({ top: targetTop, behavior: 'smooth' })
  } else {
    previewPanel.scrollTop = targetTop
  }
  return true
}

export { MAX_OUTLINE_WIDTH, MIN_OUTLINE_WIDTH }
