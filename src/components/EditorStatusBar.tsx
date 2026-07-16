import type { CursorPosition, DocumentStatistics } from '../domain/documentStatistics'

export type EditorStatusBarLabels = {
  characterCount: (count: number) => string
  cursorPosition: (line: number, column: number) => string
  readingTime: (minutes: number) => string
  saved: string
  saving: string
  unsaved: string
  wordCount: (count: number) => string
}

type EditorStatusBarProps = {
  cursorPosition: CursorPosition
  isDirty: boolean
  isSaving: boolean
  labels: EditorStatusBarLabels
  statistics: DocumentStatistics
}

export function EditorStatusBar({
  cursorPosition,
  isDirty,
  isSaving,
  labels,
  statistics,
}: EditorStatusBarProps) {
  const saveState = isSaving ? labels.saving : isDirty ? labels.unsaved : labels.saved

  return (
    <footer className="editor-status-bar" aria-label="Document status">
      <span className={`editor-save-state ${isSaving ? 'saving' : isDirty ? 'dirty' : 'saved'}`}>
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
