import { useMemo, useSyncExternalStore } from 'react'
import { getCursorPosition } from '../../domain/documentStatistics'
import type { EditorSelectionStore } from '../../domain/editorSelectionStore'
import { useDocumentStatistics } from '../../hooks/useDocumentStatistics'

export type EditorStatusBarLabels = {
  characterCount: (count: number) => string
  cursorPosition: (line: number, column: number) => string
  readingTime: (minutes: number) => string
  saved: string
  notSavedToFile?: string
  saving: string
  unsaved: string
  wordCount: (count: number) => string
}

type EditorStatusBarProps = {
  content: string
  hasFile?: boolean
  isDirty: boolean
  isSaving: boolean
  labels: EditorStatusBarLabels
  lineStartOffsets: number[]
  selectionStore: EditorSelectionStore
}

export function EditorStatusBar({
  content,
  isDirty,
  hasFile = true,
  isSaving,
  labels,
  lineStartOffsets,
  selectionStore,
}: EditorStatusBarProps) {
  const statistics = useDocumentStatistics(content)
  const selection = useSyncExternalStore(
    selectionStore.subscribe,
    selectionStore.getSnapshot,
    selectionStore.getSnapshot,
  )
  const cursorPosition = useMemo(
    () => getCursorPosition(content, selection.end, lineStartOffsets),
    [content, lineStartOffsets, selection.end],
  )
  const saveState = isSaving ? labels.saving : isDirty ? labels.unsaved : !hasFile ? labels.notSavedToFile ?? labels.unsaved : labels.saved

  return (
    <footer className="editor-status-bar" aria-label="Document status">
      <span className={`editor-save-state ${isSaving ? 'saving' : isDirty || !hasFile ? 'dirty' : 'saved'}`}>
        {saveState}
      </span>
      <span>{labels.wordCount(statistics.wordCount)}</span>
      <span>{labels.characterCount(statistics.characterCount)}</span>
      <span>{labels.readingTime(statistics.readingMinutes)}</span>
      <span className="editor-status-position">
        {labels.cursorPosition(cursorPosition.line, cursorPosition.column)}
      </span>
    </footer>
  )
}
