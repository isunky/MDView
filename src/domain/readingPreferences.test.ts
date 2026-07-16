import { describe, expect, it } from 'vitest'
import {
  DEFAULT_READING_PREFERENCES,
  READING_PREFERENCES_STORAGE_KEY,
  loadReadingPreferences,
  normalizeReadingPreferences,
  resolveEffectiveReadingTheme,
} from './readingPreferences'

describe('readingPreferences', () => {
  it('falls back to defaults for missing or malformed persisted preferences', () => {
    const storage = createStorage('{not-json')

    expect(loadReadingPreferences(storage)).toEqual(DEFAULT_READING_PREFERENCES)
    expect(loadReadingPreferences(createStorage(null))).toEqual(DEFAULT_READING_PREFERENCES)
  })

  it('normalizes invalid values to the supported reading ranges', () => {
    expect(normalizeReadingPreferences({
      themeMode: 'dark',
      fontFamily: 'serif',
      fontSize: 30,
      lineHeight: 1.63,
      contentWidth: 703,
    })).toEqual({
      themeMode: 'dark',
      fontFamily: 'serif',
      fontSize: 22,
      lineHeight: 1.65,
      contentWidth: 700,
    })
  })

  it('resolves the system setting with the current system color theme', () => {
    expect(resolveEffectiveReadingTheme('system', 'dark')).toBe('dark')
    expect(resolveEffectiveReadingTheme('light', 'dark')).toBe('light')
  })
})

function createStorage(value: string | null): Storage {
  return {
    getItem: (key) => key === READING_PREFERENCES_STORAGE_KEY ? value : null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    get length() {
      return 0
    },
  }
}
