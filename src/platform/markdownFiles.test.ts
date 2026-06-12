import { describe, expect, it } from 'vitest'
import { ensureMarkdownExtension, isMarkdownPath } from './markdownFiles'

describe('markdown file helpers', () => {
  it('accepts common markdown extensions case-insensitively', () => {
    expect(isMarkdownPath('notes.md')).toBe(true)
    expect(isMarkdownPath('docs/guide.MARKDOWN')).toBe(true)
    expect(isMarkdownPath('image.png')).toBe(false)
  })

  it('adds .md to save targets that do not already have a markdown extension', () => {
    expect(ensureMarkdownExtension('notes')).toBe('notes.md')
    expect(ensureMarkdownExtension('/tmp/readme.markdown')).toBe('/tmp/readme.markdown')
    expect(ensureMarkdownExtension('C:\\Docs\\draft.MD')).toBe('C:\\Docs\\draft.MD')
  })
})
