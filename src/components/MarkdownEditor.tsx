import {
  Bold,
  BookOpen,
  Code2,
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
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

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
  closeSyntaxReference: string
}

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  label: string
  t: MarkdownEditorLabels
  showToolbar?: boolean
}

type SelectionRange = {
  start: number
  end: number
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

const syntaxReference = [
  ['# Heading 1', 'Heading'],
  ['**Bold**', 'Bold text'],
  ['*Italic*', 'Italic text'],
  ['[Title](https://example.com)', 'Link'],
  ['![Alt](image.png)', 'Image'],
  ['> Quote', 'Blockquote'],
  ['- Item', 'Bulleted list'],
  ['1. Item', 'Numbered list'],
  ['- [ ] Task', 'Task list'],
  ['`code`', 'Inline code'],
  ['```js\nconsole.log("Hi")\n```', 'Code block'],
  ['| A | B |\n| --- | --- |', 'Table'],
  ['---', 'Divider'],
]

export function MarkdownEditor({ value, onChange, label, t, showToolbar = true }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pendingSelectionRef = useRef<SelectionRange | null>(null)
  const [isSyntaxReferenceOpen, setIsSyntaxReferenceOpen] = useState(false)

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current
    const textarea = textareaRef.current
    if (!pendingSelection || !textarea) {
      return
    }

    pendingSelectionRef.current = null
    textarea.focus()
    textarea.setSelectionRange(pendingSelection.start, pendingSelection.end)
  }, [value])

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
    const isMod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (isMod && key === 'b') {
      event.preventDefault()
      runCommand('bold')
      return
    }

    if (isMod && key === 'i') {
      event.preventDefault()
      runCommand('italic')
      return
    }

    if (isMod && key === 'k') {
      event.preventDefault()
      runCommand('link')
      return
    }

    if (isMod && event.shiftKey && event.key === '7') {
      event.preventDefault()
      runCommand('ordered-list')
      return
    }

    if (isMod && event.shiftKey && event.key === '8') {
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

  return (
    <div className="markdown-editor-shell">
      {showToolbar ? (
        <div className="editor-toolbar" role="toolbar" aria-label={t.toolbarLabel}>
          <EditorButton label={t.headingLabel} onClick={() => runCommand('heading')}>
            <Heading1 aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.boldLabel} onClick={() => runCommand('bold')}>
            <Bold aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.italicLabel} onClick={() => runCommand('italic')}>
            <Italic aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.codeLabel} onClick={() => runCommand('code')}>
            <Code2 aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.linkLabel} onClick={() => runCommand('link')}>
            <Link aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.imageLabel} onClick={() => runCommand('image')}>
            <Image aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.quoteLabel} onClick={() => runCommand('quote')}>
            <Quote aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.unorderedListLabel} onClick={() => runCommand('unordered-list')}>
            <List aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.orderedListLabel} onClick={() => runCommand('ordered-list')}>
            <ListOrdered aria-hidden="true" />
          </EditorButton>
          <EditorButton label={t.taskListLabel} onClick={() => runCommand('task-list')}>
            <ListChecks aria-hidden="true" />
          </EditorButton>
          <span className="editor-toolbar-spacer" />
          <EditorButton label={t.syntaxReferenceLabel} onClick={() => setIsSyntaxReferenceOpen(true)}>
            <BookOpen aria-hidden="true" />
          </EditorButton>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        className="markdown-editor"
        aria-label={label}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <MarkdownSyntaxDialog
        open={isSyntaxReferenceOpen}
        title={t.syntaxReferenceTitle}
        closeLabel={t.closeSyntaxReference}
        onClose={() => setIsSyntaxReferenceOpen(false)}
      />
    </div>
  )
}

function EditorButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}

function MarkdownSyntaxDialog({
  open,
  title,
  closeLabel,
  onClose,
}: {
  open: boolean
  title: string
  closeLabel: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose()
        }
      }}
    >
      <section
        className="syntax-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="syntax-reference-title"
      >
        <button type="button" className="about-close" onClick={onClose} aria-label={closeLabel}>
          <X aria-hidden="true" />
        </button>
        <h2 id="syntax-reference-title">{title}</h2>
        <div className="syntax-reference-grid">
          {syntaxReference.map(([syntax, description]) => (
            <div className="syntax-reference-row" key={syntax}>
              <code>{syntax}</code>
              <span>{description}</span>
            </div>
          ))}
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
