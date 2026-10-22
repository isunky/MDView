import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { SelectionRange } from '../domain/editorCommands'
import { measureEditorRangeRects } from '../domain/editorLinePositions'

/** A visible source match while the search field keeps keyboard focus. */
export function useEditorSearchMarker(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  match: SelectionRange | null,
  content: string,
) {
  const markerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const editor = editorRef.current
    const layer = markerRef.current
    if (!editor || !layer || !match) return
    const updateScroll = () => {
      layer.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`
    }
    const measure = () => {
      const rects = measureEditorRangeRects(editor, match.start, match.end)
      layer.replaceChildren(...rects.map(rect => {
        const marker = document.createElement('span')
        Object.assign(marker.style, {
          left: `${rect.left}px`, top: `${rect.top}px`,
          width: `${rect.width}px`, height: `${rect.height}px`,
        })
        return marker
      }))
      const viewport = layer.parentElement!
      Object.assign(viewport.style, {
        top: `${editor.offsetTop}px`, width: `${editor.clientWidth}px`, height: `${editor.clientHeight}px`,
      })
      const first = rects[0]
      if (first && document.activeElement !== editor && (first.top < editor.scrollTop + 12 || first.top + first.height > editor.scrollTop + editor.clientHeight - 12)) {
        editor.scrollTop = Math.max(0, first.top - editor.clientHeight / 3)
      }
      updateScroll()
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(editor)
    if (!observer) window.addEventListener('resize', measure)
    editor.addEventListener('scroll', updateScroll, { passive: true })
    return () => {
      observer?.disconnect()
      if (!observer) window.removeEventListener('resize', measure)
      editor.removeEventListener('scroll', updateScroll)
      layer.replaceChildren()
    }
  }, [content, editorRef, match])
  return markerRef
}
