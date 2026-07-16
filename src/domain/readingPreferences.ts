export type ReadingThemeMode = 'system' | 'light' | 'dark'
export type EffectiveReadingTheme = 'light' | 'dark'
export type ReadingFontFamily = 'sans' | 'serif' | 'monospace'

export type ReadingPreferences = {
  themeMode: ReadingThemeMode
  fontFamily: ReadingFontFamily
  fontSize: number
  lineHeight: number
  contentWidth: number
}

export const READING_PREFERENCES_STORAGE_KEY = 'mdview.readingPreferences.v1'
export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  themeMode: 'system',
  fontFamily: 'sans',
  fontSize: 16,
  lineHeight: 1.8,
  contentWidth: 940,
}

export const READING_FONT_SIZE_RANGE = { min: 14, max: 22, step: 1 }
export const READING_LINE_HEIGHT_RANGE = { min: 1.5, max: 2.1, step: 0.05 }
export const READING_CONTENT_WIDTH_RANGE = { min: 680, max: 1180, step: 20 }

export function loadReadingPreferences(
  storage: Storage | null = getLocalStorage(),
): ReadingPreferences {
  if (!storage) {
    return DEFAULT_READING_PREFERENCES
  }

  const rawValue = storage.getItem(READING_PREFERENCES_STORAGE_KEY)
  if (!rawValue) {
    return DEFAULT_READING_PREFERENCES
  }

  try {
    return normalizeReadingPreferences(JSON.parse(rawValue))
  } catch {
    return DEFAULT_READING_PREFERENCES
  }
}

export function saveReadingPreferences(
  preferences: ReadingPreferences,
  storage: Storage | null = getLocalStorage(),
) {
  storage?.setItem(
    READING_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeReadingPreferences(preferences)),
  )
}

export function normalizeReadingPreferences(value: unknown): ReadingPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_READING_PREFERENCES
  }

  const preferences = value as Record<string, unknown>
  return {
    themeMode: isReadingThemeMode(preferences.themeMode)
      ? preferences.themeMode
      : DEFAULT_READING_PREFERENCES.themeMode,
    fontFamily: isReadingFontFamily(preferences.fontFamily)
      ? preferences.fontFamily
      : DEFAULT_READING_PREFERENCES.fontFamily,
    fontSize: clampPreferenceNumber(
      preferences.fontSize,
      READING_FONT_SIZE_RANGE,
      DEFAULT_READING_PREFERENCES.fontSize,
    ),
    lineHeight: clampPreferenceNumber(
      preferences.lineHeight,
      READING_LINE_HEIGHT_RANGE,
      DEFAULT_READING_PREFERENCES.lineHeight,
    ),
    contentWidth: clampPreferenceNumber(
      preferences.contentWidth,
      READING_CONTENT_WIDTH_RANGE,
      DEFAULT_READING_PREFERENCES.contentWidth,
    ),
  }
}

export function resolveEffectiveReadingTheme(
  mode: ReadingThemeMode,
  systemTheme: EffectiveReadingTheme,
): EffectiveReadingTheme {
  return mode === 'system' ? systemTheme : mode
}

function isReadingThemeMode(value: unknown): value is ReadingThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isReadingFontFamily(value: unknown): value is ReadingFontFamily {
  return value === 'sans' || value === 'serif' || value === 'monospace'
}

function clampPreferenceNumber(
  value: unknown,
  range: { min: number; max: number; step: number },
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  const clamped = Math.min(Math.max(value, range.min), range.max)
  const rounded = Math.round((clamped - range.min) / range.step) * range.step + range.min
  return Number(rounded.toFixed(2))
}

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}
