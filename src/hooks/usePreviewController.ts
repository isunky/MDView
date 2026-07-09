import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

const DEFAULT_PREVIEW_ZOOM = 1
const MIN_PREVIEW_ZOOM = 0.6
const MAX_PREVIEW_ZOOM = 2
const PREVIEW_ZOOM_STEP = 0.1
const SPLIT_PREVIEW_DEBOUNCE_MS = 120

type UsePreviewControllerOptions = {
  content: string
  isSplit: boolean
  previewPanelRef: RefObject<HTMLElement | null>
  onZoomChange: (message: string) => void
}

export function usePreviewController({
  content,
  isSplit,
  previewPanelRef,
  onZoomChange,
}: UsePreviewControllerOptions) {
  const [previewZoom, setPreviewZoom] = useState(DEFAULT_PREVIEW_ZOOM)
  const [debouncedPreviewContent, setDebouncedPreviewContent] = useState(content)
  const previewZoomRef = useRef(DEFAULT_PREVIEW_ZOOM)

  useEffect(() => {
    if (!isSplit) {
      return
    }

    const timeoutId = window.setTimeout(
      () => setDebouncedPreviewContent(content),
      SPLIT_PREVIEW_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timeoutId)
  }, [content, isSplit])

  useEffect(() => {
    const previewPanel = previewPanelRef.current
    if (!previewPanel) {
      return
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey) {
        return
      }

      event.preventDefault()
      const nextZoom = clampPreviewZoom(
        previewZoomRef.current + (event.deltaY < 0 ? PREVIEW_ZOOM_STEP : -PREVIEW_ZOOM_STEP),
      )
      previewZoomRef.current = nextZoom
      setPreviewZoom(nextZoom)
      onZoomChange(`${Math.round(nextZoom * 100)}%`)
    }

    previewPanel.addEventListener('wheel', handleWheel, { passive: false })
    return () => previewPanel.removeEventListener('wheel', handleWheel)
  }, [onZoomChange, previewPanelRef])

  const prepareSplitPreview = useCallback(() => {
    setDebouncedPreviewContent(content)
  }, [content])

  return {
    previewContent: isSplit ? debouncedPreviewContent : content,
    previewZoom,
    prepareSplitPreview,
  }
}

function clampPreviewZoom(zoom: number): number {
  return Number(Math.min(Math.max(zoom, MIN_PREVIEW_ZOOM), MAX_PREVIEW_ZOOM).toFixed(2))
}
