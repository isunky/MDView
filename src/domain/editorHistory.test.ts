import { describe, expect, it } from 'vitest'
import {
  createEditorHistory,
  MAX_EDITOR_HISTORY_BYTES,
  recordEditorChange,
  redoEditorChange,
  undoEditorChange,
} from './editorHistory'

describe('editor history', () => {
  it('groups nearby typing and keeps commands as separate entries', () => {
    let history = createEditorHistory('')
    history = recordEditorChange(history, { value: 'a', selection: { start: 1, end: 1 } }, 'typing', 100)
    history = recordEditorChange(history, { value: 'ab', selection: { start: 2, end: 2 } }, 'typing', 200)
    history = recordEditorChange(history, { value: '**ab**', selection: { start: 2, end: 4 } }, 'command', 300)

    expect(undoEditorChange(history).present.value).toBe('ab')
    expect(undoEditorChange(undoEditorChange(history)).present.value).toBe('')
  })

  it('supports redo after undo', () => {
    const changed = recordEditorChange(
      createEditorHistory('before'),
      { value: 'after', selection: { start: 5, end: 5 } },
      'command',
      100,
    )
    const undone = undoEditorChange(changed)

    expect(redoEditorChange(undone).present.value).toBe('after')
  })

  it('limits stored undo entries', () => {
    let history = createEditorHistory('0')
    for (let index = 1; index <= 110; index += 1) {
      history = recordEditorChange(
        history,
        { value: String(index), selection: { start: 0, end: 0 } },
        'command',
        index,
      )
    }

    expect(history.past).toHaveLength(100)
  })

  it('evicts the oldest large snapshots and keeps recent undo and redo intact', () => {
    const text = 'x'.repeat(MAX_EDITOR_HISTORY_BYTES / 8)
    let history = createEditorHistory(`${text}0`)
    for (let index = 1; index <= 6; index += 1) {
      history = recordEditorChange(history, {
        value: `${text}${index}`, selection: { start: index, end: index },
      }, 'command', index)
    }

    expect(history.past.map(snapshot => snapshot.value.slice(-1))).toEqual(['4', '5'])
    const undone = undoEditorChange(undoEditorChange(history))
    expect(undone.present.value).toBe(`${text}4`)
    expect(undoEditorChange(undone)).toBe(undone)
    expect(undone.future.map(snapshot => snapshot.value.slice(-1))).toEqual(['5', '6'])
    const redone = redoEditorChange(redoEditorChange(undone))
    expect(redone.present).toEqual(history.present)
    expect(redone.past).toEqual(history.past)
  })

  it('rechecks the budget when merged typing grows the current snapshot', () => {
    const text = 'x'.repeat(MAX_EDITOR_HISTORY_BYTES / 8)
    let history = recordEditorChange(createEditorHistory(text), {
      value: `${text}a`, selection: { start: 1, end: 1 },
    }, 'typing', 100)
    expect(history.past).toHaveLength(1)

    const larger = text.repeat(3)
    history = recordEditorChange(history, {
      value: larger, selection: { start: 2, end: 2 },
    }, 'typing', 200)
    expect(history.past).toHaveLength(0)
    expect(history.present.value).toBe(larger)
  })

  it('preserves an oversized document but does not retain additional snapshots', () => {
    const value = 'x'.repeat(MAX_EDITOR_HISTORY_BYTES / 2 + 1)
    const history = recordEditorChange(createEditorHistory('before'), {
      value, selection: { start: 0, end: 0 },
    }, 'command')
    expect(history.present.value).toBe(value)
    expect(history.past).toHaveLength(0)
    expect(undoEditorChange(history)).toBe(history)

    const small = recordEditorChange(history, {
      value: 'small', selection: { start: 0, end: 0 },
    }, 'command')
    expect(small.past).toHaveLength(0)
    expect(small.present.value).toBe('small')
  })

  it('discards the redo branch on a new edit after memory-limited undo', () => {
    const text = 'x'.repeat(MAX_EDITOR_HISTORY_BYTES / 8)
    let history = createEditorHistory(text)
    for (let index = 0; index < 6; index += 1) {
      history = recordEditorChange(history, {
        value: `${text}${index}`, selection: { start: 0, end: 0 },
      }, 'command')
    }
    const branched = recordEditorChange(undoEditorChange(history), {
      value: `${text}branch`, selection: { start: 0, end: 0 },
    }, 'command')
    expect(branched.future).toHaveLength(0)
    expect(branched.past).toHaveLength(2)
    expect(redoEditorChange(branched)).toBe(branched)
  })
})
