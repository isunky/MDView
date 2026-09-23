import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createEditorSelectionStore } from '../domain/editorSelectionStore'
import { getLineStartOffsets } from '../domain/documentStatistics'
import { EditorStatusBar } from './EditorStatusBar'

describe('EditorStatusBar', () => {
  it('updates cursor position from the isolated selection store', () => {
    const content = 'first\n中文!'
    const selectionStore = createEditorSelectionStore()
    render(
      <EditorStatusBar
        content={content}
        isDirty={false}
        isSaving={false}
        labels={{
          characterCount: count => `${count} chars`,
          cursorPosition: (line, column) => `Ln ${line}, Col ${column}`,
          readingTime: minutes => `${minutes} min`,
          saved: 'Saved',
          saving: 'Saving',
          unsaved: 'Unsaved',
          wordCount: count => `${count} words`,
        }}
        lineStartOffsets={getLineStartOffsets(content)}
        selectionStore={selectionStore}
        statistics={{ characterCount: 8, wordCount: 2, readingMinutes: 1 }}
      />,
    )

    expect(screen.getByText('Ln 1, Col 1')).toBeInTheDocument()
    act(() => selectionStore.setSelection({ start: 8, end: 8 }))
    expect(screen.getByText('Ln 2, Col 3')).toBeInTheDocument()
  })
})
