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

export function applyPastedLink(value: string, selection: SelectionRange, clipboardText: string): EditorEdit | null {
  const label = value.slice(selection.start, selection.end)
  const input = clipboardText.trim()
  if (!label.trim() || /[\r\n]/.test(label) || !/^https?:\/\//i.test(input) || /\s/.test(input)) return null
  let destination: string
  try {
    const url = new URL(input)
    if (!url.hostname || (url.protocol !== 'http:' && url.protocol !== 'https:')) return null
    destination = url.href.replace(/[()]/g, (char) => char === '(' ? '%28' : '%29')
      .replace(/&(?=(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]{1,31});)/gi, '&amp;')
  } catch {
    return null
  }
  const escapedLabel = label.replace(/\\*(?:\[|])/g, (match) =>
    match.length % 2 === 1 ? `${match.slice(0, -1)}\\${match.slice(-1)}` : match,
  )
  const replacement = `[${escapedLabel}](${destination})`
  const cursor = selection.start + replacement.length
  return replaceSelection(value, selection, replacement, { start: cursor, end: cursor })
}

export function applyInlineCommand(
  value: string,
  selection: SelectionRange,
  command: InlineMarkdownCommand,
): EditorEdit {
  const selectedText = value.slice(selection.start, selection.end)
  if (command === 'bold') return toggleInlineFormat(value, selection, selectedText || 'bold text', ['**', '__'])
  if (command === 'italic') return toggleInlineFormat(value, selection, selectedText || 'italic text', ['*', '_'])
  if (command === 'code') return toggleInlineFormat(value, selection, selectedText || 'code', ['`'])
  if (command === 'link') return insertTemplate(value, selection, `[${selectedText || 'title'}](url)`, selectedText ? null : [1, 6])
  if (command === 'image') return insertTemplate(value, selection, `![${selectedText || 'alt'}](image.png)`, selectedText ? null : [2, 5])

  return toggleLineFormat(value, selection, command)
}

export function applyHeading(value: string, selection: SelectionRange, level: number): EditorEdit {
  const range = getLineRange(value, selection)
  const prefix = `${'#'.repeat(Math.min(4, Math.max(1, level)))} `
  const lines = value.slice(range.start, range.end).split('\n')
  const populated = lines.filter((line) => line.trim())
  const remove = populated.length > 0 && populated.every((line) => {
    const match = line.match(/^[ \t]{0,3}(#{1,6})[ \t]+/)
    return match?.[1].length === prefix.length - 1
  })
  const replacement = lines.map((line) => {
    if (!line.trim() && lines.length > 1) return line
    const match = line.match(/^([ \t]{0,3})#{1,6}[ \t]+/)
    const indent = match?.[1] ?? line.match(/^([ \t]{0,3})(?=\S)/)?.[1] ?? ''
    const text = match ? line.slice(match[0].length) : line.slice(indent.length)
    return `${indent}${remove ? '' : prefix}${text}`
  }).join('\n')
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
  const nextLineBreak = value.indexOf('\n', lineStart)
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak
  const line = parseListLine(value.slice(lineStart, lineEnd))
  if (!line || selection.start < lineStart + line.prefixLength || isInsideFencedCode(value, lineStart)) return null
  const indent = indentationWidth(line.indent)
  const parent = indent > 0 ? findParentList(value, lineStart, indent) : null
  // Four spaces or a tab without a list parent form an indented code block.
  if (indent >= 4 && !parent) return null

  if (line.text.trim() === '') {
    const replacement = parent ? nextListPrefix(parent) : ''
    const cursor = lineStart + replacement.length
    return replaceSelection(value, { start: lineStart, end: lineEnd }, replacement, { start: cursor, end: cursor })
  }
  const insertion = `\n${nextListPrefix(line)}`
  const cursor = selection.start + insertion.length
  return replaceSelection(value, selection, insertion, { start: cursor, end: cursor })
}

type ListLine = { indent: string; marker: string; spacing: string; taskStatus?: string; taskSpacing?: string; text: string; prefixLength: number }

function parseListLine(line: string): ListLine | null {
  const match = line.match(/^([ \t]*)([-+*]|\d{1,9}[.)])([ \t]+)(?:\[([ xX])\]([ \t]+|$))?(.*)$/)
  if (!match) return null
  const [, indent, marker, spacing, task, taskSpacing, text] = match
  return { indent, marker, spacing, taskStatus: task, taskSpacing, text, prefixLength: indent.length + marker.length + spacing.length + (task === undefined ? 0 : 3 + taskSpacing.length) }
}

function nextListPrefix(line: ListLine): string {
  const numbered = line.marker.match(/^(\d+)([.)])$/)
  const marker = numbered ? `${Number(numbered[1]) + 1}${numbered[2]}` : line.marker
  return `${line.indent}${marker}${line.spacing}${line.taskSpacing === undefined ? '' : `[ ]${line.taskSpacing || ' '}`}`
}

function indentationWidth(indent: string): number {
  let width = 0
  for (const char of indent) width += char === '\t' ? 4 - width % 4 : 1
  return width
}

function findParentList(value: string, lineStart: number, currentIndent: number): ListLine | null {
  if (currentIndent === 0) return null
  const previousLines = value.slice(0, lineStart).split('\n')
  for (let index = previousLines.length - 1; index >= 0; index--) {
    const text = previousLines[index]
    if (!text.trim()) continue
    const candidate = parseListLine(text)
    const indent = indentationWidth(text.match(/^[ \t]*/)?.[0] ?? '')
    if (indent < currentIndent) return candidate
  }
  return null
}

function isInsideFencedCode(value: string, lineStart: number): boolean {
  let fence: { marker: string; length: number } | null = null
  for (const line of value.slice(0, lineStart).split('\n')) {
    const match = line.match(/^[ \t]*(?:(?:>[ \t]?|(?:[-+*]|\d{1,9}[.)])[ \t]+)[ \t]*)*(`{3,}|~{3,})(.*)$/)
    if (!match) continue
    const [, marker, rest] = match
    if (fence) {
      if (marker[0] === fence.marker && marker.length >= fence.length && !rest.trim()) fence = null
    } else if (marker[0] !== '`' || !rest.includes('`')) {
      fence = { marker: marker[0], length: marker.length }
    }
  }
  return fence !== null
}

function toggleInlineFormat(value: string, selection: SelectionRange, text: string, markers: string[]): EditorEdit {
  if (selection.start !== selection.end) {
    for (const marker of markers) {
      const length = marker.length
      const outsideStart = selection.start - length
      const outsideEnd = selection.end + length
      if (outsideStart >= 0 && value.slice(outsideStart, selection.start) === marker && value.slice(selection.end, outsideEnd) === marker && isMatchingMarkerPair(value, outsideStart, selection.end, marker)) {
        return replaceSelection(value, { start: outsideStart, end: outsideEnd }, text, { start: outsideStart, end: outsideStart + text.length })
      }
      if (text.length > length * 2 && text.startsWith(marker) && text.endsWith(marker) && isMatchingMarkerPair(value, selection.start, selection.end - length, marker)) {
        const unwrapped = text.slice(length, -length)
        return replaceSelection(value, selection, unwrapped, { start: selection.start, end: selection.start + unwrapped.length })
      }
    }
  }
  const marker = markers[0]
  const start = selection.start + marker.length
  return replaceSelection(value, selection, `${marker}${text}${marker}`, { start, end: start + text.length })
}

function isMatchingMarkerPair(value: string, start: number, end: number, marker: string): boolean {
  if (isStandaloneMarker(value, start, marker) && isStandaloneMarker(value, end, marker) && hasSafeUnderscoreBoundaries(value, start, end + marker.length, marker)) return true
  if ((marker[0] !== '*' && marker[0] !== '_') || marker.length > 2) return false
  const otherLength = 3 - marker.length
  const outer = marker[0].repeat(otherLength)
  return value.slice(start - otherLength, start) === outer
    && value.slice(end + marker.length, end + 3) === outer
    && isStandaloneMarker(value, start - otherLength, marker[0].repeat(3))
    && isStandaloneMarker(value, end, marker[0].repeat(3))
    && hasSafeUnderscoreBoundaries(value, start - otherLength, end + 3, marker)
}

function hasSafeUnderscoreBoundaries(value: string, start: number, end: number, marker: string): boolean {
  return marker[0] !== '_' || (!/[\p{L}\p{N}_]/u.test(value[start - 1] ?? '') && !/[\p{L}\p{N}_]/u.test(value[end] ?? ''))
}

function isStandaloneMarker(value: string, start: number, marker: string): boolean {
  if (value[start - 1] === marker[0] || value[start + marker.length] === marker[0]) return false
  let slashCount = 0
  for (let index = start - 1; index >= 0 && value[index] === '\\'; index--) slashCount++
  return slashCount % 2 === 0
}

function insertTemplate(value: string, selection: SelectionRange, template: string, offset: [number, number] | null): EditorEdit {
  const cursor = selection.start + template.length
  return replaceSelection(value, selection, template, offset
    ? { start: selection.start + offset[0], end: selection.start + offset[1] }
    : { start: cursor, end: cursor })
}

function toggleLineFormat(value: string, selection: SelectionRange, command: 'quote' | 'unordered-list' | 'ordered-list' | 'task-list'): EditorEdit {
  const range = getLineRange(value, selection)
  const lines = value.slice(range.start, range.end).split('\n')
  const populated = lines.filter((line) => line.trim())
  const isActive = (line: string) => {
    if (command === 'quote') return /^[ \t]*>[ \t]?/.test(line)
    const parsed = parseListLine(line)
    if (!parsed) return false
    if (command === 'task-list') return parsed.taskSpacing !== undefined
    if (parsed.taskSpacing !== undefined) return false
    return command === 'ordered-list' ? /^\d/.test(parsed.marker) : /^[-+*]$/.test(parsed.marker)
  }
  const remove = populated.length > 0 && populated.every(isActive)
  const replacement = lines.map((line) => {
    if (!line.trim() && lines.length > 1) return line
    if (command === 'quote') {
      if (remove) return line.replace(/^([ \t]*)>[ \t]?/, '$1')
      return isActive(line) ? line : line.replace(/^([ \t]*)/, '$1> ')
    }
    const parsed = parseListLine(line)
    const indent = parsed?.indent ?? line.match(/^[ \t]*/)?.[0] ?? ''
    if (remove) return parsed ? indent + parsed.text : line
    if (isActive(line)) return line
    const task = parsed?.taskStatus !== undefined && command !== 'task-list' ? `[${parsed.taskStatus}]${parsed.taskSpacing || ' '}` : ''
    const text = parsed ? task + parsed.text : line.slice(indent.length)
    const prefix = command === 'task-list' ? '- [ ] ' : command === 'ordered-list' ? '1. ' : '- '
    return `${indent}${prefix}${text}`
  }).join('\n')
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
