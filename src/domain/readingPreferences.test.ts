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
      colorScheme: 'jade',
      fontFamily: 'serif',
      customFontFamily: null,
      fontSize: 24,
      lineHeight: 1.65,
      contentWidth: 60,
    })
  })

  it('restores a valid color theme and falls back for older or invalid settings', () => {
    expect(loadReadingPreferences(createStorage(JSON.stringify({ colorScheme: 'ocean' }))).colorScheme).toBe('ocean')
    expect(normalizeReadingPreferences({ colorScheme: 'unknown' }).colorScheme).toBe('jade')
    expect(normalizeReadingPreferences({}).colorScheme).toBe('jade')
  })

  it.each([[1, 1], [1.2, 1.2], [2.3, 2.3], [2.5, 2.5], [0.5, 1], [3, 2.5]])(
    'restores line height %s within the supported range', (stored, expected) => {
      expect(loadReadingPreferences(createStorage(JSON.stringify({ lineHeight: stored }))).lineHeight).toBe(expected)
    },
  )

  it('restores a valid custom installed font and sanitizes its name', () => {
    expect(normalizeReadingPreferences({
      fontFamily: 'custom',
      customFontFamily: '  Aptos "Display"\n  ',
    })).toMatchObject({
      fontFamily: 'custom',
      customFontFamily: 'Aptos "Display"',
    })
  })

  it('falls back to the default font when custom font data is incomplete', () => {
    expect(normalizeReadingPreferences({
      fontFamily: 'custom',
      customFontFamily: '   ',
    })).toMatchObject({
      fontFamily: 'sans',
      customFontFamily: null,
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
