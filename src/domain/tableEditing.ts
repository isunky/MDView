import { isInsideFencedCode, type EditorEdit, type SelectionRange } from './editorCommands'

type Cell = { start: number; end: number; contentStart: number; contentEnd: number }
type Row = { start: number; end: number; cells: Cell[]; pipeCount: number; indent: string }

const blockStart = /^ {0,3}(?:#{1,6}\s|>|(?:[-+*]|\d+[.)])\s|`{3,}|~{3,}|<)/

// Navigation returns an unchanged value. Adding a row returns a normal editor edit.
export function navigateTable(value: string, selection: SelectionRange, backwards: boolean): EditorEdit | null {
  const lines = value.split('\n')
  const starts: number[] = []
  let offset = 0
  for (const line of lines) { starts.push(offset); offset += line.length + 1 }
  const lineIndex = starts.findIndex((start, index) => selection.start >= start && (index === starts.length - 1 || selection.start < starts[index + 1]))
  if (lineIndex < 0 || selection.end > starts[lineIndex] + lines[lineIndex].length) return null

  for (let separatorIndex = Math.min(lineIndex + 1, lines.length - 1); separatorIndex >= 1; separatorIndex--) {
    if (!lines[separatorIndex].trim()) {
      if (separatorIndex > lineIndex) continue
      break
    }
    const separator = parseRow(lines[separatorIndex], starts[separatorIndex])
    if (!separator || !separator.cells.every((cell) => /^:?-+:?$/.test(value.slice(cell.contentStart, cell.contentEnd)))) continue
    const header = parseRow(lines[separatorIndex - 1], starts[separatorIndex - 1])
    if (!header || blockStart.test(lines[separatorIndex - 1]) || header.cells.length !== separator.cells.length || (!separator.pipeCount && !header.pipeCount)) continue
    if (isInsideFencedCode(value, header.start)) return null

    const rows = [header]
    for (let index = separatorIndex + 1; index < lines.length; index++) {
      const line = lines[index]
      if (!line.trim() || blockStart.test(line)) break
      const row = parseRow(line, starts[index])
      if (!row) break
      row.cells = row.cells.slice(0, header.cells.length)
      rows.push(row)
    }
    if (lineIndex === separatorIndex) {
      if (!separator.cells.some((cell) => selection.start >= cell.start && selection.end <= cell.end)) return null
      const target = backwards ? header.cells.at(-1) : rows[1]?.cells[0]
      if (!target) return appendEmptyRow(value, separator.end, header)
      return { value, selection: { start: target.contentStart, end: target.contentEnd } }
    }
    const rowIndex = rows.findIndex((row) => row.start === starts[lineIndex])
    if (rowIndex < 0) continue
    const row = rows[rowIndex]
    const column = row.cells.findIndex((cell) => selection.start >= cell.start && selection.end <= cell.end)
    if (column < 0) return null
    let target: Cell | undefined
    if (backwards) {
      target = row.cells[column - 1] ?? rows[rowIndex - 1]?.cells.at(-1) ?? row.cells[0]
    } else {
      target = row.cells[column + 1] ?? rows[rowIndex + 1]?.cells[0]
      if (!target) {
        const insertAt = rowIndex === 0 ? separator.end : row.end
        return appendEmptyRow(value, insertAt, header)
      }
    }
    return { value, selection: { start: target.contentStart, end: target.contentEnd } }
  }
  return null
}

function appendEmptyRow(value: string, insertAt: number, header: Row): EditorEdit {
  const rowText = `${header.indent}| ${Array(header.cells.length).fill(' ').join(' | ')} |`
  const updated = value.slice(0, insertAt) + `\n${rowText}` + value.slice(insertAt)
  const added = parseRow(rowText, insertAt + 1)!
  const cursor = added.cells[0].contentStart
  return { value: updated, selection: { start: cursor, end: cursor } }
}

function parseRow(line: string, start: number): Row | null {
  if (!line.trim() || /^(?: {4}|\t)/.test(line)) return null
  const pipes: number[] = []
  for (let index = 0; index < line.length; index++) {
    if (line[index] !== '|') continue
    let slashes = 0
    for (let previous = index - 1; previous >= 0 && line[previous] === '\\'; previous--) slashes++
    if (slashes % 2 === 0) pipes.push(index)
  }
  const leadingPipe = pipes.length > 0 && !line.slice(0, pipes[0]).trim()
  const trailingPipe = pipes.length > 0 && !line.slice(pipes[pipes.length - 1] + 1).trim()
  const boundaries = [-1, ...pipes, line.length]
  const cells: Cell[] = []
  for (let index = leadingPipe ? 1 : 0; index < boundaries.length - 1 - (trailingPipe ? 1 : 0); index++) {
    const cellStart = boundaries[index] + 1
    const cellEnd = boundaries[index + 1]
    const text = line.slice(cellStart, cellEnd)
    const trimmed = text.trim()
    const contentStart = trimmed ? cellStart + text.indexOf(trimmed) : cellStart + Math.min(1, text.length)
    cells.push({ start: start + cellStart, end: start + cellEnd, contentStart: start + contentStart, contentEnd: start + contentStart + trimmed.length })
  }
  if (!cells.length) return null
  return { start, end: start + line.length, cells, pipeCount: pipes.length, indent: line.match(/^ {0,3}/)?.[0] ?? '' }
}
