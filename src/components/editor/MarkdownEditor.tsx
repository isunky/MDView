import { ImageUp } from 'lucide-react'
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
  type ReactNode,
} from 'react'
import type { MarkdownSyntaxSection } from '../../domain/markdownSyntaxReference'
import {
  applyCodeBlock,
  applyHeading,
  applyHorizontalRule,
  applyIndent,
  applyInlineCommand,
  applyListContinuation,
  applyPastedLink,
  applyTable,
  type EditorEdit,
  type SelectionRange,
} from '../../domain/editorCommands'
import {
  detectShortcutPlatform,
  matchesShortcut,
} from '../../platform/keyboardShortcuts'
import {
  MarkdownEditorToolbar,
  type MarkdownEditorToolbarLabels,
  type ToolbarFormatCommand,
} from './MarkdownEditorToolbar'
import { MarkdownSyntaxDialog } from '../dialogs/MarkdownSyntaxDialog'
import { MathEditorDialog, type MathEditorDialogLabels } from '../dialogs/MathEditorDialog'
import { applyMathExpression, findMathExpression, type MathDisplayMode, type MathExpression } from '../../domain/markdownMath'
import { getTextareaSelection, useEditorHistory } from '../../hooks/useEditorHistory'
import { useEditorImageInput } from '../../hooks/useEditorImageInput'
import { useEditorSearchMarker } from '../../hooks/useEditorSearchMarker'
import { navigateTable } from '../../domain/tableEditing'
import { editLines } from '../../domain/lineEditing'
import { useShortcutSettings, type ShortcutId } from '../../platform/shortcutSettings'

export type MarkdownEditorLabels = MarkdownEditorToolbarLabels & MathEditorDialogLabels & {
  tableHeaderPlaceholder: (column: number) => string
  tableCellPlaceholder: string
  syntaxReferenceTitle: string
  syntaxReferenceIntro: string
  syntaxReferenceCategories: string
  syntaxReferenceSafetyNote: string
  syntaxReferenceSections: MarkdownSyntaxSection[]
  copySyntax: (name: string) => string
  copiedSyntax: (name: string) => string
  copySyntaxFailed: string
  closeSyntaxReference: string
}

type MarkdownEditorProps = {
  value: string
  historyKey?: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  t: MarkdownEditorLabels
  showToolbar?: boolean
  toolbarEnd?: ReactNode
  onSelectionChange?: (selection: SelectionRange) => void
  onImportImages?: (files: File[], selection: SelectionRange) => Promise<void> | void
  supportsImageImport?: boolean
  isImportingImages?: boolean
  imageImportBusyLabel?: string
  imageDropLabel?: string
  searchMatch?: SelectionRange | null
}

export type { SelectionRange } from '../../domain/editorCommands'

export type MarkdownEditorHandle = {
  focus: () => void
  getScrollElement: () => HTMLTextAreaElement | null
  getSelection: () => SelectionRange
  setSelection: (selection: SelectionRange, options?: { focus?: boolean }) => void
}

type MarkdownCommand = ToolbarFormatCommand

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor({
  value,
  historyKey = 'default',
  onChange,
  label,
  placeholder,
  t,
  showToolbar = true,
  toolbarEnd,
  onSelectionChange,
  onImportImages,
  supportsImageImport = false,
  isImportingImages = false,
  imageImportBusyLabel,
  imageDropLabel,
  searchMatch = null,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const shortcuts = useShortcutSettings()
  const composingRef = useRef(false)
  const searchMarkerRef = useEditorSearchMarker(textareaRef, searchMatch, value)
  const [isSyntaxReferenceOpen, setIsSyntaxReferenceOpen] = useState(false)
  const [mathEditor, setMathEditor] = useState<{ expression: MathExpression | null; selection: SelectionRange; latex: string; mode: MathDisplayMode } | null>(null)
  const shortcutPlatform = detectShortcutPlatform()
  const { canUndo, canRedo, restore, update, updateSelection, beginComposition, finishComposition } = useEditorHistory({
    historyKey, value, textareaRef, onChange, onSelectionChange,
  })
  const imageInput = useEditorImageInput({
    supportsImageImport,
    onImportImages,
    onFallbackImage: () => runCommand('image'),
  })

  useImperativeHandle(ref, () => ({
    focus() {
      textareaRef.current?.focus()
    },
    getScrollElement() {
      return textareaRef.current
    },
    getSelection() {
      return textareaRef.current ? getTextareaSelection(textareaRef.current) : { start: 0, end: 0 }
    },
    setSelection(selection, options) {
      const textarea = textareaRef.current
      if (!textarea) {
        return
      }

      if (options?.focus !== false) textarea.focus()
      textarea.setSelectionRange(selection.start, selection.end)
      updateSelection(selection)
    },
  }), [updateSelection])

  function runCommand(command: MarkdownCommand) {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    applyEdit(applyInlineCommand(value, getTextareaSelection(textarea), command))
  }

  function runHeadingCommand(level: number) {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    applyEdit(applyHeading(value, getTextareaSelection(textarea), level))
  }

  function runCodeBlockCommand() {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    applyEdit(applyCodeBlock(value, getTextareaSelection(textarea)))
  }

  function runHorizontalRuleCommand() {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    applyEdit(applyHorizontalRule(value, getTextareaSelection(textarea)))
  }

  function insertTable(columns: number, rows: number) {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    applyEdit(applyTable(value, getTextareaSelection(textarea), columns, rows, t.tableHeaderPlaceholder, t.tableCellPlaceholder))
  }

  function applyEdit(edit: EditorEdit) {
    update(edit.value, edit.selection)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229) {
      event.stopPropagation()
      return
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      const direction = event.key === 'ArrowUp' ? 'up' : 'down'
      const id = `${event.shiftKey ? 'copy' : 'move'}${direction === 'up' ? 'Up' : 'Down'}` as ShortcutId
      if (!shortcuts.isEnabled(id)) return
      const edit = editLines(value, getTextareaSelection(event.currentTarget), `${event.shiftKey ? 'copy' : 'move'}-${direction}`)
      if (edit) applyEdit(edit)
      return
    }
    if (matchesShortcut(event, { key: 'k', shiftKey: true }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('deleteLine')) return
      const edit = editLines(value, getTextareaSelection(event.currentTarget), 'delete')
      if (edit) applyEdit(edit)
      return
    }
    if (matchesShortcut(event, { key: 'z' }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('undo')) return
      restore('undo')
      return
    }

    const matchesPlatformRedo = shortcutPlatform === 'macos'
      ? matchesShortcut(event, { key: 'z', shiftKey: true }, shortcutPlatform)
      : matchesShortcut(event, { key: 'y' }, shortcutPlatform)
        || matchesShortcut(event, { key: 'z', shiftKey: true }, shortcutPlatform)
    if (matchesPlatformRedo) {
      event.preventDefault()
      if (!shortcuts.isEnabled('redo')) return
      restore('redo')
      return
    }

    if (matchesShortcut(event, { key: 'b' }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('bold')) return
      runCommand('bold')
      return
    }

    if (matchesShortcut(event, { key: 'i' }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('italic')) return
      runCommand('italic')
      return
    }

    if (matchesShortcut(event, { key: 'k' }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('link')) return
      runCommand('link')
      return
    }

    if (matchesShortcut(event, { key: '7', shiftKey: true }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('orderedList')) return
      runCommand('ordered-list')
      return
    }

    if (matchesShortcut(event, { key: '8', shiftKey: true }, shortcutPlatform)) {
      event.preventDefault()
      if (!shortcuts.isEnabled('unorderedList')) return
      runCommand('unordered-list')
      return
    }

    if (event.key === 'Tab') {
      const selection = getTextareaSelection(event.currentTarget)
      const tableEdit = !event.ctrlKey && !event.altKey && !event.metaKey ? navigateTable(value, selection, event.shiftKey) : null
      const id = tableEdit ? (event.shiftKey ? 'tablePrevious' : 'tableNext') : (event.shiftKey ? 'outdent' : 'indent')
      if (!shortcuts.isEnabled(id)) return
      event.preventDefault()
      if (tableEdit?.value === value) {
        event.currentTarget.setSelectionRange(tableEdit.selection.start, tableEdit.selection.end)
        updateSelection(tableEdit.selection)
      } else {
        applyEdit(tableEdit ?? applyIndent(value, selection, event.shiftKey))
      }
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && shortcuts.isEnabled('listContinue')) {
      const edit = applyListContinuation(value, getTextareaSelection(event.currentTarget))
      if (edit) {
        applyEdit(edit)
        event.preventDefault()
      }
    }
  }

  function handleSelectionChange() {
    const textarea = textareaRef.current
    if (textarea) {
      updateSelection(getTextareaSelection(textarea))
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    imageInput.handlePaste(event)
    if (event.defaultPrevented || typeof event.clipboardData.getData !== 'function') return
    const edit = applyPastedLink(value, getTextareaSelection(event.currentTarget), event.clipboardData.getData('text/plain'))
    if (!edit) return
    event.preventDefault()
    applyEdit(edit)
  }

  function handleImageAction() {
    imageInput.openPicker(textareaRef.current)
  }

  function openMathEditor() {
    const textarea = textareaRef.current
    if (!textarea) return
    const selection = getTextareaSelection(textarea)
    const expression = findMathExpression(value, selection)
    setMathEditor({
      expression,
      selection,
      latex: expression?.latex ?? value.slice(selection.start, selection.end).trim(),
      mode: expression?.mode ?? (value.slice(selection.start, selection.end).includes('\n') ? 'block' : 'inline'),
    })
  }

  return (
    <div className="markdown-editor-shell">
      {showToolbar ? (
        <MarkdownEditorToolbar
          canRedo={canRedo}
          canUndo={canUndo}
          labels={t}
          platform={shortcutPlatform}
          toolbarEnd={toolbarEnd}
          onUndo={() => restore('undo')}
          onRedo={() => restore('redo')}
          onFormat={runCommand}
          onHeading={runHeadingCommand}
          onCodeBlock={runCodeBlockCommand}
          onHorizontalRule={runHorizontalRuleCommand}
          onImage={handleImageAction}
          onTable={insertTable}
          onOpenSyntaxReference={() => setIsSyntaxReferenceOpen(true)}
          onOpenMathEditor={openMathEditor}
          imageBusy={isImportingImages}
          imageBusyLabel={imageImportBusyLabel}
        />
      ) : null}
      <input
        ref={imageInput.imageInputRef}
        className="editor-image-input"
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.avif,image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => imageInput.handleInputChange(event.currentTarget)}
      />
      <div className="editor-search-marker-viewport" aria-hidden="true"><div ref={searchMarkerRef} className="editor-search-markers" /></div>
      <textarea
        placeholder={placeholder}
        ref={textareaRef}
        className="markdown-editor"
        aria-label={label}
        spellCheck={false}
        value={value}
        onChange={(event) => {
          const selection = getTextareaSelection(event.currentTarget)
          const input = event.nativeEvent as InputEvent
          const composing = composingRef.current || input.isComposing || input.inputType === 'insertFromComposition'
          update(event.currentTarget.value, selection, composing ? 'composition' : 'typing')
          onSelectionChange?.(selection)
        }}
        onCompositionStart={(event) => {
          composingRef.current = true
          beginComposition(getTextareaSelection(event.currentTarget))
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false
          finishComposition(event.currentTarget.value, getTextareaSelection(event.currentTarget))
        }}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onPaste={handlePaste}
        onDragEnter={imageInput.handleDragEnter}
        onDragOver={imageInput.handleDragOver}
        onDragLeave={imageInput.clearDragState}
        onDrop={imageInput.handleDrop}
      />
      {imageInput.isDragActive && imageDropLabel ? (
        <div className="image-drop-overlay" role="status">
          <ImageUp aria-hidden="true" />
          <span>{imageDropLabel}</span>
        </div>
      ) : null}

      <MarkdownSyntaxDialog
        open={isSyntaxReferenceOpen}
        title={t.syntaxReferenceTitle}
        intro={t.syntaxReferenceIntro}
        categoriesLabel={t.syntaxReferenceCategories}
        safetyNote={t.syntaxReferenceSafetyNote}
        sections={t.syntaxReferenceSections}
        copyLabel={t.copySyntax}
        copiedLabel={t.copiedSyntax}
        copyFailedLabel={t.copySyntaxFailed}
        closeLabel={t.closeSyntaxReference}
        onClose={() => setIsSyntaxReferenceOpen(false)}
      />
      {mathEditor ? <MathEditorDialog
        open
        initialLatex={mathEditor.latex}
        initialMode={mathEditor.mode}
        isEditing={Boolean(mathEditor.expression)}
        labels={t}
        onClose={() => setMathEditor(null)}
        onConfirm={(latex, mode) => {
          applyEdit(applyMathExpression(value, mathEditor.selection, latex, mode, mathEditor.expression))
          setMathEditor(null)
        }}
      /> : null}
    </div>
  )
})
