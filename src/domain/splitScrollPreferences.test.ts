import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SPLIT_SCROLL_PREFERENCES,
  SPLIT_SCROLL_PREFERENCES_STORAGE_KEY,
  loadSplitScrollPreferences,
  saveSplitScrollPreferences,
} from './splitScrollPreferences'

describe('splitScrollPreferences', () => {
  it('defaults to enabled and safely falls back from invalid storage', () => {
    const storage = createStorage({ [SPLIT_SCROLL_PREFERENCES_STORAGE_KEY]: '{invalid' })

    expect(loadSplitScrollPreferences(createStorage())).toEqual(DEFAULT_SPLIT_SCROLL_PREFERENCES)
    expect(loadSplitScrollPreferences(storage)).toEqual(DEFAULT_SPLIT_SCROLL_PREFERENCES)
  })

  it('persists the enabled state', () => {
    const storage = createStorage()
    saveSplitScrollPreferences({ enabled: false }, storage)

    expect(loadSplitScrollPreferences(storage)).toEqual({ enabled: false })
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
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}
