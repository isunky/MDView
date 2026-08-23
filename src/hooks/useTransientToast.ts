import { useCallback, useEffect, useState } from 'react'

export type ToastPlacement = 'app' | 'preview'

export type TransientToast = {
  message: string
  placement: ToastPlacement
} | null

export function useTransientToast(duration = 1800) {
  const [toast, setToast] = useState<TransientToast>(null)

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => setToast(null), duration)
    return () => window.clearTimeout(timeoutId)
  }, [duration, toast])

  const showAppToast = useCallback((message: string) => {
    setToast({ message, placement: 'app' })
  }, [])

  const showPreviewToast = useCallback((message: string) => {
    setToast({ message, placement: 'preview' })
  }, [])

  return {
    showAppToast,
    showPreviewToast,
    toast,
  }
}
