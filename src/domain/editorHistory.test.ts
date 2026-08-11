import { describe, expect, it } from 'vitest'
import {
  createEditorHistory,
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
})
