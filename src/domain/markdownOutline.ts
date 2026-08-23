import { toString } from 'mdast-util-to-string'
import type { Heading, RootContent } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export type MarkdownOutlineItem = {
  id: string
  level: 1 | 2 | 3 | 4 | 5
  text: string
}

type HeadingIdCounts = Map<string, number>

const markdownParser = unified().use(remarkParse).use(remarkGfm)

export function extractMarkdownOutline(content: string): MarkdownOutlineItem[] {
  const idCounts = createHeadingIdCounts()
  const tree = markdownParser.parse(content)

  return tree.children
    .filter(isOutlineHeading)
    .map((heading) => {
      const text = toString(heading).trim()
      return {
        id: createUniqueHeadingId(text, idCounts),
        level: heading.depth as 1 | 2 | 3 | 4 | 5,
        text,
      }
    })
}

function isOutlineHeading(node: RootContent): node is Heading {
  return node.type === 'heading' && node.depth <= 5
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
