import { describe, expect, it } from 'vitest'
import { getCursorPosition, getDocumentStatistics } from './documentStatistics'

describe('document statistics', () => {
  it('counts Unicode characters and estimates reading time', () => {
    expect(getDocumentStatistics('中文 hello')).toMatchObject({
      characterCount: 8,
      wordCount: expect.any(Number),
      readingMinutes: 1,
    })
  })

  it('reports the cursor line and one-based Unicode column', () => {
    expect(getCursorPosition('first\n中文!', 8)).toEqual({ line: 2, column: 3 })
  })
})
