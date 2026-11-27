import { useId } from 'react'

type SplitScrollControlProps = {
  disableLabel: string
  enableLabel: string
  enabled: boolean
  statusLabel: string
  onToggle: () => void
}

export function SplitScrollControl({
  disableLabel,
  enableLabel,
  enabled,
  statusLabel,
  onToggle,
}: SplitScrollControlProps) {
  const tooltipId = useId()
  const actionLabel = enabled ? disableLabel : enableLabel

  return (
    <div className="split-scroll-toolbar-control">
      <button
        type="button"
        className={`split-scroll-control ${enabled ? 'active' : ''}`}
        onClick={onToggle}
        aria-describedby={tooltipId}
        aria-label={actionLabel}
        aria-pressed={enabled}
      >
        <span className="split-scroll-icon" aria-hidden="true" />
      </button>
      <span className="split-scroll-tooltip" id={tooltipId} role="tooltip">
        {statusLabel}
      </span>
    </div>
  )
}
