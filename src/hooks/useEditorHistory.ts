import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  createEditorHistory,
  recordEditorChange,
  redoEditorChange,
  undoEditorChange,
  updateEditorHistorySelection,
  type EditorChangeKind,
} from '../domain/editorHistory'
import type { SelectionRange } from '../domain/editorCommands'

type UseEditorHistoryOptions = {
  historyKey: string
  value: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onSelectionChange?: (selection: SelectionRange) => void
}

export function useEditorHistory({
  historyKey,
  value,
  textareaRef,
  onChange,
  onSelectionChange,
}: UseEditorHistoryOptions) {
  const pendingSelectionRef = useRef<SelectionRange | null>(null)
  const pendingValueRef = useRef<string | null>(null)
  const historyKeyRef = useRef(historyKey)
  const historyRef = useRef(createEditorHistory(value))
  const [availability, setAvailability] = useState({ canUndo: false, canRedo: false })

  function refreshAvailability() {
    setAvailability({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    })
  }

  useEffect(() => {
    if (historyKeyRef.current === historyKey) {
      return
    }

    historyKeyRef.current = historyKey
    pendingValueRef.current = null
    historyRef.current = createEditorHistory(value)
    refreshAvailability()
  }, [historyKey, value])

  useEffect(() => {
    if (historyKeyRef.current !== historyKey) {
      return
    }
    if (pendingValueRef.current === value) {
      pendingValueRef.current = null
      return
    }
    if (historyRef.current.present.value !== value) {
      const selection = textareaRef.current
        ? getTextareaSelection(textareaRef.current)
        : { start: 0, end: 0 }
      historyRef.current = recordEditorChange(historyRef.current, { value, selection }, 'external')
      refreshAvailability()
    }
  }, [historyKey, textareaRef, value])

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current
    const textarea = textareaRef.current
    if (!pendingSelection || !textarea) {
      return
    }

    pendingSelectionRef.current = null
    textarea.focus()
    textarea.setSelectionRange(pendingSelection.start, pendingSelection.end)
    onSelectionChange?.(pendingSelection)
  }, [onSelectionChange, textareaRef, value])

  function update(nextValue: string, selection: SelectionRange, kind: EditorChangeKind = 'command') {
    const currentSelection = textareaRef.current
      ? getTextareaSelection(textareaRef.current)
      : historyRef.current.present.selection
    historyRef.current = updateEditorHistorySelection(historyRef.current, currentSelection)
    historyRef.current = recordEditorChange(historyRef.current, { value: nextValue, selection }, kind)
    pendingValueRef.current = nextValue
    pendingSelectionRef.current = selection
    refreshAvailability()
    onChange(nextValue)
  }

  function restore(direction: 'undo' | 'redo') {
    const nextHistory = direction === 'undo'
      ? undoEditorChange(historyRef.current)
      : redoEditorChange(historyRef.current)
    if (nextHistory === historyRef.current) {
      return
    }

    historyRef.current = nextHistory
    pendingValueRef.current = nextHistory.present.value
    pendingSelectionRef.current = nextHistory.present.selection
    refreshAvailability()
    onChange(nextHistory.present.value)
  }

  function updateSelection(selection: SelectionRange) {
    historyRef.current = updateEditorHistorySelection(historyRef.current, selection)
    onSelectionChange?.(selection)
  }

  return { ...availability, restore, update, updateSelection }
}

export function getTextareaSelection(textarea: HTMLTextAreaElement): SelectionRange {
  return { start: textarea.selectionStart, end: textarea.selectionEnd }
}
