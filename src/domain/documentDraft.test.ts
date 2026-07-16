import { describe, expect, it, vi } from 'vitest'
import {
  DOCUMENT_DRAFT_MAX_AGE_MS,
  DOCUMENT_DRAFT_STORAGE_KEY,
  clearDocumentDraft,
  loadDocumentDraft,
  saveDocumentDraft,
  type RecoverableDraft,
} from './documentDraft'

const now = Date.now()

describe('documentDraft', () => {
  it('stores and loads the most recent valid draft', () => {
    const storage = createStorage()
    const draft = createDraft()

    expect(saveDocumentDraft(draft, storage)).toBe(true)
    expect(loadDocumentDraft(storage, now)).toEqual(draft)
  })

  it('clears malformed and expired data without returning it', () => {
    const storage = createStorage()
    storage.setItem(DOCUMENT_DRAFT_STORAGE_KEY, '{invalid json')

    expect(loadDocumentDraft(storage, now)).toBeNull()
    expect(storage.getItem(DOCUMENT_DRAFT_STORAGE_KEY)).toBeNull()

    storage.setItem(DOCUMENT_DRAFT_STORAGE_KEY, JSON.stringify(createDraft({ updatedAt: now - DOCUMENT_DRAFT_MAX_AGE_MS - 1 })))
    expect(loadDocumentDraft(storage, now)).toBeNull()
    expect(storage.getItem(DOCUMENT_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('only clears a draft when its session id matches', () => {
    const storage = createStorage()
    const draft = createDraft()
    saveDocumentDraft(draft, storage)

    clearDocumentDraft('another-session', storage)
    expect(loadDocumentDraft(storage, now)).toEqual(draft)

    clearDocumentDraft(draft.id, storage)
    expect(loadDocumentDraft(storage, now)).toBeNull()
  })

  it('returns false when local draft storage rejects writes', () => {
    const storage = createStorage()
    storage.setItem = vi.fn(() => {
      throw new Error('Quota exceeded')
    })

    expect(saveDocumentDraft(createDraft(), storage)).toBe(false)
  })
})

function createDraft(overrides: Partial<RecoverableDraft> = {}): RecoverableDraft {
  return {
    id: 'draft-session',
    path: '/tmp/draft.md',
    title: 'draft.md',
    content: '# Draft',
    updatedAt: now,
    ...overrides,
  }
}

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
  }
}
