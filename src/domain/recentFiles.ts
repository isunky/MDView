export type RecentFile = {
  path: string
  title: string
  lastOpenedAt: string
}

export const RECENT_FILES_STORAGE_KEY = 'mdview.recentFiles.v1'
export const MAX_RECENT_FILES = 10

export function loadRecentFiles(storage: Storage | null = getLocalStorage()): RecentFile[] {
  if (!storage) {
    return []
  }

  const rawValue = storage.getItem(RECENT_FILES_STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue)
    return normalizeRecentFiles(parsed)
  } catch {
    return []
  }
}

export function saveRecentFiles(
  recentFiles: RecentFile[],
  storage: Storage | null = getLocalStorage(),
) {
  if (!storage) {
    return
  }

  storage.setItem(
    RECENT_FILES_STORAGE_KEY,
    JSON.stringify(normalizeRecentFiles(recentFiles)),
  )
}

export function clearRecentFiles(storage: Storage | null = getLocalStorage()) {
  storage?.removeItem(RECENT_FILES_STORAGE_KEY)
}

export function addRecentFile(
  recentFiles: RecentFile[],
  path: string,
  openedAt = new Date(),
): RecentFile[] {
  return normalizeRecentFiles([
    {
      path,
      title: getTitleFromPath(path),
      lastOpenedAt: openedAt.toISOString(),
    },
    ...recentFiles.filter((file) => file.path !== path),
  ])
}

export function removeRecentFile(recentFiles: RecentFile[], path: string): RecentFile[] {
  return recentFiles.filter((file) => file.path !== path)
}

function normalizeRecentFiles(value: unknown): RecentFile[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecentFile)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
    .filter((file, index, files) => files.findIndex((item) => item.path === file.path) === index)
    .slice(0, MAX_RECENT_FILES)
}

function isRecentFile(value: unknown): value is RecentFile {
  if (!value || typeof value !== 'object') {
    return false
  }

  const file = value as Record<string, unknown>
  return (
    typeof file.path === 'string' &&
    typeof file.title === 'string' &&
    typeof file.lastOpenedAt === 'string'
  )
}

function getTitleFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}
