type SearchTreeNode = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  value?: string
  children?: SearchTreeNode[]
}

export function createSearchHighlightPlugin(query: string) {
  const expression = query ? new RegExp(escapeRegularExpression(query), 'giu') : null

  return () => (tree: SearchTreeNode) => {
    if (!expression) return
    let matchIndex = 0
    highlightSearchMatches(tree, expression, () => matchIndex++)
  }
}

function highlightSearchMatches(node: SearchTreeNode, expression: RegExp, nextMatchIndex: () => number) {
  if (!node.children || shouldSkipSearchHighlight(node)) return

  node.children = node.children.flatMap((child) => {
    if (child.type !== 'text' || !child.value) {
      highlightSearchMatches(child, expression, nextMatchIndex)
      return child
    }
    return splitSearchTextNode(child.value, expression, nextMatchIndex)
  })
}

function splitSearchTextNode(value: string, expression: RegExp, nextMatchIndex: () => number): SearchTreeNode[] {
  expression.lastIndex = 0
  const nodes: SearchTreeNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = expression.exec(value))) {
    if (match.index > cursor) nodes.push({ type: 'text', value: value.slice(cursor, match.index) })
    nodes.push({
      type: 'element',
      tagName: 'mark',
      properties: { className: ['search-match'], dataMdviewSearchMatch: String(nextMatchIndex()) },
      children: [{ type: 'text', value: match[0] }],
    })
    cursor = match.index + match[0].length
  }

  if (nodes.length === 0) return [{ type: 'text', value }]
  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) })
  return nodes
}

function shouldSkipSearchHighlight(node: SearchTreeNode): boolean {
  if (node.tagName === 'script' || node.tagName === 'style') return true
  if (node.tagName !== 'pre') return false
  return Boolean(node.children?.some((child) => {
    const className = child.properties?.className
    return Array.isArray(className) && className.includes('language-mermaid')
  }))
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
