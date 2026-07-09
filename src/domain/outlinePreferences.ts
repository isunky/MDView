export type OutlinePreferences = {
  width: number
  isOpen: boolean
}

export const OUTLINE_PREFERENCES_STORAGE_KEY = 'mdview.outlinePreferences.v1'
export const MIN_OUTLINE_WIDTH = 180
export const MAX_OUTLINE_WIDTH = 420
export const DEFAULT_OUTLINE_PREFERENCES: OutlinePreferences = {
  width: 260,
  isOpen: true,
}

export function loadOutlinePreferences(
  storage: Storage | null = getLocalStorage(),
): OutlinePreferences {
  if (!storage) {
    return DEFAULT_OUTLINE_PREFERENCES
  }

  const rawValue = storage.getItem(OUTLINE_PREFERENCES_STORAGE_KEY)
  if (!rawValue) {
    return DEFAULT_OUTLINE_PREFERENCES
  }

  try {
    return normalizeOutlinePreferences(JSON.parse(rawValue))
  } catch {
    return DEFAULT_OUTLINE_PREFERENCES
  }
}

export function saveOutlinePreferences(
  preferences: OutlinePreferences,
  storage: Storage | null = getLocalStorage(),
) {
  if (!storage) {
    return
  }

  storage.setItem(
    OUTLINE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeOutlinePreferences(preferences)),
  )
}

export function clampOutlineWidth(width: number): number {
  return Math.min(Math.max(width, MIN_OUTLINE_WIDTH), MAX_OUTLINE_WIDTH)
}

function normalizeOutlinePreferences(value: unknown): OutlinePreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_OUTLINE_PREFERENCES
  }

  const preferences = value as Record<string, unknown>
  return {
    width:
      typeof preferences.width === 'number'
        ? clampOutlineWidth(preferences.width)
        : DEFAULT_OUTLINE_PREFERENCES.width,
    isOpen:
      typeof preferences.isOpen === 'boolean'
        ? preferences.isOpen
        : DEFAULT_OUTLINE_PREFERENCES.isOpen,
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}
