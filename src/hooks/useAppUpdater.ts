import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AppDistribution,
  AppUpdateCandidate,
  AppUpdateClient,
  AppUpdateProgress,
} from '../platform/appUpdates'

export type AppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'latest'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error'

type UseAppUpdaterOptions = {
  client: AppUpdateClient
  checkFailedMessage: string
  installFailedMessage: string
  releaseOpenFailedMessage: string
  unsupportedMessage: string
}

export function useAppUpdater({
  client,
  checkFailedMessage,
  installFailedMessage,
  releaseOpenFailedMessage,
  unsupportedMessage,
}: UseAppUpdaterOptions) {
  const [distribution, setDistribution] = useState<AppDistribution>('unsupported')
  const [phase, setPhase] = useState<AppUpdatePhase>('idle')
  const [update, setUpdate] = useState<AppUpdateCandidate | null>(null)
  const [progress, setProgress] = useState<AppUpdateProgress | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const checkRequestIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    void client.getDistribution()
      .then((nextDistribution) => {
        if (!cancelled) {
          setDistribution(nextDistribution)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistribution('unsupported')
        }
      })

    return () => {
      cancelled = true
    }
  }, [client])

  const checkForUpdates = useCallback(async (): Promise<'available' | 'latest' | 'failed' | 'cancelled'> => {
    if (!isWindowsDistribution(distribution)) {
      setErrorMessage(unsupportedMessage)
      setPhase('error')
      return 'failed'
    }

    const requestId = checkRequestIdRef.current + 1
    checkRequestIdRef.current = requestId
    setPhase('checking')
    setErrorMessage(null)
    setProgress(null)

    try {
      const candidate = await client.checkForUpdate()
      if (checkRequestIdRef.current !== requestId) {
        return 'cancelled'
      }
      setUpdate(candidate)
      setPhase(candidate ? 'available' : 'latest')
      return candidate ? 'available' : 'latest'
    } catch {
      if (checkRequestIdRef.current !== requestId) {
        return 'cancelled'
      }
      setErrorMessage(checkFailedMessage)
      setPhase('error')
      return 'failed'
    }
  }, [checkFailedMessage, client, distribution, unsupportedMessage])

  const installUpdate = useCallback(async () => {
    if (!update) {
      return
    }

    setPhase('downloading')
    setErrorMessage(null)
    setProgress({ downloadedBytes: 0 })

    try {
      await client.downloadAndInstall((nextProgress) => {
        setProgress((currentProgress) => ({
          downloadedBytes: nextProgress.downloadedBytes,
          totalBytes: nextProgress.totalBytes ?? currentProgress?.totalBytes,
        }))

        if (nextProgress.totalBytes !== undefined && nextProgress.downloadedBytes >= nextProgress.totalBytes) {
          setPhase('installing')
        }
      })
      setPhase('idle')
      setUpdate(null)
      setProgress(null)
    } catch {
      setErrorMessage(installFailedMessage)
      setPhase('error')
    }
  }, [client, installFailedMessage, update])

  const openPortableDownload = useCallback(async () => {
    try {
      await client.openLatestRelease()
      setPhase('idle')
      setUpdate(null)
    } catch {
      setErrorMessage(releaseOpenFailedMessage)
      setPhase('error')
    }
  }, [client, releaseOpenFailedMessage])

  const dismiss = useCallback(() => {
    if (phase === 'downloading' || phase === 'installing') {
      return
    }

    if (phase === 'checking') {
      checkRequestIdRef.current += 1
      void client.cancelPendingUpdate?.()
    }
    setPhase('idle')
    setUpdate(null)
    setProgress(null)
    setErrorMessage(null)
  }, [client, phase])

  return {
    checkForUpdates,
    dismiss,
    distribution,
    errorMessage,
    installUpdate,
    openPortableDownload,
    phase,
    progress,
    update,
  }
}

function isWindowsDistribution(distribution: AppDistribution): boolean {
  return distribution === 'windows-installed' || distribution === 'windows-portable'
}
