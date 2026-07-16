export type DocumentStatistics = {
  characterCount: number
  wordCount: number
  readingMinutes: number
}

export type CursorPosition = {
  line: number
  column: number
}

const FALLBACK_WORD_PATTERN = /[\p{Script=Han}]|[\p{L}\p{N}]+/gu

export function getDocumentStatistics(content: string): DocumentStatistics {
  const characterCount = Array.from(content).length
  const wordCount = countWords(content)

  return {
    characterCount,
    wordCount,
    readingMinutes: wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 300)),
  }
}

export function getCursorPosition(content: string, offset: number): CursorPosition {
  const safeOffset = Math.min(Math.max(offset, 0), content.length)
  const beforeCursor = content.slice(0, safeOffset)
  const line = beforeCursor.split('\n').length
  const lineStart = beforeCursor.lastIndexOf('\n') + 1

  return {
    line,
    column: Array.from(beforeCursor.slice(lineStart)).length + 1,
  }
}

function countWords(content: string): number {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
    let count = 0
    for (const segment of segmenter.segment(content)) {
      if (segment.isWordLike) {
        count += 1
      }
    }
    return count
  }

  return content.match(FALLBACK_WORD_PATTERN)?.length ?? 0
}
