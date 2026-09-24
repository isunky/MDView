import { RefreshCw, X } from 'lucide-react'

export function ImageImportNotice({
  count,
  dismissLabel,
  message,
  onDismiss,
  onRetry,
  retryLabel,
}: {
  count: number
  dismissLabel: string
  message: (count: number) => string
  onDismiss: () => void
  onRetry: () => void
  retryLabel: string
}) {
  if (count === 0) {
    return null
  }

  return (
    <div className="image-import-notice" role="alert">
      <span>{message(count)}</span>
      <button type="button" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        {retryLabel}
      </button>
      <button
        type="button"
        className="image-import-dismiss"
        aria-label={dismissLabel}
        title={dismissLabel}
        onClick={onDismiss}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  )
}
