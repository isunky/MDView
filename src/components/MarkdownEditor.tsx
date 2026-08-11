import {
  Bold,
  BookOpen,
  Check,
  Code2,
  Copy,
  Heading1,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
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
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { MarkdownSyntaxSection } from '../domain/markdownSyntaxReference'
import {
  detectShortcutPlatform,
  matchesShortcut,
  withShortcutTitle,
} from '../platform/keyboardShortcuts'

export type MarkdownEditorLabels = {
  toolbarLabel: string
  boldLabel: string
  italicLabel: string
  codeLabel: string
  headingLabel: string
  linkLabel: string
  imageLabel: string
  quoteLabel: string
  unorderedListLabel: string
  orderedListLabel: string
  taskListLabel: string
  syntaxReferenceLabel: string
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
  onChange: (value: string) => void
  label: string
  t: MarkdownEditorLabels
  showToolbar?: boolean
  toolbarEnd?: ReactNode
  onSelectionChange?: (selection: SelectionRange) => void
  onImportImages?: (files: File[], selection: SelectionRange) => void
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

type MarkdownCommand =
  | 'bold'
  | 'italic'
  | 'code'
  | 'heading'
  | 'link'
  | 'image'
  | 'quote'
  | 'unordered-list'
  | 'ordered-list'
  | 'task-list'

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor({
  value,
  onChange,
  label,
  t,
  showToolbar = true,
  toolbarEnd,
  onSelectionChange,
  onImportImages,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pendingSelectionRef = useRef<SelectionRange | null>(null)
  const [isSyntaxReferenceOpen, setIsSyntaxReferenceOpen] = useState(false)
  const shortcutPlatform = detectShortcutPlatform()

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

  function updateEditor(nextValue: string, selection: SelectionRange) {
    pendingSelectionRef.current = selection
    onChange(nextValue)
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
      heading: '# ',
      quote: '> ',
      'unordered-list': '- ',
      'ordered-list': '1. ',
      'task-list': '- [ ] ',
    }

    prefixSelectedLines(value, selection, prefixByCommand[command], updateEditor)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
      onSelectionChange?.(getSelection(textarea))
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = getImageFiles(event.clipboardData.files)
    if (images.length === 0 || !onImportImages) {
      return
    }

    event.preventDefault()
    onImportImages(images, getSelection(event.currentTarget))
  }

  function handleDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (getImageFiles(event.dataTransfer.files).length > 0) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    const images = getImageFiles(event.dataTransfer.files)
    if (images.length === 0 || !onImportImages) {
      return
    }

    event.preventDefault()
    onImportImages(images, getSelection(event.currentTarget))
  }

  return (
    <div className="markdown-editor-shell">
      {showToolbar ? (
        <div className="editor-toolbar" role="toolbar" aria-label={t.toolbarLabel}>
          <EditorButton label={t.headingLabel} onClick={() => runCommand('heading')}>
            <Heading1 aria-hidden="true" />
          </EditorButton>
          <EditorButton
            label={t.boldLabel}
            title={withShortcutTitle(t.boldLabel, { key: 'b' }, shortcutPlatform)}
            onClick={() => runCommand('bold')}
          >
            <Bold aria-hidden="true" />
          </EditorButton>
          <EditorButton
            label={t.italicLabel}
            title={withShortcutTitle(t.italicLabel, { key: 'i' }, shortcutPlatform)}
            onClick={() => runCommand('italic')}
          >
            <Italic aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.codeLabel} onClick={() => runCommand('code')}>
            <Code2 aria-hidden="true" />
          </EditorButton>
          <EditorButton
            label={t.linkLabel}
            title={withShortcutTitle(t.linkLabel, { key: 'k' }, shortcutPlatform)}
            onClick={() => runCommand('link')}
          >
            <Link aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.imageLabel} onClick={() => runCommand('image')}>
            <Image aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.quoteLabel} onClick={() => runCommand('quote')}>
            <Quote aria-hidden="true" />
          </EditorButton>
          <EditorButton
            label={t.unorderedListLabel}
            title={withShortcutTitle(t.unorderedListLabel, { key: '8', shiftKey: true }, shortcutPlatform)}
            onClick={() => runCommand('unordered-list')}
          >
            <List aria-hidden="true" />
          </EditorButton>
          <EditorButton
            label={t.orderedListLabel}
            title={withShortcutTitle(t.orderedListLabel, { key: '7', shiftKey: true }, shortcutPlatform)}
            onClick={() => runCommand('ordered-list')}
          >
            <ListOrdered aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.taskListLabel} onClick={() => runCommand('task-list')}>
            <ListChecks aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.syntaxReferenceLabel} onClick={() => setIsSyntaxReferenceOpen(true)}>
            <BookOpen aria-hidden="true" />
          </EditorButton>
          <span className="editor-toolbar-spacer" />
          {toolbarEnd}
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        className="markdown-editor"
        aria-label={label}
        spellCheck={false}
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value)
          onSelectionChange?.(getSelection(event.currentTarget))
        }}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

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

function EditorButton({
  label,
  title,
  onClick,
  children,
}: {
  label: string
  title?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={title ?? label} onClick={onClick}>
      {children}
    </button>
  )
}

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
