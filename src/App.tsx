import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  Eye,
  FilePlus2,
  FolderOpen,
  Info,
  Languages,
  PanelLeftOpen,
  PencilLine,
  Save,
  SaveAll,
  SplitSquareHorizontal,
} from 'lucide-react'
import './App.css'
import { AboutDialog } from './components/AboutDialog'
import { AppLogo } from './components/AppLogo'
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
import {
  detectSystemLanguage,
  translations,
  type AppLanguage,
} from './i18n'
import { tauriFileAccess, type FileAccess, type OpenedMarkdownFile } from './platform/fileAccess'

type ViewMode = 'preview' | 'edit' | 'split'

type AppProps = {
  fileAccess?: FileAccess
  initialLanguage?: AppLanguage
}

const DEFAULT_OUTLINE_WIDTH = 260
const MIN_OUTLINE_WIDTH = 180
const MAX_OUTLINE_WIDTH = 420
const OUTLINE_KEYBOARD_STEP = 16

type OutlineResizeStart = {
  pointerX: number
  width: number
} | null

function App({ fileAccess = tauriFileAccess, initialLanguage }: AppProps) {
  const [language, setLanguage] = useState<AppLanguage>(() => initialLanguage ?? detectSystemLanguage())
  const [markdownDocument, setMarkdownDocument] = useState(createInitialDocument)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [statusMessage, setStatusMessage] = useState<'saved' | 'opened' | string>('saved')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isOutlineOpen, setIsOutlineOpen] = useState(true)
  const [outlineWidth, setOutlineWidth] = useState(DEFAULT_OUTLINE_WIDTH)
  const [outlineResizeStart, setOutlineResizeStart] = useState<OutlineResizeStart>(null)
  const outlineItems = useMemo(
    () => extractMarkdownOutline(markdownDocument.content),
    [markdownDocument.content],
  )
  const t = translations[language]

  const loadFile = useCallback((file: OpenedMarkdownFile) => {
    setMarkdownDocument((current) => replaceDocumentContent(current, file.content, file.path))
    setViewMode('preview')
    setStatusMessage('opened')
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
    setStatusMessage('saved')
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
        setStatusMessage('saved')
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
        setStatusMessage('saved')
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  function handleContentChange(content: string) {
    setMarkdownDocument((current) => {
      const nextDocument = updateDocumentDraft(current, content)
      setStatusMessage(nextDocument.isDirty ? 'unsaved' : 'saved')
      return nextDocument
    })
  }

  function canDiscardUnsavedChanges(): boolean {
    return (
      !markdownDocument.isDirty ||
      window.confirm(t.discardUnsaved)
    )
  }

  function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    setLanguage(event.currentTarget.value as AppLanguage)
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
    : t.nativeFileUnavailable
  const visibleStatus = markdownDocument.isDirty ? t.unsaved : translateStatus(statusMessage, t)

  return (
    <main className={`app-shell view-${viewMode}`} lang={language === 'zh' ? 'zh-CN' : 'en'}>
      <header className="topbar">
        <div className="brand-block">
          <div className="app-mark" aria-hidden="true">
            <AppLogo />
          </div>
          <div>
            <h1>MDView</h1>
            <p title={markdownDocument.path ?? markdownDocument.title}>{markdownDocument.title}</p>
          </div>
        </div>

        <nav className="toolbar" aria-label={t.documentActions}>
          <button type="button" onClick={handleNewDocument} aria-label={t.createNewLabel}>
            <FilePlus2 aria-hidden="true" />
            <span>{t.createNew}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenFile}
            aria-label={t.openLabel}
            disabled={!fileAccess.supportsNativeFiles}
            title={nativeFileTitle}
          >
            <FolderOpen aria-hidden="true" />
            <span>{t.open}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveFile}
            aria-label={t.saveLabel}
            disabled={!fileAccess.supportsNativeFiles}
            title={nativeFileTitle}
          >
            <Save aria-hidden="true" />
            <span>{t.save}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveFileAs}
            aria-label={t.saveAsLabel}
            disabled={!fileAccess.supportsNativeFiles}
            title={nativeFileTitle}
          >
            <SaveAll aria-hidden="true" />
            <span>{t.saveAs}</span>
          </button>
          <button type="button" onClick={() => setIsAboutOpen(true)} aria-label={t.aboutOpenLabel}>
            <Info aria-hidden="true" />
            <span>{t.about}</span>
          </button>
        </nav>

        <div className="view-controls" aria-label={t.viewMode}>
          <button
            type="button"
            className={viewMode === 'preview' ? 'active' : ''}
            onClick={() => setViewMode('preview')}
            aria-label={t.previewLabel}
          >
            <Eye aria-hidden="true" />
            <span>{t.preview}</span>
          </button>
          <button
            type="button"
            className={viewMode === 'edit' ? 'active' : ''}
            onClick={() => setViewMode('edit')}
            aria-label={t.editLabel}
          >
            <PencilLine aria-hidden="true" />
            <span>{t.edit}</span>
          </button>
          <button
            type="button"
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => setViewMode('split')}
            aria-label={t.splitLabel}
          >
            <SplitSquareHorizontal aria-hidden="true" />
            <span>{t.split}</span>
          </button>
        </div>

        <label className="language-control">
          <Languages aria-hidden="true" />
          <span className="visually-hidden">{t.languageLabel}</span>
          <select value={language} onChange={handleLanguageChange} aria-label={t.languageLabel}>
            <option value="en">{t.languageEnglish}</option>
            <option value="zh">{t.languageChinese}</option>
          </select>
        </label>

        <div className={`save-state ${markdownDocument.isDirty ? 'dirty' : ''}`}>
          {visibleStatus}
        </div>
      </header>

      <section className={workspaceClasses} aria-label={t.workspace}>
        {isOutlineVisible ? (
          <aside
            className="outline-panel"
            aria-label={t.outlinePanel}
            style={{ width: `${outlineWidth}px` }}
          >
            <DocumentOutline
              items={outlineItems}
              onJump={handleOutlineJump}
              onClose={() => setIsOutlineOpen(false)}
              t={t}
            />
          </aside>
        ) : null}
        {isOutlineVisible ? (
          <div
            className="outline-resizer"
            role="separator"
            aria-label={t.resizeOutline}
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
            aria-label={t.expandOutline}
          >
            <PanelLeftOpen aria-hidden="true" />
          </button>
        ) : null}
        <section className="editor-panel" aria-label={t.sourceEditorPanel}>
          <MarkdownEditor
            value={markdownDocument.content}
            onChange={handleContentChange}
            label={t.markdownSource}
          />
        </section>
        <section className="preview-panel" aria-label={t.previewPanel}>
          <MarkdownPreview content={markdownDocument.content} />
        </section>
      </section>
      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} t={t} />
    </main>
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : translations.en.fileOperationFailed
}

function translateStatus(statusMessage: 'saved' | 'opened' | string, t: (typeof translations)['en']) {
  if (statusMessage === 'saved') {
    return t.saved
  }

  if (statusMessage === 'opened') {
    return t.opened
  }

  if (statusMessage === 'unsaved') {
    return t.unsaved
  }

  return statusMessage
}

function clampOutlineWidth(width: number): number {
  return Math.min(Math.max(width, MIN_OUTLINE_WIDTH), MAX_OUTLINE_WIDTH)
}

export default App
