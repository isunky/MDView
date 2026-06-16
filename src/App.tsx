import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  ChevronDown,
  Eye,
  FilePlus2,
  FolderOpen,
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
import { buildExportHtml } from './domain/exportHtml'
import { extractMarkdownOutline } from './domain/markdownOutline'
import {
  addRecentFile,
  clearRecentFiles,
  loadRecentFiles,
  removeRecentFile,
  saveRecentFiles,
} from './domain/recentFiles'
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
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false)
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false)
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [isOutlineOpen, setIsOutlineOpen] = useState(true)
  const [outlineWidth, setOutlineWidth] = useState(DEFAULT_OUTLINE_WIDTH)
  const [outlineResizeStart, setOutlineResizeStart] = useState<OutlineResizeStart>(null)
  const logoMenuRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLElement | null>(null)
  const outlineItems = useMemo(
    () => extractMarkdownOutline(markdownDocument.content),
    [markdownDocument.content],
  )
  const t = translations[language]

  const rememberRecentFile = useCallback((path: string) => {
    setRecentFiles((currentFiles) => {
      const nextFiles = addRecentFile(currentFiles, path)
      saveRecentFiles(nextFiles)
      return nextFiles
    })
  }, [])

  const forgetRecentFile = useCallback((path: string) => {
    setRecentFiles((currentFiles) => {
      const nextFiles = removeRecentFile(currentFiles, path)
      saveRecentFiles(nextFiles)
      return nextFiles
    })
  }, [])

  const loadFile = useCallback((file: OpenedMarkdownFile) => {
    setMarkdownDocument((current) => replaceDocumentContent(current, file.content, file.path))
    setViewMode('preview')
    setStatusMessage('opened')
    rememberRecentFile(file.path)
  }, [rememberRecentFile])

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

  useEffect(() => {
    if (!isLogoMenuOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && logoMenuRef.current?.contains(target)) {
        return
      }

      setIsLogoMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLogoMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLogoMenuOpen])

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

    setIsFileMenuOpen(false)

    try {
      const file = await fileAccess.openMarkdownFile()
      if (file) {
        loadFile(file)
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleOpenRecentFile(path: string) {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    setIsFileMenuOpen(false)

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path))
    } catch {
      forgetRecentFile(path)
      setStatusMessage(t.recentFileOpenFailed)
    }
  }

  async function handleExportHtml() {
    setIsFileMenuOpen(false)

    try {
      const savedPath = await fileAccess.exportHtmlFile(
        buildCurrentExportHtml(),
        markdownDocument.path,
        markdownDocument.title,
      )
      setStatusMessage(savedPath ? t.exportHtmlSaved : t.exportCanceled)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleExportPdf() {
    setIsFileMenuOpen(false)

    try {
      await fileAccess.printExportHtml(buildCurrentExportHtml(), markdownDocument.title)
      setStatusMessage(t.printDialogOpened)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  function buildCurrentExportHtml(): string {
    const previewElement = previewRef.current
    if (!previewElement) {
      throw new Error(t.exportPreviewUnavailable)
    }

    return buildExportHtml({
      title: markdownDocument.title,
      lang: language === 'zh' ? 'zh-CN' : 'en',
      contentHtml: previewElement.innerHTML,
    })
  }

  async function handleSaveFile() {
    try {
      const currentPath = markdownDocument.path
      const isSaveAs = !currentPath
      const savedPath = isSaveAs
        ? await fileAccess.saveMarkdownFileAs(markdownDocument.content, currentPath)
        : await fileAccess.saveMarkdownFile(currentPath, markdownDocument.content)

      if (savedPath) {
        setMarkdownDocument((current) => markDocumentSaved(current, savedPath))
        setStatusMessage('saved')
        if (isSaveAs) {
          rememberRecentFile(savedPath)
        }
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
        rememberRecentFile(savedPath)
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

  function handleOpenAboutFromLogoMenu() {
    setIsLogoMenuOpen(false)
    setIsAboutOpen(true)
  }

  function handleLanguageSelect(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage)
    setIsLogoMenuOpen(false)
  }

  function handleClearRecentFiles() {
    clearRecentFiles()
    setRecentFiles([])
    setIsFileMenuOpen(false)
  }

  function handleOutlineJump(id: string) {
    window.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleOutlineResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
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
          <div className="logo-menu" ref={logoMenuRef}>
            <button
              type="button"
              className="app-mark logo-menu-trigger"
              onClick={() => {
                setIsFileMenuOpen(false)
                setIsLogoMenuOpen((isOpen) => !isOpen)
              }}
              aria-label={t.logoMenuLabel}
              aria-haspopup="menu"
              aria-expanded={isLogoMenuOpen}
            >
              <AppLogo />
            </button>
            {isLogoMenuOpen ? (
              <div className="logo-menu-panel" role="menu">
                <button
                  type="button"
                  className="logo-menu-item"
                  onClick={handleOpenAboutFromLogoMenu}
                  role="menuitem"
                >
                  {t.about}
                </button>
                <div className="logo-menu-divider" />
                <div className="logo-menu-label">{t.languageLabel}</div>
                <button
                  type="button"
                  className={`logo-menu-item ${language === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect('en')}
                  role="menuitem"
                >
                  {t.languageEnglish}
                </button>
                <button
                  type="button"
                  className={`logo-menu-item ${language === 'zh' ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect('zh')}
                  role="menuitem"
                >
                  {t.languageChinese}
                </button>
              </div>
            ) : null}
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
          <div className="file-menu">
            <button
              type="button"
              onClick={() => {
                setIsLogoMenuOpen(false)
                setIsFileMenuOpen((isOpen) => !isOpen)
              }}
              aria-haspopup="menu"
              aria-expanded={isFileMenuOpen}
              disabled={!fileAccess.supportsNativeFiles}
              title={nativeFileTitle}
            >
              <FolderOpen aria-hidden="true" />
              <span>{t.open}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {isFileMenuOpen && fileAccess.supportsNativeFiles ? (
              <div className="file-menu-panel" role="menu">
                <button
                  type="button"
                  className="file-menu-item"
                  onClick={handleOpenFile}
                  role="menuitem"
                >
                  {t.openMarkdownFile}
                </button>
                <div className="file-menu-divider" />
                <div className="file-menu-section-label">{t.recentFiles}</div>
                {recentFiles.length > 0 ? (
                  recentFiles.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      className="file-menu-item recent-file-item"
                      onClick={() => handleOpenRecentFile(file.path)}
                      title={file.path}
                      role="menuitem"
                    >
                      {file.title}
                    </button>
                  ))
                ) : (
                  <div className="file-menu-empty">{t.noRecentFiles}</div>
                )}
                <button
                  type="button"
                  className="file-menu-item file-menu-clear"
                  onClick={handleClearRecentFiles}
                  disabled={recentFiles.length === 0}
                  role="menuitem"
                >
                  {t.clearRecentFiles}
                </button>
                <div className="file-menu-divider" />
                <button
                  type="button"
                  className="file-menu-item"
                  onClick={handleExportHtml}
                  role="menuitem"
                >
                  {t.exportAsHtml}
                </button>
                <button
                  type="button"
                  className="file-menu-item"
                  onClick={handleExportPdf}
                  role="menuitem"
                >
                  {t.exportAsPdf}
                </button>
              </div>
            ) : null}
          </div>
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
          <MarkdownPreview content={markdownDocument.content} previewRef={previewRef} />
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
