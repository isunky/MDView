import { clampOutlineWidth } from './outlinePreferences'

export type ReadingViewMode = 'preview' | 'edit' | 'split'

export type ReadingSession = {
  scrollTop: number
  previewZoom: number
  viewMode: ReadingViewMode
  outlineWidth: number
  isOutlineOpen: boolean
  updatedAt: number
}

type StoredReadingSessions = Record<string, ReadingSession>

export const READING_SESSIONS_STORAGE_KEY = 'mdview.readingSessions.v1'
export const MAX_READING_SESSIONS = 50

export function loadReadingSession(
  path: string | null,
  storage: Storage | null = getLocalStorage(),
): ReadingSession | null {
  if (!path || !storage) {
    return null
  }

  return loadReadingSessions(storage)[normalizeReadingSessionPath(path)] ?? null
}

export function saveReadingSession(
  path: string | null,
  session: Omit<ReadingSession, 'updatedAt'>,
  storage: Storage | null = getLocalStorage(),
  updatedAt = Date.now(),
) {
  if (!path || !storage) {
    return
  }

  const entries = loadReadingSessions(storage)
  entries[normalizeReadingSessionPath(path)] = { ...session, updatedAt }
  storage.setItem(READING_SESSIONS_STORAGE_KEY, JSON.stringify(trimReadingSessions(entries)))
}

export function normalizeReadingSessionPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/')
  return /^[a-zA-Z]:\//.test(normalized) ? normalized.toLowerCase() : normalized
}

function loadReadingSessions(storage: Storage): StoredReadingSessions {
  const rawValue = storage.getItem(READING_SESSIONS_STORAGE_KEY)
  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([path, value]) => [path, normalizeReadingSession(value)])
        .filter(([, value]) => value !== null),
    ) as StoredReadingSessions
  } catch {
    return {}
  }
}

function trimReadingSessions(entries: StoredReadingSessions): StoredReadingSessions {
  return Object.fromEntries(
    Object.entries(entries)
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_READING_SESSIONS),
  )
}

function normalizeReadingSession(value: unknown): ReadingSession | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const session = value as Record<string, unknown>
  const viewMode = session.viewMode
  if (viewMode !== 'preview' && viewMode !== 'edit' && viewMode !== 'split') {
    return null
  }

  if (typeof session.isOutlineOpen !== 'boolean') {
    return null
  }

  return {
    scrollTop: normalizeNonNegativeNumber(session.scrollTop, 0),
    previewZoom: Math.min(Math.max(normalizeNonNegativeNumber(session.previewZoom, 1), 0.6), 2),
    viewMode,
    outlineWidth: clampOutlineWidth(
      typeof session.outlineWidth === 'number' ? session.outlineWidth : 260,
    ),
    isOutlineOpen: session.isOutlineOpen,
    updatedAt: normalizeNonNegativeNumber(session.updatedAt, 0),
  }
}

function normalizeNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}
