import type { Content, Heading, PhrasingContent, Root } from 'mdast'
import type { Ref } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github.css'
import { createHeadingIdCounts, createUniqueHeadingId } from '../domain/markdownOutline'

type MarkdownPreviewProps = {
  content: string
  previewRef?: Ref<HTMLElement>
}

export function MarkdownPreview({ content, previewRef }: MarkdownPreviewProps) {
  return (
    <article className="markdown-preview" aria-label="Markdown preview" ref={previewRef}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkHeadingIds]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </article>
  )
}

function remarkHeadingIds() {
  return function transform(tree: Root) {
    const idCounts = createHeadingIdCounts()
    visitMarkdownNode(tree, (node) => {
      if (node.type !== 'heading' || node.depth > 3) {
        return
      }

      const data = ((node.data ??= {}) as Heading['data'] & {
        hProperties?: Record<string, string>
      })
      data.hProperties = {
        ...data.hProperties,
        id: createUniqueHeadingId(getMarkdownNodeText(node.children), idCounts),
      }
    })
  }
}

function visitMarkdownNode(node: Root | Content, visitor: (node: Content) => void) {
  if (node.type !== 'root') {
    visitor(node)
  }

  if ('children' in node) {
    node.children.forEach((child) => visitMarkdownNode(child, visitor))
  }
}

function getMarkdownNodeText(nodes: PhrasingContent[]): string {
  return nodes.map(getMarkdownChildText).join('')
}

function getMarkdownChildText(node: PhrasingContent): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value
  }

  if ('children' in node) {
    return getMarkdownNodeText(node.children)
  }

  return ''
}
