import {
  Check,
  Copy,
  ImageUp,
  X,
} from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  createEditorHistory,
  recordEditorChange,
  redoEditorChange,
  undoEditorChange,
  updateEditorHistorySelection,
  type EditorChangeKind,
} from '../domain/editorHistory'
import { createMarkdownTable } from '../domain/markdownTable'
import type { MarkdownSyntaxSection } from '../domain/markdownSyntaxReference'
import {
  detectShortcutPlatform,
  matchesShortcut,
} from '../platform/keyboardShortcuts'
import {
  MarkdownEditorToolbar,
  type MarkdownEditorToolbarLabels,
  type ToolbarFormatCommand,
} from './MarkdownEditorToolbar'

export type MarkdownEditorLabels = MarkdownEditorToolbarLabels & {
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

export type SelectionRange = {
  start: number
  end: number
}

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
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const pendingImageSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 })
  const pendingSelectionRef = useRef<SelectionRange | null>(null)
  const pendingValueRef = useRef<string | null>(null)
  const historyKeyRef = useRef(historyKey)
  const historyRef = useRef(createEditorHistory(value))
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false })
  const [isSyntaxReferenceOpen, setIsSyntaxReferenceOpen] = useState(false)
  const [isImageDragActive, setIsImageDragActive] = useState(false)
  const shortcutPlatform = detectShortcutPlatform()

  const { canUndo, canRedo } = historyAvailability

  function refreshHistoryAvailability() {
    setHistoryAvailability({
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
    refreshHistoryAvailability()
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
      const selection = textareaRef.current ? getSelection(textareaRef.current) : { start: 0, end: 0 }
      historyRef.current = recordEditorChange(
        historyRef.current,
        { value, selection },
        'external',
      )
      refreshHistoryAvailability()
    }
  }, [historyKey, value])

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
  }, [onSelectionChange, value])

  useImperativeHandle(ref, () => ({
    focus() {
      textareaRef.current?.focus()
    },
    getScrollElement() {
      return textareaRef.current
    },
    getSelection() {
      return textareaRef.current ? getSelection(textareaRef.current) : { start: 0, end: 0 }
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

  function updateEditor(nextValue: string, selection: SelectionRange, kind: EditorChangeKind = 'command') {
    const currentSelection = textareaRef.current
      ? getSelection(textareaRef.current)
      : historyRef.current.present.selection
    historyRef.current = updateEditorHistorySelection(historyRef.current, currentSelection)
    historyRef.current = recordEditorChange(
      historyRef.current,
      { value: nextValue, selection },
      kind,
    )
    pendingValueRef.current = nextValue
    pendingSelectionRef.current = selection
    refreshHistoryAvailability()
    onChange(nextValue)
  }

  function restoreHistory(direction: 'undo' | 'redo') {
    const nextHistory = direction === 'undo'
      ? undoEditorChange(historyRef.current)
      : redoEditorChange(historyRef.current)
    if (nextHistory === historyRef.current) {
      return
    }

    historyRef.current = nextHistory
    pendingValueRef.current = nextHistory.present.value
    pendingSelectionRef.current = nextHistory.present.selection
    refreshHistoryAvailability()
    onChange(nextHistory.present.value)
  }

  function runCommand(command: MarkdownCommand) {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const selection = getSelection(textarea)
    const selectedText = value.slice(selection.start, selection.end)

    if (command === 'bold') {
      wrapSelection(value, selection, selectedText || 'bold text', '**', '**', updateEditor)
      return
    }

    if (command === 'italic') {
      wrapSelection(value, selection, selectedText || 'italic text', '*', '*', updateEditor)
      return
    }

    if (command === 'code') {
      wrapSelection(value, selection, selectedText || 'code', '`', '`', updateEditor)
      return
    }

    if (command === 'link') {
      insertTemplate(value, selection, `[${selectedText || 'title'}](url)`, selectedText ? null : [1, 6], updateEditor)
      return
    }

    if (command === 'image') {
      insertTemplate(value, selection, `![${selectedText || 'alt'}](image.png)`, selectedText ? null : [2, 5], updateEditor)
      return
    }

    const prefixByCommand: Record<Exclude<MarkdownCommand, 'bold' | 'italic' | 'code' | 'link' | 'image'>, string> = {
      quote: '> ',
      'unordered-list': '- ',
      'ordered-list': '1. ',
      'task-list': '- [ ] ',
    }

    prefixSelectedLines(value, selection, prefixByCommand[command], updateEditor)
  }

  function runHeadingCommand(level: number) {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    setHeadingLevel(value, getSelection(textarea), level, updateEditor)
  }

  function runCodeBlockCommand() {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const selection = getSelection(textarea)
    const selectedText = value.slice(selection.start, selection.end) || 'code'
    insertTemplate(value, selection, `\`\`\`\n${selectedText}\n\`\`\``, [4, 4 + selectedText.length], updateEditor)
  }

  function runHorizontalRuleCommand() {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    insertBlockAfterSelection(value, getSelection(textarea), '---', null, updateEditor)
  }

  function insertTable(columns: number, rows: number) {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const firstHeader = t.tableHeaderPlaceholder(1)
    const table = createMarkdownTable(columns, rows, {
      header: t.tableHeaderPlaceholder,
      cell: t.tableCellPlaceholder,
    })
    insertBlockAfterSelection(
      value,
      getSelection(textarea),
      table,
      [table.indexOf(firstHeader), table.indexOf(firstHeader) + firstHeader.length],
      updateEditor,
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (matchesShortcut(event, { key: 'z' }, shortcutPlatform)) {
      event.preventDefault()
      restoreHistory('undo')
      return
    }

    const matchesPlatformRedo = shortcutPlatform === 'macos'
      ? matchesShortcut(event, { key: 'z', shiftKey: true }, shortcutPlatform)
      : matchesShortcut(event, { key: 'y' }, shortcutPlatform)
        || matchesShortcut(event, { key: 'z', shiftKey: true }, shortcutPlatform)
    if (matchesPlatformRedo) {
      event.preventDefault()
      restoreHistory('redo')
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
      indentSelectedLines(value, getSelection(event.currentTarget), event.shiftKey, updateEditor)
      return
    }

    if (event.key === 'Enter') {
      const handled = continueList(value, getSelection(event.currentTarget), updateEditor)
      if (handled) {
        event.preventDefault()
      }
    }
  }

  function handleSelectionChange() {
    const textarea = textareaRef.current
    if (textarea) {
      const selection = getSelection(textarea)
      historyRef.current = updateEditorHistorySelection(historyRef.current, selection)
      onSelectionChange?.(selection)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = getImageFiles(event.clipboardData.files)
    if (images.length === 0 || !onImportImages) {
      return
    }

    event.preventDefault()
    void onImportImages(images, getSelection(event.currentTarget))
  }

  function handleImageAction() {
    const textarea = textareaRef.current
    if (!supportsImageImport || !onImportImages || !textarea) {
      runCommand('image')
      return
    }

    pendingImageSelectionRef.current = getSelection(textarea)
    imageInputRef.current?.click()
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (files.length > 0 && onImportImages) {
      void onImportImages(files, pendingImageSelectionRef.current)
    }
  }

  function handleDragEnter(event: DragEvent<HTMLTextAreaElement>) {
    if (supportsImageImport && hasDraggedImages(event.dataTransfer)) {
      event.preventDefault()
      setIsImageDragActive(true)
    }
  }

  function handleDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (supportsImageImport && hasDraggedImages(event.dataTransfer)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setIsImageDragActive(true)
    }
  }

  function handleDragLeave() {
    setIsImageDragActive(false)
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    setIsImageDragActive(false)
    const images = getImageFiles(event.dataTransfer.files)
    if (images.length === 0 || !onImportImages) {
      return
    }

    event.preventDefault()
    void onImportImages(images, getSelection(event.currentTarget))
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
          onUndo={() => restoreHistory('undo')}
          onRedo={() => restoreHistory('redo')}
          onFormat={runCommand}
          onHeading={runHeadingCommand}
          onCodeBlock={runCodeBlockCommand}
          onHorizontalRule={runHorizontalRuleCommand}
          onImage={handleImageAction}
          onTable={insertTable}
          onOpenSyntaxReference={() => setIsSyntaxReferenceOpen(true)}
          imageBusy={isImportingImages}
          imageBusyLabel={imageImportBusyLabel}
        />
      ) : null}
      <input
        ref={imageInputRef}
        className="editor-image-input"
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.avif,image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleImageSelection}
      />
      <textarea
        ref={textareaRef}
        className="markdown-editor"
        aria-label={label}
        spellCheck={false}
        value={value}
        onChange={(event) => {
          const selection = getSelection(event.currentTarget)
          updateEditor(event.currentTarget.value, selection, 'typing')
          onSelectionChange?.(selection)
        }}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onPaste={handlePaste}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
      {isImageDragActive && imageDropLabel ? (
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
    </div>
  )
})

function MarkdownSyntaxDialog({
  open,
  title,
  intro,
  categoriesLabel,
  safetyNote,
  sections,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  closeLabel,
  onClose,
}: {
  open: boolean
  title: string
  intro: string
  categoriesLabel: string
  safetyNote: string
  sections: MarkdownSyntaxSection[]
  copyLabel: (name: string) => string
  copiedLabel: (name: string) => string
  copyFailedLabel: string
  closeLabel: string
  onClose: () => void
}) {
  const [copyStatus, setCopyStatus] = useState<{
    itemId: string
    state: 'copied' | 'failed'
    message: string
  } | null>(null)
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '')
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]

  const handleClose = useCallback(() => {
    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current)
      copyResetTimeoutRef.current = null
    }
    setCopyStatus(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, open])

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current)
        copyResetTimeoutRef.current = null
      }
    }
  }, [])

  async function handleCopy(itemId: string, name: string, syntax: string) {
    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current)
    }

    try {
      await navigator.clipboard.writeText(syntax)
      setCopyStatus({ itemId, state: 'copied', message: copiedLabel(name) })
    } catch {
      setCopyStatus({ itemId, state: 'failed', message: copyFailedLabel })
    }

    copyResetTimeoutRef.current = setTimeout(() => {
      setCopyStatus(null)
      copyResetTimeoutRef.current = null
    }, 1800)
  }

  function selectSection(sectionId: string) {
    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current)
      copyResetTimeoutRef.current = null
    }
    setCopyStatus(null)
    setActiveSectionId(sectionId)
  }

  function handleSectionKeyDown(event: KeyboardEvent<HTMLButtonElement>, sectionIndex: number) {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') {
      nextIndex = (sectionIndex + 1) % sections.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (sectionIndex - 1 + sections.length) % sections.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = sections.length - 1
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    const nextSection = sections[nextIndex]
    selectSection(nextSection.id)
    const tabButtons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabButtons?.[nextIndex]?.focus()
  }

  if (!open) {
    return null
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          handleClose()
        }
      }}
    >
      <section
        className="syntax-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="syntax-reference-title"
      >
        <button type="button" className="about-close" onClick={handleClose} aria-label={closeLabel}>
          <X aria-hidden="true" />
        </button>
        <header className="syntax-dialog-header">
          <h2 id="syntax-reference-title">{title}</h2>
          <p>{intro}</p>
          <p
            className="syntax-copy-status"
            data-state={copyStatus?.state ?? 'idle'}
            role="status"
            aria-live="polite"
          >
            {copyStatus?.message ?? ''}
          </p>
        </header>
        <div className="syntax-reference-tabs" role="tablist" aria-label={categoriesLabel}>
          {sections.map((section, index) => {
            const isActive = section.id === activeSection?.id

            return (
              <button
                type="button"
                role="tab"
                id={`syntax-tab-${section.id}`}
                aria-selected={isActive}
                aria-controls={`syntax-panel-${section.id}`}
                tabIndex={isActive ? 0 : -1}
                key={section.id}
                onClick={() => selectSection(section.id)}
                onKeyDown={(event) => handleSectionKeyDown(event, index)}
              >
                {section.title}
              </button>
            )
          })}
        </div>
        <div className="syntax-dialog-body">
          {activeSection ? (
            <section
              className="syntax-reference-section"
              role="tabpanel"
              id={`syntax-panel-${activeSection.id}`}
              aria-labelledby={`syntax-tab-${activeSection.id}`}
              tabIndex={0}
            >
              <h3>{activeSection.title}</h3>
              <div className="syntax-reference-grid">
                {activeSection.items.map((item) => {
                  const isCopied = copyStatus?.itemId === item.id && copyStatus.state === 'copied'

                  return (
                    <div className="syntax-reference-row" key={item.id}>
                      <div className="syntax-reference-example">
                        <strong>{item.name}</strong>
                        <code>{item.syntax}</code>
                      </div>
                      <p>{item.description}</p>
                      <button
                        type="button"
                        className="syntax-copy-button"
                        aria-label={isCopied ? copiedLabel(item.name) : copyLabel(item.name)}
                        title={isCopied ? copiedLabel(item.name) : copyLabel(item.name)}
                        onClick={() => void handleCopy(item.id, item.name, item.syntax)}
                      >
                        {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
          {activeSection?.id === 'mdview-enhancements' ? (
            <p className="syntax-safety-note">{safetyNote}</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function getSelection(textarea: HTMLTextAreaElement): SelectionRange {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  }
}

function getImageFiles(files: FileList): File[] {
  return Array.from(files).filter((file) =>
    file.type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name),
  )
}

function hasDraggedImages(dataTransfer: DataTransfer): boolean {
  if (getImageFiles(dataTransfer.files).length > 0) {
    return true
  }

  return Array.from(dataTransfer.items).some((item) =>
    item.kind === 'file' && item.type.startsWith('image/'),
  )
}

function wrapSelection(
  value: string,
  selection: SelectionRange,
  selectedText: string,
  before: string,
  after: string,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
) {
  const replacement = `${before}${selectedText}${after}`
  const nextValue = replaceRange(value, selection, replacement)
  const start = selection.start + before.length
  updateEditor(nextValue, { start, end: start + selectedText.length })
}

function insertTemplate(
  value: string,
  selection: SelectionRange,
  template: string,
  selectOffset: [number, number] | null,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
) {
  const nextValue = replaceRange(value, selection, template)
  if (!selectOffset) {
    const cursor = selection.start + template.length
    updateEditor(nextValue, { start: cursor, end: cursor })
    return
  }

  updateEditor(nextValue, {
    start: selection.start + selectOffset[0],
    end: selection.start + selectOffset[1],
  })
}

function prefixSelectedLines(
  value: string,
  selection: SelectionRange,
  prefix: string,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
) {
  const range = getLineRange(value, selection)
  const selectedLines = value.slice(range.start, range.end)
  const replacement = selectedLines
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')

  updateEditor(replaceRange(value, range, replacement), {
    start: range.start,
    end: range.start + replacement.length,
  })
}

function setHeadingLevel(
  value: string,
  selection: SelectionRange,
  level: number,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
) {
  const range = getLineRange(value, selection)
  const prefix = `${'#'.repeat(Math.min(4, Math.max(1, level)))} `
  const replacement = value
    .slice(range.start, range.end)
    .split('\n')
    .map((line) => `${prefix}${line.replace(/^#{1,6}\s+/, '')}`)
    .join('\n')

  updateEditor(replaceRange(value, range, replacement), {
    start: range.start,
    end: range.start + replacement.length,
  })
}

function insertBlockAfterSelection(
  value: string,
  selection: SelectionRange,
  block: string,
  blockSelection: [number, number] | null,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
) {
  const insertionPoint = selection.end
  const before = value.slice(0, insertionPoint)
  const after = value.slice(insertionPoint)
  const prefix = before.length === 0 || before.endsWith('\n\n')
    ? ''
    : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = after.length === 0 || after.startsWith('\n\n')
    ? ''
    : after.startsWith('\n') ? '\n' : '\n\n'
  const blockStart = insertionPoint + prefix.length
  const nextValue = `${before}${prefix}${block}${suffix}${after}`

  if (blockSelection) {
    updateEditor(nextValue, {
      start: blockStart + blockSelection[0],
      end: blockStart + blockSelection[1],
    })
    return
  }

  const cursor = blockStart + block.length
  updateEditor(nextValue, { start: cursor, end: cursor })
}

function indentSelectedLines(
  value: string,
  selection: SelectionRange,
  outdent: boolean,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
) {
  const range = getLineRange(value, selection)
  const selectedLines = value.slice(range.start, range.end)
  const replacement = selectedLines
    .split('\n')
    .map((line) => (outdent ? line.replace(/^( {1,2}|\t)/, '') : `  ${line}`))
    .join('\n')

  updateEditor(replaceRange(value, range, replacement), {
    start: range.start,
    end: range.start + replacement.length,
  })
}

function continueList(
  value: string,
  selection: SelectionRange,
  updateEditor: (nextValue: string, selection: SelectionRange) => void,
): boolean {
  if (selection.start !== selection.end) {
    return false
  }

  const lineStart = value.lastIndexOf('\n', selection.start - 1) + 1
  const line = value.slice(lineStart, selection.start)
  const match = line.match(/^(\s*)(- \[ \] |- |\d+\. )(.*)$/)
  if (!match) {
    return false
  }

  const [, indent, marker, text] = match
  if (text.trim() === '') {
    const nextValue = replaceRange(value, { start: lineStart, end: selection.start }, '')
    updateEditor(nextValue, { start: lineStart, end: lineStart })
    return true
  }

  const nextMarker = /^\d+\. $/.test(marker) ? `${Number.parseInt(marker, 10) + 1}. ` : marker
  const insertion = `\n${indent}${nextMarker}`
  const nextValue = replaceRange(value, selection, insertion)
  const cursor = selection.start + insertion.length
  updateEditor(nextValue, { start: cursor, end: cursor })
  return true
}

function getLineRange(value: string, selection: SelectionRange): SelectionRange {
  const start = value.lastIndexOf('\n', selection.start - 1) + 1
  const endLineBreak = value.indexOf('\n', Math.max(selection.end - 1, selection.start))
  return {
    start,
    end: endLineBreak === -1 ? value.length : endLineBreak,
  }
}

function replaceRange(value: string, selection: SelectionRange, replacement: string): string {
  return `${value.slice(0, selection.start)}${replacement}${value.slice(selection.end)}`
}
