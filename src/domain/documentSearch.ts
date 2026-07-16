export type TextMatch = {
  start: number
  end: number
}

export function findTextMatches(content: string, query: string): TextMatch[] {
  if (!query) {
    return []
  }

  const expression = new RegExp(escapeRegularExpression(query), 'giu')
  const matches: TextMatch[] = []
  let match: RegExpExecArray | null

  while ((match = expression.exec(content))) {
    matches.push({ start: match.index, end: match.index + match[0].length })
  }

  return matches
}

export function replaceTextMatch(
  content: string,
  match: TextMatch,
  replacement: string,
): string {
  return `${content.slice(0, match.start)}${replacement}${content.slice(match.end)}`
}

export function replaceAllTextMatches(content: string, query: string, replacement: string): string {
  const matches = findTextMatches(content, query)
  if (matches.length === 0) {
    return content
  }

  let nextContent = ''
  let cursor = 0
  for (const match of matches) {
    nextContent += `${content.slice(cursor, match.start)}${replacement}`
    cursor = match.end
  }

  return `${nextContent}${content.slice(cursor)}`
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
