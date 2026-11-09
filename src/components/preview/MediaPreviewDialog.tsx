import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, Minus, Plus, RotateCcw, X } from 'lucide-react'
import type { MarkdownPreviewLabels } from './previewTypes'
import { PreviewImageSaveError, savePreviewImage } from '../../platform/previewImageSave'
import { useShortcutSettings } from '../../platform/shortcutSettings'

const MIN_SCALE = 0.1
const MAX_SCALE = 8
type Transform = { scale: number; x: number; y: number }

export function MediaPreviewDialog({ src, alt, title, closeLabel, labels, onClose, navigation, fileName, rasterizeSvg }: {
  src: string
  alt: string
  title: string
  closeLabel: string
  labels: MarkdownPreviewLabels
  onClose: () => void
  fileName: string
  rasterizeSvg: boolean
  navigation?: { index: number; total: number; onNavigate: (direction: -1 | 1) => void }
}) {
  const shortcuts = useShortcutSettings()
  const shortcutsRef = useRef(shortcuts)
  useLayoutEffect(() => { shortcutsRef.current = shortcuts })
  const dialogRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const savingRef = useRef(false)
  const mountedRef = useRef(false)
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 })
  const dragRef = useRef<{ id: number; x: number; y: number; origin: Transform } | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ message: string; error: boolean } | null>(null)
  const onCloseRef = useRef(onClose)
  const navigateRef = useRef<(direction: -1 | 1) => void>(() => {})
  useLayoutEffect(() => { onCloseRef.current = onClose; navigateRef.current = navigate })

  function updateTransform(next: Transform) {
    transformRef.current = next
    setTransform(next)
  }

  function zoom(factor: number, anchorX = 0, anchorY = 0) {
    const current = transformRef.current
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor))
    const ratio = scale / current.scale
    updateTransform({ scale, x: anchorX - (anchorX - current.x) * ratio, y: anchorY - (anchorY - current.y) * ratio })
  }

  function navigate(direction: -1 | 1) {
    if (savingRef.current || !navigation || navigation.index + direction < 0 || navigation.index + direction >= navigation.total) return
    dragRef.current = null
    setDragging(false)
    updateTransform({ scale: 1, x: 0, y: 0 })
    setSaveStatus(null)
    navigation.onNavigate(direction)
  }

  async function saveCurrentImage() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaveStatus(null)
    try {
      const path = await savePreviewImage({ src, fileName, rasterizeSvg,
        backgroundColor: imageRef.current ? getComputedStyle(imageRef.current).backgroundColor : undefined })
      if (mountedRef.current) setSaveStatus({ message: path ? labels.previewSaved : labels.previewSaveCanceled, error: false })
    } catch (error) {
      const detail = error instanceof PreviewImageSaveError ? {
        read: labels.previewReadFailed,
        render: labels.previewRenderFailed,
        save: labels.previewWriteFailed,
      }[error.stage] : undefined
      if (mountedRef.current) setSaveStatus({ message: detail || labels.previewSaveFailed, error: true })
    } finally {
      savingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCloseRef.current()
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (!shortcutsRef.current.isEnabled(event.key === 'ArrowLeft' ? 'previewPrevious' : 'previewNext')) return
        event.preventDefault()
        event.stopImmediatePropagation()
        navigateRef.current(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      mountedRef.current = false
      window.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      event.stopPropagation()
      const rect = viewport!.getBoundingClientRect()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1)
      const current = transformRef.current
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.002)))
      const ratio = scale / current.scale
      const anchorX = event.clientX - rect.left - rect.width / 2
      const anchorY = event.clientY - rect.top - rect.height / 2
      const next = { scale, x: anchorX - (anchorX - current.x) * ratio, y: anchorY - (anchorY - current.y) * ratio }
      transformRef.current = next
      setTransform(next)
    }
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [])

  function startDrag(event: PointerEvent<HTMLImageElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: transformRef.current }
    setDragging(true)
  }

  function moveDrag(event: PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    updateTransform({ ...drag.origin, x: drag.origin.x + event.clientX - drag.x, y: drag.origin.y + event.clientY - drag.y })
  }

  function finishDrag(event: PointerEvent<HTMLImageElement>) {
    if (dragRef.current?.id !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return createPortal(
    <div ref={dialogRef} className="image-preview-backdrop" role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const buttons = Array.from(dialogRef.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (!buttons.includes(document.activeElement as HTMLButtonElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
          else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        } else if ((event.key === '+' || event.key === '=') && shortcuts.isEnabled('previewZoomIn')) { event.preventDefault(); zoom(1.25) }
        else if (event.key === '-' && shortcuts.isEnabled('previewZoomOut')) { event.preventDefault(); zoom(0.8) }
        else if (event.key === '0' && shortcuts.isEnabled('previewReset')) { event.preventDefault(); updateTransform({ scale: 1, x: 0, y: 0 }) }
      }}>
      <div ref={viewportRef} className="image-preview-viewport"
        onClick={(event) => { if (event.currentTarget === event.target) onClose() }}>
        <img ref={imageRef} key={navigation?.index} className={`image-preview-image${dragging ? ' dragging' : ''}`} src={src} alt={alt} draggable={false}
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag}
          onPointerCancel={finishDrag} onLostPointerCapture={() => { dragRef.current = null; setDragging(false) }} />
      </div>
      <button ref={closeRef} type="button" className="image-preview-close" onClick={onClose} aria-label={closeLabel}><X aria-hidden="true" /></button>
      <div className="image-preview-controls">
        <span className="image-preview-hint" role={saveStatus?.error ? 'alert' : 'status'}>{saving ? labels.previewSaving : saveStatus?.message || labels.previewInteractionHint}</span>
        <div className="image-preview-toolbar">
          <button type="button" onClick={() => zoom(0.8)} disabled={transform.scale <= MIN_SCALE} aria-label={labels.previewZoomOut} title={labels.previewZoomOut}><Minus aria-hidden="true" /></button>
          <output aria-live="polite">{Math.round(transform.scale * 100)}%</output>
          <button type="button" onClick={() => zoom(1.25)} disabled={transform.scale >= MAX_SCALE} aria-label={labels.previewZoomIn} title={labels.previewZoomIn}><Plus aria-hidden="true" /></button>
          <button type="button" onClick={() => updateTransform({ scale: 1, x: 0, y: 0 })} aria-label={labels.previewReset} title={labels.previewReset}><RotateCcw aria-hidden="true" /></button>
          <button type="button" onClick={() => void saveCurrentImage()} disabled={saving} aria-label={labels.previewSave} title={labels.previewSave}><Download aria-hidden="true" /></button>
          {navigation && navigation.total > 1 ? <span className="image-preview-position" aria-live="polite">{labels.previewPosition(navigation.index + 1, navigation.total)}</span> : null}
        </div>
      </div>
      {navigation && navigation.total > 1 ? <>
        <button type="button" className="image-preview-navigation previous" onClick={() => navigate(-1)} disabled={saving || navigation.index === 0}
          aria-label={labels.previewPrevious} title={labels.previewPrevious}><ChevronLeft aria-hidden="true" /></button>
        <button type="button" className="image-preview-navigation next" onClick={() => navigate(1)} disabled={saving || navigation.index === navigation.total - 1}
          aria-label={labels.previewNext} title={labels.previewNext}><ChevronRight aria-hidden="true" /></button>
      </> : null}
    </div>, document.body,
  )
}
