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
  type OutlineDepth,
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
  documentSessionId?: string
  content: string
  isPreview: boolean
  previewZoom: number
  previewPanelRef: RefObject<HTMLElement | null>
  previewRef: RefObject<HTMLElement | null>
}

export function useOutlineNavigation({
  documentSessionId,
  content,
  isPreview,
  previewZoom,
  previewPanelRef,
  previewRef,
}: UseOutlineNavigationOptions) {
  const initialPreferences = useMemo(() => loadOutlinePreferences(), [])
  const [isOutlineOpen, setIsOutlineOpen] = useState(initialPreferences.isOpen)
  const [outlineWidth, setOutlineWidth] = useState(initialPreferences.width)
  const [outlineDepth, setOutlineDepth] = useState<OutlineDepth>(initialPreferences.maxDepth)
  const [outlineResizeStart, setOutlineResizeStart] = useState<OutlineResizeStart>(null)
  const [pendingHeadingId, setPendingHeadingId] = useState<string | null>(null)
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null)
  const headingPositionsRef = useRef<OutlineHeadingPosition[]>([])
  const jumpLockRef = useRef<string | null>(null)
  const jumpSettleTimeoutRef = useRef<number | null>(null)
  const allItems = useMemo(
    () => isPreview
      ? extractMarkdownOutline(content)
      : EMPTY_OUTLINE_ITEMS,
    [content, isPreview],
  )
  const outlineItems = useMemo(
    () => allItems.filter((item) => item.level <= outlineDepth),
    [allItems, outlineDepth],
  )
  const outlineIds = useMemo(() => outlineItems.map((item) => item.id), [outlineItems])
  const [branches, setBranches] = useState({
    session: documentSessionId,
    items: allItems,
    active: activeOutlineId,
    collapsed: new Set<string>(),
  })
  if (branches.session !== documentSessionId || branches.items !== allItems || branches.active !== activeOutlineId) {
    const validIds = new Set(allItems.map((item) => item.id))
    const collapsed = branches.session !== documentSessionId
      ? new Set<string>()
      : new Set([...branches.collapsed].filter((id) => !isPreview || validIds.has(id)))
    if (branches.active !== activeOutlineId && activeOutlineId) {
      const parents: typeof outlineItems = []
      for (const item of outlineItems) {
        while (parents.length && parents[parents.length - 1].level >= item.level) parents.pop()
        if (item.id === activeOutlineId) {
          parents.forEach((parent) => collapsed.delete(parent.id))
          break
        }
        parents.push(item)
      }
    }
    setBranches({ session: documentSessionId, items: allItems, active: activeOutlineId, collapsed })
  }
  const toggleOutlineBranch = (id: string) => setBranches((current) => {
    const collapsed = new Set(current.collapsed)
    if (collapsed.has(id)) collapsed.delete(id)
    else collapsed.add(id)
    return { ...current, collapsed }
  })
  const setOutlineSubtree = (id: string, expanded: boolean) => setBranches((current) => {
    const index = allItems.findIndex((item) => item.id === id)
    if (index < 0) return current
    const collapsed = new Set(current.collapsed)
    for (let cursor = index; cursor < allItems.length; cursor++) {
      const item = allItems[cursor]
      if (cursor > index && item.level <= allItems[index].level) break
      if (expanded) collapsed.delete(item.id)
      else if (allItems[cursor + 1]?.level > item.level) collapsed.add(item.id)
    }
    return { ...current, collapsed }
  })
  const setAllOutlineBranches = (expanded: boolean) => setBranches((current) => ({
    ...current,
    collapsed: expanded ? new Set<string>() : new Set(allItems
      .filter((item, index) => allItems[index + 1]?.level > item.level)
      .map((item) => item.id)),
  }))

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
    saveOutlinePreferences({
      width: outlineWidth,
      isOpen: isOutlineOpen,
      maxDepth: outlineDepth,
    })
  }, [isOutlineOpen, outlineDepth, outlineWidth])

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
  const restoreOutlineLayout = useCallback((layout: { width: number; isOpen: boolean }) => {
    setOutlineWidth(clampOutlineWidth(layout.width))
    setIsOutlineOpen(layout.isOpen)
  }, [])
  const queueHeadingJump = useCallback((headingId?: string) => {
    setPendingHeadingId(headingId ?? null)
  }, [])

  return {
    collapsedOutlineIds: branches.collapsed,
    setOutlineSubtree,
    toggleOutlineBranch,
    setAllOutlineBranches,
    activeOutlineId,
    beginOutlineResize,
    closeOutline,
    handleOutlineJump,
    handleOutlineResizeKey,
    isOutlineOpen,
    openOutline,
    outlineItems,
    outlineDepth,
    outlineWidth,
    queueHeadingJump,
    restoreOutlineLayout,
    setOutlineDepth,
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
