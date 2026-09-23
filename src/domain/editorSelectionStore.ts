import type { SelectionRange } from './editorCommands'

export type EditorSelectionStore = ReturnType<typeof createEditorSelectionStore>

export function createEditorSelectionStore(initial: SelectionRange = { start: 0, end: 0 }) {
  let selection = initial
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => selection,
    setSelection(next: SelectionRange) {
      if (selection.start === next.start && selection.end === next.end) return
      selection = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
