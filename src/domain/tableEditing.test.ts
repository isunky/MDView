import { describe, expect, it } from 'vitest'
import { navigateTable } from './tableEditing'

function selectionOf(value: string, text: string, startAt = 0) {
  const start = value.indexOf(text, startAt)
  return { start, end: start + text.length }
}

describe('table cell navigation', () => {
  const table = '| Name | Value |\n| --- | :---: |\n| first | second |'

  it('moves through header and body cells and skips the separator', () => {
    const secondHeader = navigateTable(table, selectionOf(table, 'Name'), false)!
    expect(table.slice(secondHeader.selection.start, secondHeader.selection.end)).toBe('Value')
    const firstBody = navigateTable(table, secondHeader.selection, false)!
    expect(table.slice(firstBody.selection.start, firstBody.selection.end)).toBe('first')
    const previous = navigateTable(table, firstBody.selection, true)!
    expect(table.slice(previous.selection.start, previous.selection.end)).toBe('Value')
    const fromSeparator = navigateTable(table, selectionOf(table, '---'), false)!
    expect(table.slice(fromSeparator.selection.start, fromSeparator.selection.end)).toBe('first')
  })

  it('adds an empty row at the end and keeps following content intact', () => {
    const value = `${table}\n\nNext paragraph`
    const edit = navigateTable(value, selectionOf(value, 'second'), false)!
    expect(edit.value).toBe(`${table}\n|   |   |\n\nNext paragraph`)
    expect(edit.selection.start).toBe(edit.selection.end)
    expect(edit.value.slice(edit.selection.start - 2, edit.selection.start + 2)).toBe('|   ')
  })

  it('adds the first body row after a header-only table', () => {
    const value = '| A | B |\n| --- | --- |\n\nText'
    const edit = navigateTable(value, selectionOf(value, 'B'), false)!
    expect(edit.value).toBe('| A | B |\n| --- | --- |\n|   |   |\n\nText')
  })

  it('recognizes escaped pipes and tables without outer pipes', () => {
    const value = 'a\\|b | c\n--- | ---\n1 | 2'
    const next = navigateTable(value, selectionOf(value, 'a\\|b'), false)!
    expect(value.slice(next.selection.start, next.selection.end)).toBe('c')
    const added = navigateTable(value, selectionOf(value, '2'), false)!
    expect(added.value).toBe(`${value}\n|   |   |`)
  })

  it('leaves non-tables, fenced code and multi-line selections to normal editing', () => {
    expect(navigateTable('ordinary text', { start: 0, end: 0 }, false)).toBeNull()
    const code = `\`\`\`md\n${table}\n\`\`\``
    expect(navigateTable(code, selectionOf(code, 'Name'), false)).toBeNull()
    expect(navigateTable(table, { start: 2, end: table.length }, false)).toBeNull()
    expect(navigateTable('    | a |\n    | - |', { start: 6, end: 7 }, false)).toBeNull()
    expect(navigateTable('escaped\\|pipe\n---', { start: 0, end: 7 }, false)).toBeNull()
    expect(navigateTable('# heading | text\n--- | ---', { start: 2, end: 9 }, false)).toBeNull()
  })
})
