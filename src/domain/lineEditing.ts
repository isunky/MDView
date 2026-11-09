import type { EditorEdit, SelectionRange } from './editorCommands'

type LineAction = 'move-up' | 'move-down' | 'copy-up' | 'copy-down' | 'delete'

export function editLines(value: string, selection: SelectionRange, action: LineAction): EditorEdit | null {
  const start = selection.start === 0 ? 0 : value.lastIndexOf('\n', selection.start - 1) + 1
  const searchEnd = selection.end > selection.start ? selection.end - 1 : selection.start
  const breakAt = value.indexOf('\n', searchEnd)
  const end = breakAt < 0 ? value.length : breakAt
  const block = value.slice(start, end)

  if (action === 'delete') {
    const column = selection.start - start
    if (end < value.length) {
      const nextEnd = value.indexOf('\n', end + 1)
      const nextLength = (nextEnd < 0 ? value.length : nextEnd) - end - 1
      const cursor = start + Math.min(column, nextLength)
      return { value: value.slice(0, start) + value.slice(end + 1), selection: { start: cursor, end: cursor } }
    }
    if (start === 0) return { value: '', selection: { start: 0, end: 0 } }
    const previousStart = start <= 1 ? 0 : value.lastIndexOf('\n', start - 2) + 1
    const cursor = previousStart + Math.min(column, start - 1 - previousStart)
    return { value: value.slice(0, start - 1) + value.slice(end), selection: { start: cursor, end: cursor } }
  }

  if (action === 'copy-up' || action === 'copy-down') {
    const next = value.slice(0, start) + `${block}\n${block}` + value.slice(end)
    const shift = action === 'copy-down' ? block.length + 1 : 0
    return { value: next, selection: { start: selection.start + shift, end: selection.end + shift } }
  }

  if (action === 'move-up') {
    if (start === 0) return null
    const previousStart = start <= 1 ? 0 : value.lastIndexOf('\n', start - 2) + 1
    const previousLine = value.slice(previousStart, start - 1)
    const next = value.slice(0, previousStart) + `${block}\n${previousLine}` + value.slice(end)
    const shift = previousStart - start
    return { value: next, selection: { start: selection.start + shift, end: selection.end + shift } }
  }

  if (end === value.length) return null
  const followingBreak = value.indexOf('\n', end + 1)
  const followingEnd = followingBreak < 0 ? value.length : followingBreak
  const followingLine = value.slice(end + 1, followingEnd)
  const next = value.slice(0, start) + `${followingLine}\n${block}` + value.slice(followingEnd)
  const shift = followingLine.length + 1
  return { value: next, selection: { start: selection.start + shift, end: Math.min(selection.end + shift, next.length) } }
}
