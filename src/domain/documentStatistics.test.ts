import { describe, expect, it } from 'vitest'
import { getCursorPosition, getDocumentStatistics, getLineStartOffsets } from './documentStatistics'

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

  it('uses a precomputed line index for cursor lookups', () => {
    const content = 'first\n😀ok\nlast'
    const lineStartOffsets = getLineStartOffsets(content)

    expect(lineStartOffsets).toEqual([0, 6, 11])
    expect(getCursorPosition(content, 9, lineStartOffsets)).toEqual({ line: 2, column: 3 })
  })
})
