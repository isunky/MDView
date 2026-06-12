import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eye,
  FilePlus2,
  FolderOpen,
  Info,
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

function App({ fileAccess = tauriFileAccess }: AppProps) {
  const [markdownDocument, setMarkdownDocument] = useState(createInitialDocument)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [statusMessage, setStatusMessage] = useState('Saved')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
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

      <section className="workspace" aria-label="Markdown workspace">
        {viewMode === 'preview' ? (
          <aside className="outline-panel" aria-label="Outline panel">
            <DocumentOutline items={outlineItems} onJump={handleOutlineJump} />
          </aside>
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

export default App
