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
  isEnabled: boolean
  isPreview: boolean
  isSplit: boolean
  previewPanelRef: RefObject<HTMLElement | null>
  onZoomChange: (message: string) => void
}

export function usePreviewController({
  content,
  isEnabled,
  isPreview,
  isSplit,
  previewPanelRef,
  onZoomChange,
}: UsePreviewControllerOptions) {
  const [previewZoom, setPreviewZoom] = useState(DEFAULT_PREVIEW_ZOOM)
  const [storedPreviewContent, setStoredPreviewContent] = useState(content)
  const previewZoomRef = useRef(DEFAULT_PREVIEW_ZOOM)

  useEffect(() => {
    if (!isSplit) {
      return
    }

    const timeoutId = window.setTimeout(
      () => setStoredPreviewContent(content),
      SPLIT_PREVIEW_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timeoutId)
  }, [content, isSplit])

  useEffect(() => {
    if (!isEnabled) {
      return
    }

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
  }, [isEnabled, onZoomChange, previewPanelRef])

  const prepareSplitPreview = useCallback(() => {
    setStoredPreviewContent(content)
  }, [content])

  const freezePreview = useCallback(() => {
    setStoredPreviewContent(content)
  }, [content])

  const restorePreviewZoom = useCallback((zoom: number) => {
    const nextZoom = clampPreviewZoom(zoom)
    previewZoomRef.current = nextZoom
    setPreviewZoom(nextZoom)
  }, [])

  return {
    freezePreview,
    previewContent: isPreview ? content : storedPreviewContent,
    previewZoom,
    prepareSplitPreview,
    restorePreviewZoom,
  }
}

function clampPreviewZoom(zoom: number): number {
  return Number(Math.min(Math.max(zoom, MIN_PREVIEW_ZOOM), MAX_PREVIEW_ZOOM).toFixed(2))
}
