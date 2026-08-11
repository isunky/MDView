import { useId } from 'react'
import { Link2, Unlink2 } from 'lucide-react'

type SplitScrollControlProps = {
  disableLabel: string
  enableLabel: string
  enabled: boolean
  onToggle: () => void
}

export function SplitScrollControl({
  disableLabel,
  enableLabel,
  enabled,
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
        {enabled ? <Link2 aria-hidden="true" /> : <Unlink2 aria-hidden="true" />}
      </button>
      <span className="split-scroll-tooltip" id={tooltipId} role="tooltip">
        {actionLabel}
      </span>
    </div>
  )
}
