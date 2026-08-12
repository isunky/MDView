import { ImageUp } from 'lucide-react'
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { MarkdownSyntaxSection } from '../domain/markdownSyntaxReference'
import {
  applyCodeBlock,
  applyHeading,
  applyHorizontalRule,
  applyIndent,
  applyInlineCommand,
  applyListContinuation,
  applyTable,
  type EditorEdit,
  type SelectionRange,
} from '../domain/editorCommands'
import {
  detectShortcutPlatform,
  matchesShortcut,
} from '../platform/keyboardShortcuts'
import {
  MarkdownEditorToolbar,
  type MarkdownEditorToolbarLabels,
  type ToolbarFormatCommand,
} from './MarkdownEditorToolbar'
import { MarkdownSyntaxDialog } from './MarkdownSyntaxDialog'
import { MathEditorDialog, type MathEditorDialogLabels } from './MathEditorDialog'
import { applyMathExpression, findMathExpression, type MathDisplayMode, type MathExpression } from '../domain/markdownMath'
import { getTextareaSelection, useEditorHistory } from '../hooks/useEditorHistory'
import { useEditorImageInput } from '../hooks/useEditorImageInput'

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
  t: MarkdownEditorLabels
  showToolbar?: boolean
  toolbarEnd?: ReactNode
  onSelectionChange?: (selection: SelectionRange) => void
  onImportImages?: (files: File[], selection: SelectionRange) => Promise<void> | void
  supportsImageImport?: boolean
  isImportingImages?: boolean
  imageImportBusyLabel?: string
  imageDropLabel?: string
}

export type { SelectionRange } from '../domain/editorCommands'

export type MarkdownEditorHandle = {
  focus: () => void
  getScrollElement: () => HTMLTextAreaElement | null
  getSelection: () => SelectionRange
  setSelection: (selection: SelectionRange) => void
}

type MarkdownCommand = ToolbarFormatCommand

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor({
  value,
  historyKey = 'default',
  onChange,
  label,
  t,
  showToolbar = true,
  toolbarEnd,
  onSelectionChange,
  onImportImages,
  supportsImageImport = false,
  isImportingImages = false,
  imageImportBusyLabel,
  imageDropLabel,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [isSyntaxReferenceOpen, setIsSyntaxReferenceOpen] = useState(false)
  const [mathEditor, setMathEditor] = useState<{ expression: MathExpression | null; selection: SelectionRange; latex: string; mode: MathDisplayMode } | null>(null)
  const shortcutPlatform = detectShortcutPlatform()
  const { canUndo, canRedo, restore, update, updateSelection } = useEditorHistory({
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
    setSelection(selection) {
      const textarea = textareaRef.current
      if (!textarea) {
        return
      }

      textarea.focus()
      textarea.setSelectionRange(selection.start, selection.end)
      onSelectionChange?.(selection)
    },
  }), [onSelectionChange])

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
    if (matchesShortcut(event, { key: 'z' }, shortcutPlatform)) {
      event.preventDefault()
      restore('undo')
      return
    }

    const matchesPlatformRedo = shortcutPlatform === 'macos'
      ? matchesShortcut(event, { key: 'z', shiftKey: true }, shortcutPlatform)
      : matchesShortcut(event, { key: 'y' }, shortcutPlatform)
        || matchesShortcut(event, { key: 'z', shiftKey: true }, shortcutPlatform)
    if (matchesPlatformRedo) {
      event.preventDefault()
      restore('redo')
      return
    }

    if (matchesShortcut(event, { key: 'b' }, shortcutPlatform)) {
      event.preventDefault()
      runCommand('bold')
      return
    }

    if (matchesShortcut(event, { key: 'i' }, shortcutPlatform)) {
      event.preventDefault()
      runCommand('italic')
      return
    }

    if (matchesShortcut(event, { key: 'k' }, shortcutPlatform)) {
      event.preventDefault()
      runCommand('link')
      return
    }

    if (matchesShortcut(event, { key: '7', shiftKey: true }, shortcutPlatform)) {
      event.preventDefault()
      runCommand('ordered-list')
      return
    }

    if (matchesShortcut(event, { key: '8', shiftKey: true }, shortcutPlatform)) {
      event.preventDefault()
      runCommand('unordered-list')
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      applyEdit(applyIndent(value, getTextareaSelection(event.currentTarget), event.shiftKey))
      return
    }

    if (event.key === 'Enter') {
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
      <textarea
        ref={textareaRef}
        className="markdown-editor"
        aria-label={label}
        spellCheck={false}
        value={value}
        onChange={(event) => {
          const selection = getTextareaSelection(event.currentTarget)
          update(event.currentTarget.value, selection, 'typing')
          onSelectionChange?.(selection)
        }}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onPaste={imageInput.handlePaste}
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
