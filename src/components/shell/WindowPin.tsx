import { Pin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AppWindowFrame } from '../../platform/windowFrame'

const STORAGE_KEY = 'mdview.windowAlwaysOnTop.v1'

export function WindowPin({ frame, pinLabel, unpinLabel, onError }: {
  frame: AppWindowFrame
  pinLabel: string
  unpinLabel: string
  onError?: () => void
}) {
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(true)
  const onErrorRef = useRef(onError)
  useEffect(() => { onErrorRef.current = onError }, [onError])

  useEffect(() => {
    let active = true
    const initialize = async () => {
      try {
        let desired = false
        try { desired = localStorage.getItem(STORAGE_KEY) === 'true' } catch { /* Storage is optional. */ }
        const current = await frame.isAlwaysOnTop!()
        if (!active) return
        setPinned(current)
        if (current !== desired) await frame.setAlwaysOnTop!(desired)
        if (active) setPinned(desired)
      } catch {
        if (active) onErrorRef.current?.()
      } finally {
        if (active) setBusy(false)
      }
    }
    void initialize()
    return () => { active = false }
  }, [frame])

  const toggle = async () => {
    setBusy(true)
    const next = !pinned
    try {
      await frame.setAlwaysOnTop!(next)
      setPinned(next)
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* Keep the current session usable. */ }
    } catch {
      onErrorRef.current?.()
    } finally {
      setBusy(false)
    }
  }

  const label = pinned ? unpinLabel : pinLabel
  return <button type="button" className={`window-pin${pinned ? ' active' : ''}`}
    data-window-interactive="true" aria-label={label} title={label} aria-pressed={pinned}
    disabled={busy} onClick={() => void toggle()}><Pin aria-hidden="true" /></button>
}
