import type { ReactNode } from 'react'
import type { ToastPlacement } from '../hooks/useTransientToast'

type ToastProps = {
  children: ReactNode
  label: string
  placement: ToastPlacement
  showPreviewLayer: boolean
}

export function Toast({ children, label, placement, showPreviewLayer }: ToastProps) {
  if (placement === 'preview') {
    if (!showPreviewLayer) {
      return null
    }

    return (
      <div className="toast-layer">
        <div className="toast" role="status" aria-label={label}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="toast toast--app" role="status" aria-label={label}>
      {children}
    </div>
  )
}
