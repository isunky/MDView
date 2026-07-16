export type RecoverableDraft = {
  id: string
  path: string | null
  title: string
  content: string
  updatedAt: number
}

export const DOCUMENT_DRAFT_STORAGE_KEY = 'mdview.documentDraft.v1'
export const DOCUMENT_DRAFT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export function createDocumentDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function loadDocumentDraft(
  storage: Storage | null = getLocalStorage(),
  now = Date.now(),
): RecoverableDraft | null {
  if (!storage) {
    return null
  }

  const rawValue = storage.getItem(DOCUMENT_DRAFT_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const draft = normalizeDocumentDraft(JSON.parse(rawValue))
    if (!draft || now - draft.updatedAt > DOCUMENT_DRAFT_MAX_AGE_MS) {
      storage.removeItem(DOCUMENT_DRAFT_STORAGE_KEY)
      return null
    }

    return draft
  } catch {
    storage.removeItem(DOCUMENT_DRAFT_STORAGE_KEY)
    return null
  }
}

export function saveDocumentDraft(
  draft: RecoverableDraft,
  storage: Storage | null = getLocalStorage(),
): boolean {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(DOCUMENT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDocumentDraft(
  id?: string,
  storage: Storage | null = getLocalStorage(),
) {
  if (!storage) {
    return
  }

  if (!id) {
    storage.removeItem(DOCUMENT_DRAFT_STORAGE_KEY)
    return
  }

  const draft = loadDocumentDraft(storage)
  if (draft?.id === id) {
    storage.removeItem(DOCUMENT_DRAFT_STORAGE_KEY)
  }
}

function normalizeDocumentDraft(value: unknown): RecoverableDraft | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const draft = value as Record<string, unknown>
  if (
    typeof draft.id !== 'string' ||
    !draft.id ||
    typeof draft.title !== 'string' ||
    !draft.title ||
    typeof draft.content !== 'string' ||
    (typeof draft.path !== 'string' && draft.path !== null) ||
    typeof draft.updatedAt !== 'number' ||
    !Number.isFinite(draft.updatedAt) ||
    draft.updatedAt < 0
  ) {
    return null
  }

  return {
    id: draft.id,
    path: draft.path,
    title: draft.title,
    content: draft.content,
    updatedAt: draft.updatedAt,
  }
}

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}
