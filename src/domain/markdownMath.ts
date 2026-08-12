import type { EditorEdit, SelectionRange } from './editorCommands'

export type MathDisplayMode = 'inline' | 'block'

export type MathExpression = {
  latex: string
  mode: MathDisplayMode
  range: SelectionRange
}

const mathHintPattern = /(^|[^\\])\$|```math\b/m

export function containsMarkdownMath(value: string): boolean {
  return mathHintPattern.test(value)
}

export function findMathExpression(value: string, selection: SelectionRange): MathExpression | null {
  const blocks = Array.from(value.matchAll(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g))
  for (const match of blocks) {
    const start = match.index ?? 0
    const end = start + match[0].length
    if (selection.start >= start && selection.end <= end) {
      return { latex: match[1].trim(), mode: 'block', range: { start, end } }
    }
  }

  const inlinePattern = /(^|[^\\])\$([^\n$]+?)\$/g
  for (const match of value.matchAll(inlinePattern)) {
    const prefixLength = match[1].length
    const start = (match.index ?? 0) + prefixLength
    const end = start + match[0].length - prefixLength
    if (selection.start >= start && selection.end <= end) {
      return { latex: match[2].trim(), mode: 'inline', range: { start, end } }
    }
  }

  return null
}

export function applyMathExpression(
  value: string,
  selection: SelectionRange,
  latex: string,
  mode: MathDisplayMode,
  existing?: MathExpression | null,
): EditorEdit {
  const range = existing?.range ?? selection
  const selected = value.slice(selection.start, selection.end).trim()
  const expression = latex.trim() || selected || 'E = mc^2'
  const replacement = mode === 'block' ? `$$\n${expression}\n$$` : `$${expression}$`
  const nextValue = `${value.slice(0, range.start)}${replacement}${value.slice(range.end)}`
  const contentOffset = mode === 'block' ? 3 : 1
  const contentStart = range.start + contentOffset

  return {
    value: nextValue,
    selection: { start: contentStart, end: contentStart + expression.length },
  }
}
