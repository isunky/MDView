import { invoke } from '@tauri-apps/api/core'
import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater'
import { openExternalLink } from './externalLinks'

export const LATEST_RELEASE_URL = 'https://github.com/isunky/MDView/releases/latest'

export type AppDistribution = 'windows-installed' | 'windows-portable' | 'unsupported'

export type AppUpdateCandidate = {
  currentVersion: string
  version: string
  notes?: string
  publishedAt?: string
}

export type AppUpdateProgress = {
  downloadedBytes: number
  totalBytes?: number
}

export type AppUpdateClient = {
  getDistribution: () => Promise<AppDistribution>
  checkForUpdate: () => Promise<AppUpdateCandidate | null>
  cancelPendingUpdate?: () => Promise<void>
  downloadAndInstall: (onProgress: (progress: AppUpdateProgress) => void) => Promise<void>
  openLatestRelease: () => Promise<void>
}

let pendingUpdate: Update | null = null
let updateCheckRequestId = 0

export const tauriAppUpdateClient: AppUpdateClient = {
  async getDistribution() {
    if (!isTauriRuntime()) {
      return 'unsupported'
    }

    const distribution = await invoke<AppDistribution>('get_app_distribution')
    return isAppDistribution(distribution) ? distribution : 'unsupported'
  },

  async checkForUpdate() {
    const distribution = await this.getDistribution()
    if (!isWindowsDistribution(distribution)) {
      return null
    }

    const requestId = updateCheckRequestId + 1
    updateCheckRequestId = requestId
    await disposePendingUpdate()
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check({ timeout: 30_000 })
    if (requestId !== updateCheckRequestId) {
      await update?.close().catch(() => undefined)
      return null
    }
    pendingUpdate = update

    return update ? toCandidate(update) : null
  },

  async cancelPendingUpdate() {
    updateCheckRequestId += 1
    await disposePendingUpdate()
  },

  async downloadAndInstall(onProgress) {
    if (!pendingUpdate) {
      throw new Error('No update is available to install.')
    }

    const update = pendingUpdate
    let downloadedBytes = 0
    let totalBytes: number | undefined

    try {
      await update.downloadAndInstall((event) => {
        const progress = readProgress(event, downloadedBytes)
        downloadedBytes = progress.downloadedBytes
        totalBytes = progress.totalBytes ?? totalBytes
        onProgress({ ...progress, totalBytes })
      }, { timeout: 30_000 })
    } finally {
      pendingUpdate = null
      await update.close().catch(() => undefined)
    }
  },

  async openLatestRelease() {
    await openExternalLink(LATEST_RELEASE_URL)
  },
}

function toCandidate(update: Update): AppUpdateCandidate {
  return {
    currentVersion: update.currentVersion,
    version: update.version,
    notes: update.body,
    publishedAt: update.date,
  }
}

function readProgress(event: DownloadEvent, downloadedBytes: number): AppUpdateProgress {
  if (event.event === 'Started') {
    return {
      downloadedBytes,
      totalBytes: event.data.contentLength,
    }
  }

  if (event.event === 'Progress') {
    return {
      downloadedBytes: downloadedBytes + event.data.chunkLength,
    }
  }

  return { downloadedBytes }
}

async function disposePendingUpdate() {
  const update = pendingUpdate
  pendingUpdate = null
  await update?.close().catch(() => undefined)
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function isAppDistribution(value: string): value is AppDistribution {
  return value === 'windows-installed' || value === 'windows-portable' || value === 'unsupported'
}

export function isWindowsDistribution(distribution: AppDistribution): boolean {
  return distribution === 'windows-installed' || distribution === 'windows-portable'
}
