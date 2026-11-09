import { describe, expect, it } from 'vitest'
import { editLines } from './lineEditing'

describe('line editing', () => {
  const value = 'first\nsecond\nthird'

  it('moves the current line and keeps the cursor column', () => {
    expect(editLines(value, { start: 8, end: 8 }, 'move-up')).toEqual({
      value: 'second\nfirst\nthird', selection: { start: 2, end: 2 },
    })
    expect(editLines(value, { start: 8, end: 8 }, 'move-down')).toEqual({
      value: 'first\nthird\nsecond', selection: { start: 14, end: 14 },
    })
    expect(editLines(value, { start: 2, end: 2 }, 'move-up')).toBeNull()
    expect(editLines(value, { start: value.length, end: value.length }, 'move-down')).toBeNull()
  })

  it('moves selected lines together without including the next line at its start', () => {
    const selected = { start: 0, end: 13 }
    const input = 'one\ntwo\nthree\nfour'
    selected.end = input.indexOf('four')
    const moved = editLines(input, selected, 'move-down')!
    expect(moved.value).toBe('four\none\ntwo\nthree')
    expect(moved.value.slice(moved.selection.start, moved.selection.end)).toBe('one\ntwo\nthree')
  })

  it('duplicates current or selected lines above and below', () => {
    expect(editLines(value, { start: 8, end: 8 }, 'copy-up')).toEqual({
      value: 'first\nsecond\nsecond\nthird', selection: { start: 8, end: 8 },
    })
    expect(editLines(value, { start: 8, end: 8 }, 'copy-down')).toEqual({
      value: 'first\nsecond\nsecond\nthird', selection: { start: 15, end: 15 },
    })
    expect(editLines('a\nb\nc', { start: 0, end: 4 }, 'copy-down')?.value).toBe('a\nb\na\nb\nc')
  })

  it('deletes lines and places the caret on the nearest remaining line', () => {
    expect(editLines(value, { start: 8, end: 8 }, 'delete')).toEqual({ value: 'first\nthird', selection: { start: 8, end: 8 } })
    expect(editLines(value, { start: 15, end: 15 }, 'delete')).toEqual({ value: 'first\nsecond', selection: { start: 8, end: 8 } })
    expect(editLines('only', { start: 2, end: 2 }, 'delete')).toEqual({ value: '', selection: { start: 0, end: 0 } })
    expect(editLines('a\nb\nc', { start: 0, end: 4 }, 'delete')?.value).toBe('c')
  })

  it('handles empty lines, an empty document, and trailing newlines', () => {
    expect(editLines('', { start: 0, end: 0 }, 'copy-down')?.value).toBe('\n')
    expect(editLines('\na', { start: 0, end: 0 }, 'move-down')?.value).toBe('a\n')
    expect(editLines('a\n', { start: 2, end: 2 }, 'delete')?.value).toBe('a')
    expect(editLines('a\nb\n', { start: 2, end: 2 }, 'copy-down')?.value).toBe('a\nb\nb\n')
  })
})
