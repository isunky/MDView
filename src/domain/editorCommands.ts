import { createMarkdownTable } from './markdownTable'

export type SelectionRange = {
  start: number
  end: number
}

export type EditorEdit = {
  value: string
  selection: SelectionRange
}

export type InlineMarkdownCommand =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'image'
  | 'quote'
  | 'unordered-list'
  | 'ordered-list'
  | 'task-list'

export function applyInlineCommand(
  value: string,
  selection: SelectionRange,
  command: InlineMarkdownCommand,
): EditorEdit {
  const selectedText = value.slice(selection.start, selection.end)
  if (command === 'bold') return wrapSelection(value, selection, selectedText || 'bold text', '**', '**')
  if (command === 'italic') return wrapSelection(value, selection, selectedText || 'italic text', '*', '*')
  if (command === 'code') return wrapSelection(value, selection, selectedText || 'code', '`', '`')
  if (command === 'link') return insertTemplate(value, selection, `[${selectedText || 'title'}](url)`, selectedText ? null : [1, 6])
  if (command === 'image') return insertTemplate(value, selection, `![${selectedText || 'alt'}](image.png)`, selectedText ? null : [2, 5])

  const prefixes = {
    quote: '> ',
    'unordered-list': '- ',
    'ordered-list': '1. ',
    'task-list': '- [ ] ',
  }
  return prefixSelectedLines(value, selection, prefixes[command])
}

export function applyHeading(value: string, selection: SelectionRange, level: number): EditorEdit {
  const range = getLineRange(value, selection)
  const prefix = `${'#'.repeat(Math.min(4, Math.max(1, level)))} `
  const replacement = value.slice(range.start, range.end).split('\n')
    .map((line) => `${prefix}${line.replace(/^#{1,6}\s+/, '')}`).join('\n')
  return replaceSelection(value, range, replacement, {
    start: range.start,
    end: range.start + replacement.length,
  })
}

export function applyCodeBlock(value: string, selection: SelectionRange): EditorEdit {
  const text = value.slice(selection.start, selection.end) || 'code'
  return insertTemplate(value, selection, `\`\`\`\n${text}\n\`\`\``, [4, 4 + text.length])
}

export function applyHorizontalRule(value: string, selection: SelectionRange): EditorEdit {
  return insertBlock(value, selection, '---', null)
}

export function applyTable(
  value: string,
  selection: SelectionRange,
  columns: number,
  rows: number,
  header: (column: number) => string,
  cell: string,
): EditorEdit {
  const firstHeader = header(1)
  const table = createMarkdownTable(columns, rows, { header, cell })
  return insertBlock(value, selection, table, [table.indexOf(firstHeader), table.indexOf(firstHeader) + firstHeader.length])
}

export function applyIndent(value: string, selection: SelectionRange, outdent: boolean): EditorEdit {
  const range = getLineRange(value, selection)
  const replacement = value.slice(range.start, range.end).split('\n')
    .map((line) => (outdent ? line.replace(/^( {1,2}|\t)/, '') : `  ${line}`)).join('\n')
  return replaceSelection(value, range, replacement, {
    start: range.start,
    end: range.start + replacement.length,
  })
}

export function applyListContinuation(value: string, selection: SelectionRange): EditorEdit | null {
  if (selection.start !== selection.end) return null
  const lineStart = value.lastIndexOf('\n', selection.start - 1) + 1
  const line = value.slice(lineStart, selection.start)
  const match = line.match(/^(\s*)(- \[ \] |- |\d+\. )(.*)$/)
  if (!match) return null
  const [, indent, marker, text] = match
  if (text.trim() === '') {
    return replaceSelection(value, { start: lineStart, end: selection.start }, '', { start: lineStart, end: lineStart })
  }
  const nextMarker = /^\d+\. $/.test(marker) ? `${Number.parseInt(marker, 10) + 1}. ` : marker
  const insertion = `\n${indent}${nextMarker}`
  const cursor = selection.start + insertion.length
  return replaceSelection(value, selection, insertion, { start: cursor, end: cursor })
}

function wrapSelection(value: string, selection: SelectionRange, text: string, before: string, after: string): EditorEdit {
  const start = selection.start + before.length
  return replaceSelection(value, selection, `${before}${text}${after}`, { start, end: start + text.length })
}

function insertTemplate(value: string, selection: SelectionRange, template: string, offset: [number, number] | null): EditorEdit {
  const cursor = selection.start + template.length
  return replaceSelection(value, selection, template, offset
    ? { start: selection.start + offset[0], end: selection.start + offset[1] }
    : { start: cursor, end: cursor })
}

function prefixSelectedLines(value: string, selection: SelectionRange, prefix: string): EditorEdit {
  const range = getLineRange(value, selection)
  const replacement = value.slice(range.start, range.end).split('\n').map((line) => `${prefix}${line}`).join('\n')
  return replaceSelection(value, range, replacement, { start: range.start, end: range.start + replacement.length })
}

function insertBlock(value: string, selection: SelectionRange, block: string, blockSelection: [number, number] | null): EditorEdit {
  const before = value.slice(0, selection.end)
  const after = value.slice(selection.end)
  const prefix = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = after.length === 0 || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const blockStart = selection.end + prefix.length
  const nextValue = `${before}${prefix}${block}${suffix}${after}`
  const nextSelection = blockSelection
    ? { start: blockStart + blockSelection[0], end: blockStart + blockSelection[1] }
    : { start: blockStart + block.length, end: blockStart + block.length }
  return { value: nextValue, selection: nextSelection }
}

function getLineRange(value: string, selection: SelectionRange): SelectionRange {
  const start = value.lastIndexOf('\n', selection.start - 1) + 1
  const lineBreak = value.indexOf('\n', Math.max(selection.end - 1, selection.start))
  return { start, end: lineBreak === -1 ? value.length : lineBreak }
}

function replaceSelection(value: string, selection: SelectionRange, replacement: string, nextSelection: SelectionRange): EditorEdit {
  return {
    value: `${value.slice(0, selection.start)}${replacement}${value.slice(selection.end)}`,
    selection: nextSelection,
  }
}
