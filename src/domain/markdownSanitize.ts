import type { Element, Nodes, Root } from 'hast'
import type { Schema } from 'hast-util-sanitize'
import { createHeadingIdCounts, createUniqueHeadingId } from './markdownOutline'

const safeTagNames = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'ins',
  'kbd',
  'li',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'samp',
  'section',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
  'var',
]

export const markdownSanitizeSchema: Schema = {
  allowComments: false,
  allowDoctypes: false,
  tagNames: safeTagNames,
  attributes: {
    '*': ['align', 'dir', 'lang', 'title'],
    a: ['href', 'title', 'ariaLabel'],
    blockquote: ['cite'],
    code: [['className', /^language-[A-Za-z0-9_-]+$/]],
    details: ['open'],
    img: ['src', 'alt', 'title', 'width', 'height', 'align'],
    input: [
      ['type', 'checkbox'],
      ['disabled', true],
      'checked',
    ],
    li: [['className', 'task-list-item']],
    ol: ['start', ['className', 'contains-task-list']],
    section: ['dataFootnotes', ['className', 'footnotes']],
    td: ['align', 'colSpan', 'rowSpan', 'headers'],
    th: ['align', 'colSpan', 'rowSpan', 'headers', 'scope'],
    ul: [['className', 'contains-task-list']],
  },
  protocols: {
    cite: ['http', 'https'],
    href: ['http', 'https', 'file'],
    src: ['https', 'file', 'data'],
  },
  required: {
    input: {
      disabled: true,
      type: 'checkbox',
    },
  },
  strip: [
    'base',
    'embed',
    'form',
    'iframe',
    'link',
    'math',
    'meta',
    'object',
    'script',
    'style',
    'svg',
    'template',
  ],
}

export function rehypeSafeHeadingIds() {
  return function transform(tree: Root) {
    const idCounts = createHeadingIdCounts()

    visitHastNode(tree, (element) => {
      const match = /^h([1-4])$/.exec(element.tagName)
      if (!match) {
        return
      }

      element.properties.id = createUniqueHeadingId(getHastText(element), idCounts)
    })
  }
}

const sourcePositionTags = new Set([
  'blockquote',
  'details',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'table',
  'ul',
])

export function rehypeSourcePositions() {
  return function transform(tree: Root) {
    visitHastNode(tree, (element) => {
      if (!sourcePositionTags.has(element.tagName)) {
        return
      }

      const startLine = element.position?.start.line
      const endLine = element.position?.end.line
      if (!startLine || !endLine) {
        return
      }

      element.properties.dataMdviewSourceStart = startLine
      element.properties.dataMdviewSourceEnd = endLine
    })
  }
}

function visitHastNode(node: Nodes, visitor: (element: Element) => void) {
  if (node.type === 'element') {
    visitor(node)
  }

  if ('children' in node) {
    node.children.forEach((child) => visitHastNode(child, visitor))
  }
}

function getHastText(node: Nodes): string {
  if (node.type === 'text') {
    return node.value
  }

  if ('children' in node) {
    return node.children.map(getHastText).join('')
  }

  return ''
}
