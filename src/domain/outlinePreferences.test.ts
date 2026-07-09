import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OUTLINE_PREFERENCES,
  OUTLINE_PREFERENCES_STORAGE_KEY,
  loadOutlinePreferences,
  saveOutlinePreferences,
} from './outlinePreferences'

describe('outline preferences', () => {
  it('loads saved width and open state', () => {
    const storage = createStorage({
      [OUTLINE_PREFERENCES_STORAGE_KEY]: JSON.stringify({ width: 340, isOpen: false }),
    })

    expect(loadOutlinePreferences(storage)).toEqual({ width: 340, isOpen: false })
  })

  it('clamps saved width and ignores invalid open state', () => {
    const storage = createStorage({
      [OUTLINE_PREFERENCES_STORAGE_KEY]: JSON.stringify({ width: 999, isOpen: 'no' }),
    })

    expect(loadOutlinePreferences(storage)).toEqual({
      width: 420,
      isOpen: DEFAULT_OUTLINE_PREFERENCES.isOpen,
    })
  })

  it('falls back to defaults when stored data is damaged', () => {
    const storage = createStorage({ [OUTLINE_PREFERENCES_STORAGE_KEY]: '{bad json' })

    expect(loadOutlinePreferences(storage)).toEqual(DEFAULT_OUTLINE_PREFERENCES)
  })

  it('saves normalized preferences', () => {
    const storage = createStorage()

    saveOutlinePreferences({ width: 120, isOpen: true }, storage)

    expect(JSON.parse(storage.getItem(OUTLINE_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual({
      width: 180,
      isOpen: true,
    })
  })
})

function createStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initialValues))

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}
