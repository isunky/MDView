import { describe, expect, it } from 'vitest'
import {
  createInitialDocument,
  markDocumentSaved,
  replaceDocumentContent,
  updateDocumentDraft,
} from './documentState'

describe('document state', () => {
  it('starts as an untitled markdown document without unsaved changes', () => {
    const document = createInitialDocument()

    expect(document.title).toBe('Untitled.md')
    expect(document.path).toBeNull()
    expect(document.content).toContain('# Untitled')
    expect(document.savedContent).toBe(document.content)
    expect(document.isDirty).toBe(false)
  })

  it('loads a file as the saved baseline and derives the visible title from its path', () => {
    const document = replaceDocumentContent(
      createInitialDocument(),
      '# Release notes',
      'C:\\Users\\Hao\\Notes\\release.md',
    )

    expect(document.title).toBe('release.md')
    expect(document.path).toBe('C:\\Users\\Hao\\Notes\\release.md')
    expect(document.content).toBe('# Release notes')
    expect(document.savedContent).toBe('# Release notes')
    expect(document.isDirty).toBe(false)
  })

  it('marks the document dirty only when draft content differs from the saved baseline', () => {
    const document = replaceDocumentContent(createInitialDocument(), 'hello', '/tmp/note.md')

    expect(updateDocumentDraft(document, 'hello').isDirty).toBe(false)
    expect(updateDocumentDraft(document, 'hello!').isDirty).toBe(true)
  })

  it('marks a saved document clean and updates its target path and title', () => {
    const edited = updateDocumentDraft(createInitialDocument(), '# Final')
    const saved = markDocumentSaved(edited, '/Users/hao/final.md')

    expect(saved.path).toBe('/Users/hao/final.md')
    expect(saved.title).toBe('final.md')
    expect(saved.savedContent).toBe('# Final')
    expect(saved.isDirty).toBe(false)
  })

  it('keeps newer edits dirty when an older snapshot finishes saving', () => {
    const saving = updateDocumentDraft(createInitialDocument(), '# Saving snapshot')
    const editedWhileSaving = updateDocumentDraft(saving, '# Edited after save started')
    const saved = markDocumentSaved(
      editedWhileSaving,
      '/Users/hao/final.md',
      '# Saving snapshot',
    )

    expect(saved.content).toBe('# Edited after save started')
    expect(saved.savedContent).toBe('# Saving snapshot')
    expect(saved.isDirty).toBe(true)
  })
})
