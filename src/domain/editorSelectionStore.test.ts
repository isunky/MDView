import { describe, expect, it, vi } from 'vitest'
import { createEditorSelectionStore } from './editorSelectionStore'

describe('editor selection store', () => {
  it('notifies subscribers only when the selection changes', () => {
    const store = createEditorSelectionStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setSelection({ start: 0, end: 0 })
    expect(listener).not.toHaveBeenCalled()

    store.setSelection({ start: 4, end: 7 })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toEqual({ start: 4, end: 7 })

    unsubscribe()
    store.setSelection({ start: 8, end: 8 })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
