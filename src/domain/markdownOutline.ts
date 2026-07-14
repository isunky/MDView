export type MarkdownOutlineItem = {
  id: string
  level: 1 | 2 | 3 | 4
  text: string
}

type HeadingIdCounts = Map<string, number>

const HEADING_PATTERN = /^(#{1,4})\s+(.+?)\s*#*\s*$/
const FENCE_PATTERN = /^\s*(```|~~~)/

export function extractMarkdownOutline(content: string): MarkdownOutlineItem[] {
  const idCounts = createHeadingIdCounts()
  const outline: MarkdownOutlineItem[] = []
  let inFence = false

  for (const line of content.split(/\r?\n/)) {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence
      continue
    }

    if (inFence) {
      continue
    }

    const match = line.match(HEADING_PATTERN)
    if (!match) {
      continue
    }

    const text = match[2].trim()
    outline.push({
      id: createUniqueHeadingId(text, idCounts),
      level: match[1].length as 1 | 2 | 3 | 4,
      text,
    })
  }

  return outline
}

export function createHeadingIdCounts(): HeadingIdCounts {
  return new Map<string, number>()
}

export function createUniqueHeadingId(text: string, counts: HeadingIdCounts): string {
  const baseId = slugifyHeading(text) || 'heading'
  const nextCount = (counts.get(baseId) ?? 0) + 1
  counts.set(baseId, nextCount)

  return nextCount === 1 ? baseId : `${baseId}-${nextCount}`
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
