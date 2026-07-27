export type SplitScrollPreferences = {
  enabled: boolean
}

export const SPLIT_SCROLL_PREFERENCES_STORAGE_KEY = 'mdview.splitScrollPreferences.v1'
export const DEFAULT_SPLIT_SCROLL_PREFERENCES: SplitScrollPreferences = { enabled: true }

export function loadSplitScrollPreferences(
  storage: Storage | null = getLocalStorage(),
): SplitScrollPreferences {
  const rawValue = storage?.getItem(SPLIT_SCROLL_PREFERENCES_STORAGE_KEY)
  if (!rawValue) {
    return DEFAULT_SPLIT_SCROLL_PREFERENCES
  }

  try {
    return normalizeSplitScrollPreferences(JSON.parse(rawValue))
  } catch {
    return DEFAULT_SPLIT_SCROLL_PREFERENCES
  }
}

export function saveSplitScrollPreferences(
  preferences: SplitScrollPreferences,
  storage: Storage | null = getLocalStorage(),
) {
  storage?.setItem(
    SPLIT_SCROLL_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeSplitScrollPreferences(preferences)),
  )
}

export function normalizeSplitScrollPreferences(value: unknown): SplitScrollPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SPLIT_SCROLL_PREFERENCES
  }

  const preferences = value as Record<string, unknown>
  return {
    enabled: typeof preferences.enabled === 'boolean'
      ? preferences.enabled
      : DEFAULT_SPLIT_SCROLL_PREFERENCES.enabled,
  }
}

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}
