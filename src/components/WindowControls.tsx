import { Copy, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppWindowFrame } from '../platform/windowFrame'

export function WindowControls({
  frame,
  labels,
}: {
  frame: AppWindowFrame
  labels: {
    close: string
    maximize: string
    minimize: string
    restore: string
  }
}) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let dispose: (() => void) | undefined
    let mounted = true

    void frame.subscribeMaximized((maximized) => {
      if (mounted) setIsMaximized(maximized)
    }).then((unsubscribe) => {
      if (mounted) dispose = unsubscribe
      else unsubscribe()
    }).catch(() => undefined)

    return () => {
      mounted = false
      dispose?.()
    }
  }, [frame])

  const maximizeLabel = isMaximized ? labels.restore : labels.maximize
  const runWindowAction = (action: () => Promise<void>) => {
    void action().catch(() => undefined)
  }

  return (
    <div className="window-controls" data-window-interactive="true">
      <button
        type="button"
        className="window-control"
        onClick={() => runWindowAction(frame.minimize)}
        title={labels.minimize}
        aria-label={labels.minimize}
      >
        <Minus aria-hidden="true" />
      </button>
      <button
        type="button"
        className="window-control"
        onClick={() => runWindowAction(frame.toggleMaximize)}
        title={maximizeLabel}
        aria-label={maximizeLabel}
      >
        {isMaximized ? <Copy aria-hidden="true" /> : <Square aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="window-control window-control-close"
        onClick={() => runWindowAction(frame.close)}
        title={labels.close}
        aria-label={labels.close}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  )
}
