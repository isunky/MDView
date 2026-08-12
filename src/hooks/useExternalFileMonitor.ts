import { useEffect, useRef } from 'react'
import type { FileAccess } from '../platform/fileAccess'

type UseExternalFileMonitorOptions = {
  enabled: boolean
  path: string | null
  revision?: string | null
  fileAccess: FileAccess
  checkFile: () => Promise<void>
}

const WATCH_DEBOUNCE_MS = 250
const FALLBACK_POLL_MS = 2000

export function useExternalFileMonitor({
  enabled,
  path,
  revision,
  fileAccess,
  checkFile,
}: UseExternalFileMonitorOptions) {
  const checkFileRef = useRef(checkFile)

  useEffect(() => {
    checkFileRef.current = checkFile
  }, [checkFile])

  useEffect(() => {
    if (!enabled || !path || !revision || !fileAccess.checkMarkdownFile) return

    let disposed = false
    let checking = false
    let pendingCheck = false
    let debounceTimer: number | null = null
    let pollTimer: number | null = null
    let stopWatching: (() => void) | null = null
    let watchFailed = false

    const runCheck = async () => {
      if (disposed) return
      if (checking) {
        pendingCheck = true
        return
      }

      checking = true
      try {
        await checkFileRef.current()
      } finally {
        checking = false
        if (pendingCheck && !disposed) {
          pendingCheck = false
          void runCheck()
        }
      }
    }

    const scheduleCheck = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null
        void runCheck()
      }, WATCH_DEBOUNCE_MS)
    }

    const startFallbackPolling = () => {
      if (pollTimer !== null || disposed) return
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void runCheck()
      }, FALLBACK_POLL_MS)
    }

    const onFocus = () => void runCheck()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void runCheck()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (fileAccess.watchMarkdownFile) {
      void fileAccess.watchMarkdownFile(path, (event) => {
        if (event.kind === 'error') {
          watchFailed = true
          stopWatching?.()
          stopWatching = null
          startFallbackPolling()
          return
        }
        scheduleCheck()
      }).then((dispose) => {
        if (disposed || watchFailed) dispose()
        else stopWatching = dispose
      }).catch(() => {
        watchFailed = true
        startFallbackPolling()
      })
    } else {
      startFallbackPolling()
    }

    return () => {
      disposed = true
      if (debounceTimer !== null) window.clearTimeout(debounceTimer)
      if (pollTimer !== null) window.clearInterval(pollTimer)
      stopWatching?.()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, fileAccess, path, revision])
}
