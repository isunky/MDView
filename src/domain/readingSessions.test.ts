import { describe, expect, it } from 'vitest'
import {
  MAX_READING_SESSIONS,
  READING_SESSIONS_STORAGE_KEY,
  loadReadingSession,
  normalizeReadingSessionPath,
  saveReadingSession,
} from './readingSessions'

describe('reading sessions', () => {
  it('persists a normalized Windows document session', () => {
    const storage = createStorage()
    saveReadingSession('C:\\Docs\\Guide.md', {
      scrollTop: 240,
      previewZoom: 1.2,
      viewMode: 'split',
      outlineWidth: 300,
      isOutlineOpen: false,
    }, storage, 100)

    expect(loadReadingSession('c:/docs/guide.md', storage)).toMatchObject({
      scrollTop: 240,
      previewZoom: 1.2,
      viewMode: 'split',
      outlineWidth: 300,
      isOutlineOpen: false,
    })
  })

  it('falls back safely for damaged storage and clamps persisted values', () => {
    const storage = createStorage({ [READING_SESSIONS_STORAGE_KEY]: '{bad json' })
    expect(loadReadingSession('/docs/guide.md', storage)).toBeNull()

    storage.setItem(READING_SESSIONS_STORAGE_KEY, JSON.stringify({
      '/docs/guide.md': {
        scrollTop: -4,
        previewZoom: 99,
        viewMode: 'preview',
        outlineWidth: 999,
        isOutlineOpen: true,
        updatedAt: 1,
      },
    }))
    expect(loadReadingSession('/docs/guide.md', storage)).toMatchObject({
      scrollTop: 0,
      previewZoom: 2,
      outlineWidth: 420,
    })
  })

  it('keeps the most recently updated session entries', () => {
    const storage = createStorage()
    for (let index = 0; index <= MAX_READING_SESSIONS; index += 1) {
      saveReadingSession(`/docs/${index}.md`, {
        scrollTop: index,
        previewZoom: 1,
        viewMode: 'preview',
        outlineWidth: 260,
        isOutlineOpen: true,
      }, storage, index)
    }

    expect(loadReadingSession('/docs/0.md', storage)).toBeNull()
    expect(loadReadingSession(`/docs/${MAX_READING_SESSIONS}.md`, storage)).not.toBeNull()
  })

  it('normalizes Windows paths only', () => {
    expect(normalizeReadingSessionPath('C:\\Docs\\Guide.md')).toBe('c:/docs/guide.md')
    expect(normalizeReadingSessionPath('/Docs/Guide.md')).toBe('/Docs/Guide.md')
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
