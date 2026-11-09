// Keep generated controls, diagrams, and formula accessibility text out of search results.
const excludedContent = 'script, style, .katex, .mermaid-diagram, .mermaid-loading, .mermaid-error, .code-block-header, .color-preview-swatch'

export function supportsSearchHighlights(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'
}

export function findPreviewSearchRanges(article: HTMLElement, query: string): Range[] {
  if (!query) return []
  const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu')
  const walker = article.ownerDocument.createTreeWalker(article, NodeFilter.SHOW_TEXT)
  const ranges: Range[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (!node.parentElement || node.parentElement.closest(excludedContent)) continue
    const value = node.textContent ?? ''
    expression.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = expression.exec(value))) {
      const range = article.ownerDocument.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      ranges.push(range)
    }
  }
  return ranges
}
