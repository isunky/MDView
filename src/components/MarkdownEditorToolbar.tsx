import {
  Bold,
  BookOpen,
  ChevronDown,
  Code2,
  Heading,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  LoaderCircle,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  SquareCode,
  Sigma,
  Table2,
  Undo2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { withShortcutTitle, type ShortcutPlatform } from '../platform/keyboardShortcuts'

export type ToolbarFormatCommand =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'image'
  | 'quote'
  | 'unordered-list'
  | 'ordered-list'
  | 'task-list'

export type MarkdownEditorToolbarLabels = {
  toolbarLabel: string
  undoLabel: string
  redoLabel: string
  boldLabel: string
  italicLabel: string
  codeLabel: string
  headingLabel: string
  headingLevelLabel: (level: number) => string
  linkLabel: string
  imageLabel: string
  tableLabel: string
  tablePickerLabel: string
  tableSizeLabel: (columns: number, rows: number) => string
  quoteLabel: string
  blockMenuLabel: string
  codeBlockLabel: string
  horizontalRuleLabel: string
  unorderedListLabel: string
  orderedListLabel: string
  taskListLabel: string
  syntaxReferenceLabel: string
  mathLabel: string
}

type ToolbarPopoverKind = 'heading' | 'block' | 'table'

export function MarkdownEditorToolbar({
  canRedo,
  canUndo,
  labels,
  onCodeBlock,
  onFormat,
  onHeading,
  onHorizontalRule,
  onImage,
  onOpenSyntaxReference,
  onOpenMathEditor,
  onRedo,
  onTable,
  onUndo,
  platform,
  toolbarEnd,
  imageBusy = false,
  imageBusyLabel,
}: {
  canRedo: boolean
  canUndo: boolean
  labels: MarkdownEditorToolbarLabels
  onCodeBlock: () => void
  onFormat: (command: ToolbarFormatCommand) => void
  onHeading: (level: number) => void
  onHorizontalRule: () => void
  onImage: () => void
  onOpenSyntaxReference: () => void
  onOpenMathEditor: () => void
  onRedo: () => void
  onTable: (columns: number, rows: number) => void
  onUndo: () => void
  platform: ShortcutPlatform
  toolbarEnd?: ReactNode
  imageBusy?: boolean
  imageBusyLabel?: string
}) {
  const headingButtonRef = useRef<HTMLButtonElement | null>(null)
  const blockButtonRef = useRef<HTMLButtonElement | null>(null)
  const tableButtonRef = useRef<HTMLButtonElement | null>(null)
  const [openPopover, setOpenPopover] = useState<ToolbarPopoverKind | null>(null)
  const [tableSize, setTableSize] = useState({ columns: 3, rows: 3 })

  function togglePopover(kind: ToolbarPopoverKind) {
    setOpenPopover((current) => current === kind ? null : kind)
    if (kind === 'table') {
      setTableSize({ columns: 3, rows: 3 })
    }
  }

  function closeAndRun(action: () => void) {
    setOpenPopover(null)
    action()
  }

  return (
    <>
      <div className="editor-toolbar" role="toolbar" aria-label={labels.toolbarLabel}>
        <div className="editor-toolbar-scroll">
          <div className="editor-toolbar-group">
            <EditorButton
              label={labels.undoLabel}
              title={withShortcutTitle(labels.undoLabel, { key: 'z' }, platform)}
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 aria-hidden="true" />
            </EditorButton>
            <EditorButton
              label={labels.redoLabel}
              title={withShortcutTitle(
                labels.redoLabel,
                platform === 'macos' ? { key: 'z', shiftKey: true } : { key: 'y' },
                platform,
              )}
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 aria-hidden="true" />
            </EditorButton>
          </div>
          <div className="editor-toolbar-group">
            <EditorButton
              buttonRef={headingButtonRef}
              label={labels.headingLabel}
              active={openPopover === 'heading'}
              ariaHasPopup="menu"
              ariaExpanded={openPopover === 'heading'}
              onClick={() => togglePopover('heading')}
            >
              <Heading aria-hidden="true" />
              <ChevronDown className="editor-button-chevron" aria-hidden="true" />
            </EditorButton>
          </div>
          <div className="editor-toolbar-group">
            <EditorButton
              label={labels.boldLabel}
              title={withShortcutTitle(labels.boldLabel, { key: 'b' }, platform)}
              onClick={() => onFormat('bold')}
            >
              <Bold aria-hidden="true" />
            </EditorButton>
            <EditorButton
              label={labels.italicLabel}
              title={withShortcutTitle(labels.italicLabel, { key: 'i' }, platform)}
              onClick={() => onFormat('italic')}
            >
              <Italic aria-hidden="true" />
            </EditorButton>
            <EditorButton label={labels.codeLabel} onClick={() => onFormat('code')}>
              <Code2 aria-hidden="true" />
            </EditorButton>
          </div>
          <div className="editor-toolbar-group">
            <EditorButton
              label={labels.linkLabel}
              title={withShortcutTitle(labels.linkLabel, { key: 'k' }, platform)}
              onClick={() => onFormat('link')}
            >
              <Link aria-hidden="true" />
            </EditorButton>
            <EditorButton
              label={imageBusy ? imageBusyLabel ?? labels.imageLabel : labels.imageLabel}
              disabled={imageBusy}
              onClick={onImage}
            >
              {imageBusy
                ? <LoaderCircle className="editor-image-spinner" aria-hidden="true" />
                : <Image aria-hidden="true" />}
            </EditorButton>
            <EditorButton
              buttonRef={tableButtonRef}
              label={labels.tableLabel}
              active={openPopover === 'table'}
              ariaHasPopup="grid"
              ariaExpanded={openPopover === 'table'}
              onClick={() => togglePopover('table')}
            >
              <Table2 aria-hidden="true" />
            </EditorButton>
            <EditorButton label={labels.mathLabel} onClick={onOpenMathEditor}>
              <Sigma aria-hidden="true" />
            </EditorButton>
          </div>
          <div className="editor-toolbar-group">
            <EditorButton
              buttonRef={blockButtonRef}
              label={labels.blockMenuLabel}
              active={openPopover === 'block'}
              ariaHasPopup="menu"
              ariaExpanded={openPopover === 'block'}
              onClick={() => togglePopover('block')}
            >
              <Pilcrow aria-hidden="true" />
              <ChevronDown className="editor-button-chevron" aria-hidden="true" />
            </EditorButton>
          </div>
          <div className="editor-toolbar-group">
            <EditorButton
              label={labels.unorderedListLabel}
              title={withShortcutTitle(labels.unorderedListLabel, { key: '8', shiftKey: true }, platform)}
              onClick={() => onFormat('unordered-list')}
            >
              <List aria-hidden="true" />
            </EditorButton>
            <EditorButton
              label={labels.orderedListLabel}
              title={withShortcutTitle(labels.orderedListLabel, { key: '7', shiftKey: true }, platform)}
              onClick={() => onFormat('ordered-list')}
            >
              <ListOrdered aria-hidden="true" />
            </EditorButton>
            <EditorButton label={labels.taskListLabel} onClick={() => onFormat('task-list')}>
              <ListChecks aria-hidden="true" />
            </EditorButton>
          </div>
          <div className="editor-toolbar-group">
            <EditorButton label={labels.syntaxReferenceLabel} onClick={onOpenSyntaxReference}>
              <BookOpen aria-hidden="true" />
            </EditorButton>
          </div>
        </div>
        <span className="editor-toolbar-spacer" />
        {toolbarEnd}
      </div>

      {openPopover === 'heading' ? (
        <ToolbarPopover anchorRef={headingButtonRef} onClose={() => setOpenPopover(null)}>
          <div className="editor-command-menu" role="menu" aria-label={labels.headingLabel}>
            {[1, 2, 3, 4].map((level) => (
              <button
                type="button"
                role="menuitem"
                aria-label={labels.headingLevelLabel(level)}
                key={level}
                onClick={() => closeAndRun(() => onHeading(level))}
              >
                <span className="heading-level-mark">H{level}</span>
                <span>{labels.headingLevelLabel(level)}</span>
              </button>
            ))}
          </div>
        </ToolbarPopover>
      ) : null}

      {openPopover === 'block' ? (
        <ToolbarPopover anchorRef={blockButtonRef} onClose={() => setOpenPopover(null)}>
          <div className="editor-command-menu" role="menu" aria-label={labels.blockMenuLabel}>
            <button type="button" role="menuitem" onClick={() => closeAndRun(() => onFormat('quote'))}>
              <Quote aria-hidden="true" />
              <span>{labels.quoteLabel}</span>
            </button>
            <button type="button" role="menuitem" onClick={() => closeAndRun(onCodeBlock)}>
              <SquareCode aria-hidden="true" />
              <span>{labels.codeBlockLabel}</span>
            </button>
            <button type="button" role="menuitem" onClick={() => closeAndRun(onHorizontalRule)}>
              <Minus aria-hidden="true" />
              <span>{labels.horizontalRuleLabel}</span>
            </button>
          </div>
        </ToolbarPopover>
      ) : null}

      {openPopover === 'table' ? (
        <ToolbarPopover anchorRef={tableButtonRef} onClose={() => setOpenPopover(null)}>
          <TablePicker
            columns={tableSize.columns}
            rows={tableSize.rows}
            label={labels.tablePickerLabel}
            sizeLabel={labels.tableSizeLabel}
            onSizeChange={(columns, rows) => setTableSize({ columns, rows })}
            onInsert={(columns, rows) => closeAndRun(() => onTable(columns, rows))}
          />
        </ToolbarPopover>
      ) : null}
    </>
  )
}

function EditorButton({
  active = false,
  ariaExpanded,
  ariaHasPopup,
  buttonRef,
  disabled = false,
  label,
  title,
  onClick,
  children,
}: {
  active?: boolean
  ariaExpanded?: boolean
  ariaHasPopup?: 'menu' | 'grid'
  buttonRef?: { current: HTMLButtonElement | null }
  disabled?: boolean
  label: string
  title?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={active ? 'active' : undefined}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ToolbarPopover({
  anchorRef,
  children,
  onClose,
}: {
  anchorRef: { current: HTMLButtonElement | null }
  children: ReactNode
  onClose: () => void
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ left: 8, top: 8 })

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    const popover = popoverRef.current
    if (!anchor || !popover) return

    const anchorRect = anchor.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const padding = 8
    const left = Math.min(
      Math.max(padding, anchorRect.left),
      Math.max(padding, window.innerWidth - popoverRect.width - padding),
    )
    const below = anchorRect.bottom + 7
    const top = below + popoverRect.height <= window.innerHeight - padding
      ? below
      : Math.max(padding, anchorRect.top - popoverRect.height - 7)
    setPosition({ left, top })
  }, [anchorRef])

  useLayoutEffect(updatePosition, [updatePosition])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!popoverRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose()
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      anchorRef.current?.focus()
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorRef, onClose, updatePosition])

  return createPortal(
    <div ref={popoverRef} className="editor-toolbar-popover" style={position}>
      {children}
    </div>,
    document.body,
  )
}

function TablePicker({
  columns,
  rows,
  label,
  sizeLabel,
  onSizeChange,
  onInsert,
}: {
  columns: number
  rows: number
  label: string
  sizeLabel: (columns: number, rows: number) => string
  onSizeChange: (columns: number, rows: number) => void
  onInsert: (columns: number, rows: number) => void
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>('[data-column="3"][data-row="3"]')?.focus()
  }, [])

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, column: number, row: number) {
    let nextColumn = column
    let nextRow = row
    if (event.key === 'ArrowLeft') nextColumn -= 1
    else if (event.key === 'ArrowRight') nextColumn += 1
    else if (event.key === 'ArrowUp') nextRow -= 1
    else if (event.key === 'ArrowDown') nextRow += 1
    else return

    event.preventDefault()
    nextColumn = Math.min(6, Math.max(1, nextColumn))
    nextRow = Math.min(6, Math.max(1, nextRow))
    onSizeChange(nextColumn, nextRow)
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-column="${nextColumn}"][data-row="${nextRow}"]`)
      ?.focus()
  }

  return (
    <div className="table-picker" aria-label={label}>
      <div ref={gridRef} className="table-picker-grid" role="grid" aria-label={label}>
        {Array.from({ length: 6 }, (_, rowIndex) => (
          <div role="row" key={rowIndex}>
            {Array.from({ length: 6 }, (_, columnIndex) => {
              const cellColumns = columnIndex + 1
              const cellRows = rowIndex + 1
              return (
                <button
                  type="button"
                  role="gridcell"
                  className={cellColumns <= columns && cellRows <= rows ? 'selected' : undefined}
                  aria-label={sizeLabel(cellColumns, cellRows)}
                  aria-selected={cellColumns === columns && cellRows === rows}
                  tabIndex={cellColumns === columns && cellRows === rows ? 0 : -1}
                  data-column={cellColumns}
                  data-row={cellRows}
                  key={cellColumns}
                  onFocus={() => onSizeChange(cellColumns, cellRows)}
                  onMouseEnter={() => onSizeChange(cellColumns, cellRows)}
                  onKeyDown={(event) => moveSelection(event, cellColumns, cellRows)}
                  onClick={() => onInsert(cellColumns, cellRows)}
                />
              )
            })}
          </div>
        ))}
      </div>
      <p aria-live="polite">{sizeLabel(columns, rows)}</p>
    </div>
  )
}
