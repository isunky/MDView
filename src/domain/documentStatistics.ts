export type DocumentStatistics = {
  characterCount: number
  wordCount: number
  readingMinutes: number
}

export type CursorPosition = {
  line: number
  column: number
}

export function getLineStartOffsets(content: string): number[] {
  const offsets = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '\n') offsets.push(index + 1)
  }
  return offsets
}

const FALLBACK_WORD_PATTERN = /[\p{Script=Han}]|[\p{L}\p{N}]+/gu
let wordSegmenter: Intl.Segmenter | undefined

export function getDocumentStatistics(content: string): DocumentStatistics {
  let characterCount = 0
  for (let index = 0; index < content.length; index += 1) {
    const codeUnit = content.charCodeAt(index)
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && index + 1 < content.length) {
      const nextCodeUnit = content.charCodeAt(index + 1)
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) index += 1
    }
    characterCount += 1
  }
  const wordCount = countWords(content)

  return {
    characterCount,
    wordCount,
    readingMinutes: wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 300)),
  }
}

export function getCursorPosition(
  content: string,
  offset: number,
  lineStartOffsets: number[] = getLineStartOffsets(content),
): CursorPosition {
  const safeOffset = Math.min(Math.max(offset, 0), content.length)
  let low = 0
  let high = lineStartOffsets.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (lineStartOffsets[middle] <= safeOffset) low = middle + 1
    else high = middle
  }
  const lineIndex = Math.max(0, low - 1)
  const lineStart = lineStartOffsets[lineIndex] ?? 0

  return {
    line: lineIndex + 1,
    column: Array.from(content.slice(lineStart, safeOffset)).length + 1,
  }
}

function countWords(content: string): number {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    wordSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'word' })
    let count = 0
    for (const segment of wordSegmenter.segment(content)) {
      if (segment.isWordLike) {
        count += 1
      }
    }
    return count
  }

  return content.match(FALLBACK_WORD_PATTERN)?.length ?? 0
}
