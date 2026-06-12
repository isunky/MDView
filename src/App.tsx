import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Eye,
  FilePlus2,
  FolderOpen,
  Info,
  PanelLeftOpen,
  PencilLine,
  Save,
  SaveAll,
  SplitSquareHorizontal,
} from 'lucide-react'
import './App.css'
import { AboutDialog } from './components/AboutDialog'
import { DocumentOutline } from './components/DocumentOutline'
import { MarkdownPreview } from './components/MarkdownPreview'
import { MarkdownEditor } from './components/MarkdownEditor'
import {
  createInitialDocument,
  markDocumentSaved,
  replaceDocumentContent,
  updateDocumentDraft,
} from './domain/documentState'
import { extractMarkdownOutline } from './domain/markdownOutline'
import { tauriFileAccess, type FileAccess, type OpenedMarkdownFile } from './platform/fileAccess'

type ViewMode = 'preview' | 'edit' | 'split'

type AppProps = {
  fileAccess?: FileAccess
}

const DEFAULT_OUTLINE_WIDTH = 260
const MIN_OUTLINE_WIDTH = 180
const MAX_OUTLINE_WIDTH = 420
const OUTLINE_KEYBOARD_STEP = 16

type OutlineResizeStart = {
  pointerX: number
  width: number
} | null

function App({ fileAccess = tauriFileAccess }: AppProps) {
  const [markdownDocument, setMarkdownDocument] = useState(createInitialDocument)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [statusMessage, setStatusMessage] = useState('Saved')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isOutlineOpen, setIsOutlineOpen] = useState(true)
  const [outlineWidth, setOutlineWidth] = useState(DEFAULT_OUTLINE_WIDTH)
  const [outlineResizeStart, setOutlineResizeStart] = useState<OutlineResizeStart>(null)
  const outlineItems = useMemo(
    () => extractMarkdownOutline(markdownDocument.content),
    [markdownDocument.content],
  )

  const loadFile = useCallback((file: OpenedMarkdownFile) => {
    setMarkdownDocument((current) => replaceDocumentContent(current, file.content, file.path))
    setViewMode('preview')
    setStatusMessage('Opened')
  }, [])

  useEffect(() => {
    fileAccess.readStartupMarkdownFile().then((file) => {
      if (file) {
        loadFile(file)
      }
    })

    let disposed = false
    let unlisten: (() => void) | null = null

    fileAccess.listenForOpenedFiles(loadFile).then((dispose) => {
      if (disposed) {
        dispose?.()
        return
      }

      unlisten = dispose
    })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [fileAccess, loadFile])

  useEffect(() => {
    window.document.title = `${markdownDocument.isDirty ? '* ' : ''}${markdownDocument.title} - MDView`
  }, [markdownDocument.isDirty, markdownDocument.title])

  useEffect(() => {
    if (!outlineResizeStart) {
      return
    }

    const resizeStart = outlineResizeStart

    function handlePointerMove(event: PointerEvent) {
      setOutlineWidth(
        clampOutlineWidth(resizeStart.width + event.clientX - resizeStart.pointerX),
      )
    }

    function handlePointerUp() {
      setOutlineResizeStart(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [outlineResizeStart])

  async function handleNewDocument() {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    setMarkdownDocument(createInitialDocument())
    setViewMode('edit')
    setStatusMessage('Saved')
  }

  async function handleOpenFile() {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    try {
      const file = await fileAccess.openMarkdownFile()
      if (file) {
        loadFile(file)
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleSaveFile() {
    try {
      const savedPath = markdownDocument.path
        ? await fileAccess.saveMarkdownFile(markdownDocument.path, markdownDocument.content)
        : await fileAccess.saveMarkdownFileAs(markdownDocument.content, markdownDocument.path)

      if (savedPath) {
        setMarkdownDocument((current) => markDocumentSaved(current, savedPath))
        setStatusMessage('Saved')
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleSaveFileAs() {
    try {
      const savedPath = await fileAccess.saveMarkdownFileAs(
        markdownDocument.content,
        markdownDocument.path,
      )

      if (savedPath) {
        setMarkdownDocument((current) => markDocumentSaved(current, savedPath))
        setStatusMessage('Saved')
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  function handleContentChange(content: string) {
    setMarkdownDocument((current) => {
      const nextDocument = updateDocumentDraft(current, content)
      setStatusMessage(nextDocument.isDirty ? 'Unsaved' : 'Saved')
      return nextDocument
    })
  }

  function canDiscardUnsavedChanges(): boolean {
    return (
      !markdownDocument.isDirty ||
      window.confirm('You have unsaved changes. Discard them and continue?')
    )
  }

  function handleOutlineJump(id: string) {
    window.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleOutlineResizeKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    setOutlineWidth((currentWidth) =>
      clampOutlineWidth(
        currentWidth + (event.key === 'ArrowRight' ? OUTLINE_KEYBOARD_STEP : -OUTLINE_KEYBOARD_STEP),
      ),
    )
  }

  const isOutlineVisible = viewMode === 'preview' && isOutlineOpen
  const workspaceClasses = [
    'workspace',
    viewMode === 'preview' && isOutlineOpen ? 'outline-open' : '',
    viewMode === 'preview' && !isOutlineOpen ? 'outline-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const nativeFileTitle = fileAccess.supportsNativeFiles
    ? undefined
    : 'Native file dialogs are available after launching the desktop app.'

  return (
    <main className={`app-shell view-${viewMode}`}>
      <header className="topbar">
        <div className="brand-block">
          <div className="app-mark" aria-hidden="true">
            MD
          </div>
          <div>
            <h1>MDView</h1>
            <p title={markdownDocument.path ?? markdownDocument.title}>{markdownDocument.title}</p>
          </div>
        </div>

        <nav className="toolbar" aria-label="Document actions">
          <button type="button" onClick={handleNewDocument} aria-label="Create new markdown file">
            <FilePlus2 aria-hidden="true" />
            <span>New</span>
          </button>
          <button
            type="button"
            onClick={handleOpenFile}
            aria-label="Open markdown file"
            disabled={!fileAccess.supportsNativeFiles}
            title={nativeFileTitle}
          >
            <FolderOpen aria-hidden="true" />
            <span>Open</span>
          </button>
          <button
            type="button"
            onClick={handleSaveFile}
            aria-label="Save markdown file"
            disabled={!fileAccess.supportsNativeFiles}
            title={nativeFileTitle}
          >
            <Save aria-hidden="true" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={handleSaveFileAs}
            aria-label="Save markdown file as"
            disabled={!fileAccess.supportsNativeFiles}
            title={nativeFileTitle}
          >
            <SaveAll aria-hidden="true" />
            <span>Save As</span>
          </button>
          <button type="button" onClick={() => setIsAboutOpen(true)} aria-label="Open about dialog">
            <Info aria-hidden="true" />
            <span>About</span>
          </button>
        </nav>

        <div className="view-controls" aria-label="View mode">
          <button
            type="button"
            className={viewMode === 'preview' ? 'active' : ''}
            onClick={() => setViewMode('preview')}
            aria-label="Preview markdown"
          >
            <Eye aria-hidden="true" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            className={viewMode === 'edit' ? 'active' : ''}
            onClick={() => setViewMode('edit')}
            aria-label="Edit markdown source"
          >
            <PencilLine aria-hidden="true" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => setViewMode('split')}
            aria-label="Split preview and source"
          >
            <SplitSquareHorizontal aria-hidden="true" />
            <span>Split</span>
          </button>
        </div>

        <div className={`save-state ${markdownDocument.isDirty ? 'dirty' : ''}`}>
          {markdownDocument.isDirty ? 'Unsaved' : statusMessage}
        </div>
      </header>

      <section className={workspaceClasses} aria-label="Markdown workspace">
        {isOutlineVisible ? (
          <aside
            className="outline-panel"
            aria-label="Outline panel"
            style={{ width: `${outlineWidth}px` }}
          >
            <DocumentOutline
              items={outlineItems}
              onJump={handleOutlineJump}
              onClose={() => setIsOutlineOpen(false)}
            />
          </aside>
        ) : null}
        {isOutlineVisible ? (
          <div
            className="outline-resizer"
            role="separator"
            aria-label="Resize document outline"
            aria-orientation="vertical"
            aria-valuemin={MIN_OUTLINE_WIDTH}
            aria-valuemax={MAX_OUTLINE_WIDTH}
            aria-valuenow={outlineWidth}
            tabIndex={0}
            onPointerDown={(event) => {
              setOutlineResizeStart({ pointerX: event.clientX, width: outlineWidth })
            }}
            onKeyDown={handleOutlineResizeKey}
          />
        ) : null}
        {viewMode === 'preview' && !isOutlineOpen ? (
          <button
            type="button"
            className="outline-reopen"
            onClick={() => setIsOutlineOpen(true)}
            aria-label="Expand document outline"
          >
            <PanelLeftOpen aria-hidden="true" />
          </button>
        ) : null}
        <section className="editor-panel" aria-label="Source editor panel">
          <MarkdownEditor value={markdownDocument.content} onChange={handleContentChange} />
        </section>
        <section className="preview-panel" aria-label="Preview panel">
          <MarkdownPreview content={markdownDocument.content} />
        </section>
      </section>
      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'File operation failed'
}

function clampOutlineWidth(width: number): number {
  return Math.min(Math.max(width, MIN_OUTLINE_WIDTH), MAX_OUTLINE_WIDTH)
}

export default App
