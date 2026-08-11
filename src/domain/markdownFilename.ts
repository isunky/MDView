import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

const DEFAULT_MARKDOWN_FILENAME = 'Untitled.md'
const MAX_FILENAME_STEM_LENGTH = 80
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/
const WINDOWS_RESERVED_NAME_PATTERN = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i
const markdownParser = unified().use(remarkParse).use(remarkGfm)

export function createMarkdownSuggestedFilename(content: string): string {
  const candidate = findFirstMeaningfulLine(content)
  if (!candidate) {
    return DEFAULT_MARKDOWN_FILENAME
  }

  let stem = sanitizeFilenameStem(candidate)
  if (!stem) {
    return DEFAULT_MARKDOWN_FILENAME
  }

  if (WINDOWS_RESERVED_NAME_PATTERN.test(stem)) {
    const dotIndex = stem.indexOf('.')
    stem = dotIndex > 0
      ? `${stem.slice(0, dotIndex)}-document${stem.slice(dotIndex)}`
      : `${stem}-document`
  }

  return `${stem}.md`
}

function findFirstMeaningfulLine(content: string): string | null {
  let fenceMarker: string | null = null
  let fenceLength = 0

  for (const line of content.split(/\r?\n/)) {
    const fence = line.match(FENCE_PATTERN)?.[1]
    if (fence) {
      if (!fenceMarker) {
        fenceMarker = fence[0]
        fenceLength = fence.length
      } else if (fence[0] === fenceMarker && fence.length >= fenceLength) {
        fenceMarker = null
        fenceLength = 0
      }
      continue
    }

    if (fenceMarker || !line.trim()) {
      continue
    }

    const root = markdownParser.parse(line)
    const firstNode = root.children[0]
    if (!firstNode || ['code', 'html', 'thematicBreak'].includes(firstNode.type)) {
      continue
    }

    const text = toString(root).trim()
    if (text) {
      return text
    }
  }

  return null
}

function sanitizeFilenameStem(value: string): string {
  const safeValue = Array.from(value.normalize('NFC'), (character) => {
    return character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character
  }).join('')

  const normalized = safeValue
    .replace(/\s+/g, ' ')
    .replace(/[ .-]+$/g, '')
    .trim()
  return Array.from(normalized)
    .slice(0, MAX_FILENAME_STEM_LENGTH)
    .join('')
    .replace(/[ .-]+$/g, '')
}
