import { useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react'

const KEY = 'mdview.splitRatio.v1'
const clamp = (ratio: number) => Math.min(75, Math.max(25, ratio))

export function useSplitLayout() {
  const [ratio, setRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY)
      const value = saved === null ? 42 : Number(saved)
      return Number.isFinite(value) ? clamp(value) : 42
    } catch { return 42 }
  })
  useEffect(() => { try { localStorage.setItem(KEY, String(ratio)) } catch { /* Optional preference. */ } }, [ratio])
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const bounds = event.currentTarget.parentElement!.getBoundingClientRect()
    if (bounds.width) setRatio(clamp((event.clientX - bounds.left) / bounds.width * 100))
  }
  function onKeyDown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key)) return
    event.preventDefault()
    setRatio((value) => event.key === 'Enter' ? 50 : event.key === 'Home' ? 25 : event.key === 'End' ? 75 : clamp(value + (event.key === 'ArrowLeft' ? -2 : 2)))
  }
  return { ratio, onPointerDown, onPointerMove, onKeyDown, reset: () => setRatio(50) }
}
