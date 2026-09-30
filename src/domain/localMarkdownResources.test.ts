import { describe, expect, it } from 'vitest'
import {
  resolveLocalMarkdownResource,
  resolveSameDocumentHeading,
} from './localMarkdownResources'

describe('localMarkdownResources', () => {
  it('resolves relative image paths from the current markdown file', () => {
    expect(resolveLocalMarkdownResource('images/cover%20one.png', 'C:\\Docs\\Guide\\readme.md')).toEqual({
      kind: 'image',
      path: 'C:\\Docs\\Guide\\images\\cover one.png',
    })
  })

  it('resolves Windows absolute image paths', () => {
    expect(resolveLocalMarkdownResource('C:\\Images\\cover.png', 'C:\\Docs\\Guide\\readme.md')).toEqual({
      kind: 'image',
      path: 'C:\\Images\\cover.png',
    })

    expect(resolveLocalMarkdownResource('C:/Images/cover.png', 'C:\\Docs\\Guide\\readme.md')).toEqual({
      kind: 'image',
      path: 'C:\\Images\\cover.png',
    })
  })

  it.each([
    '/D:/AICode/body/output/ui-audit/01-overview.png',
    '/D%3A/AICode/body/output/ui-audit/01-overview.png',
  ])('resolves slash-prefixed Windows image paths: %s', (href) => {
    expect(resolveLocalMarkdownResource(href, 'D:\\AICode\\body\\output\\report.md')).toEqual({
      kind: 'image',
      path: 'D:\\AICode\\body\\output\\ui-audit\\01-overview.png',
    })
  })

  it('resolves slash-prefixed Windows paths without a saved document', () => {
    expect(resolveLocalMarkdownResource('/D:/Images/cover%20one.png', null)).toEqual({
      kind: 'image',
      path: 'D:/Images/cover one.png',
    })
  })

  it('preserves macOS absolute image paths', () => {
    expect(resolveLocalMarkdownResource('/Users/sunky/Images/cover.png', '/Users/sunky/report.md')).toEqual({
      kind: 'image',
      path: '/Users/sunky/Images/cover.png',
    })
  })

  it('resolves file URL image paths', () => {
    expect(resolveLocalMarkdownResource('file:///C:/Images/cover%20one.png', 'C:\\Docs\\Guide\\readme.md')).toEqual({
      kind: 'image',
      path: 'C:\\Images\\cover one.png',
    })
  })

  it('resolves markdown links with heading fragments', () => {
    expect(resolveLocalMarkdownResource('../intro.md#quick-start', 'C:\\Docs\\Guide\\readme.md')).toEqual({
      kind: 'markdown',
      path: 'C:\\Docs\\intro.md',
      headingId: 'quick-start',
    })
  })

  it('ignores external urls and unsupported local files', () => {
    expect(resolveLocalMarkdownResource('https://example.com/readme.md', 'C:\\Docs\\readme.md')).toBeNull()
    expect(resolveLocalMarkdownResource('archive.zip', 'C:\\Docs\\readme.md')).toBeNull()
  })

  it('resolves same-document heading links without a file path', () => {
    expect(resolveSameDocumentHeading('#intro%20section')).toBe('intro section')
    expect(resolveSameDocumentHeading('guide.md#intro')).toBeNull()
  })
})
