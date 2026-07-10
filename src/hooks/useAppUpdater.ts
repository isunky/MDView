import { useCallback, useEffect, useState } from 'react'
import {
  isWindowsDistribution,
  tauriAppUpdateClient,
  type AppDistribution,
  type AppUpdateCandidate,
  type AppUpdateClient,
  type AppUpdateProgress,
} from '../platform/appUpdates'

export type AppUpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error'

type UseAppUpdaterOptions = {
  client?: AppUpdateClient
  checkFailedMessage: string
  installFailedMessage: string
  releaseOpenFailedMessage: string
  unsupportedMessage: string
}

export function useAppUpdater({
  client = tauriAppUpdateClient,
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

  const checkForUpdates = useCallback(async (): Promise<'available' | 'latest' | 'failed'> => {
    if (!isWindowsDistribution(distribution)) {
      setErrorMessage(unsupportedMessage)
      setPhase('error')
      return 'failed'
    }

    setPhase('checking')
    setErrorMessage(null)
    setProgress(null)

    try {
      const candidate = await client.checkForUpdate()
      setUpdate(candidate)
      setPhase(candidate ? 'available' : 'idle')
      return candidate ? 'available' : 'latest'
    } catch {
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
    if (phase === 'checking' || phase === 'downloading' || phase === 'installing') {
      return
    }

    setPhase('idle')
    setUpdate(null)
    setProgress(null)
    setErrorMessage(null)
  }, [phase])

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
