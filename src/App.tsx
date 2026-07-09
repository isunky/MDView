import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  ChevronDown,
  Download,
  Eye,
  FolderOpen,
  PanelLeftOpen,
  PencilLine,
  Settings,
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
import { buildExportDocx } from './domain/exportDocx'
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
  MAX_OUTLINE_WIDTH,
  MIN_OUTLINE_WIDTH,
  clampOutlineWidth,
  loadOutlinePreferences,
  saveOutlinePreferences,
} from './domain/outlinePreferences'
import {
  findActiveOutlineId,
  type OutlineHeadingPosition,
} from './domain/outlineScroll'
import {
  detectSystemLanguage,
  translations,
  type AppLanguage,
} from './i18n'
import { tauriFileAccess, type FileAccess, type OpenedMarkdownFile } from './platform/fileAccess'
import {
  detectShortcutPlatform,
  matchesShortcut,
  withShortcutTitle,
} from './platform/keyboardShortcuts'

type ViewMode = 'preview' | 'edit' | 'split'
type MenuId = 'file' | 'export' | 'app'

type AppProps = {
  fileAccess?: FileAccess
  initialLanguage?: AppLanguage
}

const OUTLINE_KEYBOARD_STEP = 16
const PREVIEW_HEADING_SCROLL_OFFSET = 16
const PREVIEW_HEADING_ACTIVE_OFFSET = 24
const OUTLINE_JUMP_SETTLE_DELAY_MS = 120
const DEFAULT_PREVIEW_ZOOM = 1
const MIN_PREVIEW_ZOOM = 0.6
const MAX_PREVIEW_ZOOM = 2
const PREVIEW_ZOOM_STEP = 0.1

type OutlineResizeStart = {
  pointerX: number
  width: number
} | null

type ShortcutToast = {
  id: number
  message: string
} | null

function App({ fileAccess = tauriFileAccess, initialLanguage }: AppProps) {
  const [language, setLanguage] = useState<AppLanguage>(() => initialLanguage ?? detectSystemLanguage())
  const [markdownDocument, setMarkdownDocument] = useState(createInitialDocument)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [statusMessage, setStatusMessage] = useState<'saved' | 'opened' | string>('saved')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null)
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const initialOutlinePreferences = useMemo(() => loadOutlinePreferences(), [])
  const [isOutlineOpen, setIsOutlineOpen] = useState(initialOutlinePreferences.isOpen)
  const [outlineWidth, setOutlineWidth] = useState(initialOutlinePreferences.width)
  const [outlineResizeStart, setOutlineResizeStart] = useState<OutlineResizeStart>(null)
  const [previewZoom, setPreviewZoom] = useState(DEFAULT_PREVIEW_ZOOM)
  const [pendingHeadingId, setPendingHeadingId] = useState<string | null>(null)
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null)
  const [shortcutToast, setShortcutToast] = useState<ShortcutToast>(null)
  const menuBarRef = useRef<HTMLElement | null>(null)
  const previewPanelRef = useRef<HTMLElement | null>(null)
  const previewRef = useRef<HTMLElement | null>(null)
  const outlineHeadingPositionsRef = useRef<OutlineHeadingPosition[]>([])
  const outlineJumpLockRef = useRef<string | null>(null)
  const outlineJumpSettleTimeoutRef = useRef<number | null>(null)
  const shortcutPlatform = useMemo(() => detectShortcutPlatform(), [])
  const outlineItems = useMemo(
    () => extractMarkdownOutline(markdownDocument.content),
    [markdownDocument.content],
  )
  const outlineIds = useMemo(() => outlineItems.map((item) => item.id), [outlineItems])
  const t = translations[language]
  const canDiscardUnsavedChanges = useCallback((): boolean => {
    return !markdownDocument.isDirty || window.confirm(t.discardUnsaved)
  }, [markdownDocument.isDirty, t.discardUnsaved])

  const updateActiveOutlineFromPreview = useCallback(() => {
    const previewPanel = previewPanelRef.current
    if (viewMode !== 'preview' || !previewPanel) {
      setActiveOutlineId(null)
      return
    }

    const nextActiveId = findActiveOutlineId(
      outlineHeadingPositionsRef.current,
      previewPanel.scrollTop,
      PREVIEW_HEADING_ACTIVE_OFFSET,
    )
    setActiveOutlineId((currentId) => currentId === nextActiveId ? currentId : nextActiveId)
  }, [viewMode])

  const releaseOutlineJumpLock = useCallback(() => {
    if (outlineJumpSettleTimeoutRef.current !== null) {
      window.clearTimeout(outlineJumpSettleTimeoutRef.current)
      outlineJumpSettleTimeoutRef.current = null
    }

    outlineJumpLockRef.current = null
    updateActiveOutlineFromPreview()
  }, [updateActiveOutlineFromPreview])

  const scheduleOutlineJumpRelease = useCallback(() => {
    if (outlineJumpSettleTimeoutRef.current !== null) {
      window.clearTimeout(outlineJumpSettleTimeoutRef.current)
    }

    outlineJumpSettleTimeoutRef.current = window.setTimeout(
      releaseOutlineJumpLock,
      OUTLINE_JUMP_SETTLE_DELAY_MS,
    )
  }, [releaseOutlineJumpLock])

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
    saveOutlinePreferences({ width: outlineWidth, isOpen: isOutlineOpen })
  }, [isOutlineOpen, outlineWidth])

  useEffect(() => {
    return () => {
      if (outlineJumpSettleTimeoutRef.current !== null) {
        window.clearTimeout(outlineJumpSettleTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!pendingHeadingId) {
      return
    }

    const headingId = pendingHeadingId
    const timeoutId = window.setTimeout(() => {
      const previewPanel = previewPanelRef.current
      if (outlineIds.includes(headingId)) {
        setActiveOutlineId(headingId)
        outlineJumpLockRef.current = headingId
        scheduleOutlineJumpRelease()
      }

      if (!previewPanel || !scrollPreviewHeadingIntoView(previewPanel, headingId)) {
        window.document.getElementById(headingId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setPendingHeadingId(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [markdownDocument.content, outlineIds, pendingHeadingId, scheduleOutlineJumpRelease])

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
    const previewPanel = previewPanelRef.current
    const preview = previewRef.current
    if (viewMode !== 'preview' || !previewPanel || outlineIds.length === 0) {
      outlineHeadingPositionsRef.current = []
      return
    }

    const activePreviewPanel = previewPanel
    let frameId: number | null = null

    function measureHeadingPositions() {
      frameId = null
      const panelTop = activePreviewPanel.getBoundingClientRect().top
      outlineHeadingPositionsRef.current = outlineIds.flatMap((id) => {
        const heading = window.document.getElementById(id)
        if (!(heading instanceof HTMLElement) || !activePreviewPanel.contains(heading)) {
          return []
        }

        return [{
          id,
          top: activePreviewPanel.scrollTop + heading.getBoundingClientRect().top - panelTop,
        }]
      })
      updateActiveOutlineFromPreview()
    }

    function scheduleHeadingMeasurement() {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(measureHeadingPositions)
      }
    }

    scheduleHeadingMeasurement()
    window.addEventListener('resize', scheduleHeadingMeasurement)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleHeadingMeasurement)
    resizeObserver?.observe(activePreviewPanel)
    if (preview) {
      resizeObserver?.observe(preview)
    }

    return () => {
      window.removeEventListener('resize', scheduleHeadingMeasurement)
      resizeObserver?.disconnect()
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [
    isOutlineOpen,
    outlineIds,
    outlineWidth,
    previewZoom,
    updateActiveOutlineFromPreview,
    viewMode,
  ])

  useEffect(() => {
    const previewPanel = previewPanelRef.current
    if (viewMode !== 'preview' || !previewPanel || outlineIds.length === 0) {
      outlineJumpLockRef.current = null
      setActiveOutlineId(null)
      return
    }

    const activePreviewPanel = previewPanel
    let frameId: number | null = null

    function updateActiveOutlineId() {
      frameId = null
      if (outlineJumpLockRef.current) {
        return
      }

      updateActiveOutlineFromPreview()
    }

    function scheduleActiveOutlineUpdate() {
      if (outlineJumpLockRef.current) {
        scheduleOutlineJumpRelease()
        return
      }

      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(updateActiveOutlineId)
    }

    scheduleActiveOutlineUpdate()
    activePreviewPanel.addEventListener('scroll', scheduleActiveOutlineUpdate, { passive: true })

    return () => {
      activePreviewPanel.removeEventListener('scroll', scheduleActiveOutlineUpdate)
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [
    outlineIds,
    scheduleOutlineJumpRelease,
    updateActiveOutlineFromPreview,
    viewMode,
  ])

  useEffect(() => {
    if (!activeMenu) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && menuBarRef.current?.contains(target)) {
        return
      }

      setActiveMenu(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveMenu(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeMenu])

  useEffect(() => {
    const previewPanel = previewPanelRef.current
    if (!previewPanel) {
      return
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey) {
        return
      }

      event.preventDefault()
      setPreviewZoom((currentZoom) =>
        clampPreviewZoom(
          currentZoom + (event.deltaY < 0 ? PREVIEW_ZOOM_STEP : -PREVIEW_ZOOM_STEP),
        ),
      )
    }

    previewPanel.addEventListener('wheel', handleWheel, { passive: false })
    return () => previewPanel.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    if (!shortcutToast) {
      return
    }

    const timeoutId = window.setTimeout(() => setShortcutToast(null), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [shortcutToast])

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const isNewShortcut = matchesShortcut(event, { key: 'n' }, shortcutPlatform)
      const isOpenShortcut = matchesShortcut(event, { key: 'o' }, shortcutPlatform)
      const isSaveShortcut = matchesShortcut(event, { key: 's' }, shortcutPlatform)
      const isSaveAsShortcut = matchesShortcut(event, { key: 's', shiftKey: true }, shortcutPlatform)

      if (!isNewShortcut && !isOpenShortcut && !isSaveShortcut && !isSaveAsShortcut) {
        return
      }

      event.preventDefault()
      setActiveMenu(null)

      if (isNewShortcut) {
        void handleNewDocument()
        return
      }

      if (!fileAccess.supportsNativeFiles) {
        return
      }

      if (isOpenShortcut) {
        void handleOpenFile()
        return
      }

      if (isSaveAsShortcut) {
        void handleSaveFileAs()
        return
      }

      void handleSaveFile().then((saved) => {
        if (saved) {
          showShortcutToast(t.saved)
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  async function handleNewDocument() {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    setActiveMenu(null)
    setMarkdownDocument(createInitialDocument())
    setViewMode('edit')
    setStatusMessage('saved')
  }

  async function handleOpenFile() {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    setActiveMenu(null)

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

    setActiveMenu(null)

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path))
    } catch {
      forgetRecentFile(path)
      setStatusMessage(t.recentFileOpenFailed)
    }
  }

  const handleOpenMarkdownLink = useCallback(async (path: string, headingId?: string) => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path))
      setPendingHeadingId(headingId ?? null)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }, [canDiscardUnsavedChanges, fileAccess, loadFile])

  async function handleExportHtml() {
    setActiveMenu(null)

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
    setActiveMenu(null)

    try {
      await fileAccess.printExportHtml(buildCurrentExportHtml(), markdownDocument.title)
      setStatusMessage(t.printDialogOpened)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleExportDocx() {
    setActiveMenu(null)

    try {
      const bytes = await buildExportDocx({
        title: markdownDocument.title,
        content: markdownDocument.content,
        sourcePath: markdownDocument.path,
        readLocalImageFile: fileAccess.readLocalImageFile,
      })
      const savedPath = await fileAccess.exportDocxFile(
        bytes,
        markdownDocument.path,
        markdownDocument.title,
      )
      setStatusMessage(savedPath ? t.exportDocxSaved : t.exportCanceled)
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

  async function handleSaveFile(): Promise<boolean> {
    setActiveMenu(null)

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
        return true
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }

    return false
  }

  async function handleSaveFileAs() {
    setActiveMenu(null)

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

  function showShortcutToast(message: string) {
    setShortcutToast({ id: Date.now(), message })
  }

  function handleOpenAboutFromAppMenu() {
    setActiveMenu(null)
    setIsAboutOpen(true)
  }

  function handleLanguageSelect(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage)
    setActiveMenu(null)
  }

  function handleClearRecentFiles() {
    clearRecentFiles()
    setRecentFiles([])
    setActiveMenu(null)
  }

  function toggleMenu(menuId: MenuId) {
    setActiveMenu((currentMenu) => (currentMenu === menuId ? null : menuId))
  }

  function handleOutlineJump(id: string) {
    const previewPanel = previewPanelRef.current
    setActiveOutlineId(id)
    outlineJumpLockRef.current = id
    scheduleOutlineJumpRelease()

    if (!previewPanel || !scrollPreviewHeadingIntoView(previewPanel, id)) {
      window.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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
  const newTitle = withShortcutTitle(t.createNewLabel, { key: 'n' }, shortcutPlatform)
  const openTitle = withShortcutTitle(t.openLabel, { key: 'o' }, shortcutPlatform)
  const saveTitle = withShortcutTitle(t.saveLabel, { key: 's' }, shortcutPlatform)
  const saveAsTitle = withShortcutTitle(t.saveAsLabel, { key: 's', shiftKey: true }, shortcutPlatform)
  const visibleStatus = markdownDocument.isDirty ? t.unsaved : translateStatus(statusMessage, t)
  const previewPanelStyle = { '--preview-zoom': previewZoom } as CSSProperties

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

        <nav className="toolbar" aria-label={t.documentActions} ref={menuBarRef}>
          <div className="action-menu">
            <button
              type="button"
              onClick={() => toggleMenu('file')}
              aria-haspopup="menu"
              aria-expanded={activeMenu === 'file'}
            >
              <FolderOpen aria-hidden="true" />
              <span>{t.fileMenu}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {activeMenu === 'file' ? (
              <div className="action-menu-panel" role="menu">
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleNewDocument}
                  title={newTitle}
                  role="menuitem"
                >
                  {t.createNew}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleOpenFile}
                  disabled={!fileAccess.supportsNativeFiles}
                  title={nativeFileTitle ?? openTitle}
                  role="menuitem"
                >
                  {t.openMarkdownFile}
                </button>
                <div className="action-menu-divider" />
                <div className="action-menu-section-label">{t.recentFiles}</div>
                {recentFiles.length > 0 ? (
                  recentFiles.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      className="action-menu-item recent-file-item"
                      onClick={() => handleOpenRecentFile(file.path)}
                      disabled={!fileAccess.supportsNativeFiles}
                      title={file.path}
                      role="menuitem"
                    >
                      {file.title}
                    </button>
                  ))
                ) : (
                  <div className="action-menu-empty">{t.noRecentFiles}</div>
                )}
                <button
                  type="button"
                  className="action-menu-item action-menu-clear"
                  onClick={handleClearRecentFiles}
                  disabled={recentFiles.length === 0}
                  role="menuitem"
                >
                  {t.clearRecentFiles}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={() => void handleSaveFile()}
                  disabled={!fileAccess.supportsNativeFiles}
                  title={nativeFileTitle ?? saveTitle}
                  role="menuitem"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleSaveFileAs}
                  disabled={!fileAccess.supportsNativeFiles}
                  title={nativeFileTitle ?? saveAsTitle}
                  role="menuitem"
                >
                  {t.saveAs}
                </button>
              </div>
            ) : null}
          </div>

          <div className="action-menu">
            <button
              type="button"
              onClick={() => toggleMenu('export')}
              aria-haspopup="menu"
              aria-expanded={activeMenu === 'export'}
              disabled={!fileAccess.supportsNativeFiles}
              title={nativeFileTitle}
            >
              <Download aria-hidden="true" />
              <span>{t.exportMenu}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {activeMenu === 'export' && fileAccess.supportsNativeFiles ? (
              <div className="action-menu-panel action-menu-panel-compact" role="menu">
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleExportHtml}
                  role="menuitem"
                >
                  {t.exportAsHtml}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleExportPdf}
                  role="menuitem"
                >
                  {t.exportAsPdf}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleExportDocx}
                  role="menuitem"
                >
                  {t.exportAsDocx}
                </button>
              </div>
            ) : null}
          </div>

          <div className="action-menu">
            <button
              type="button"
              onClick={() => toggleMenu('app')}
              aria-haspopup="menu"
              aria-expanded={activeMenu === 'app'}
            >
              <Settings aria-hidden="true" />
              <span>{t.appMenu}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {activeMenu === 'app' ? (
              <div className="action-menu-panel action-menu-panel-compact" role="menu">
                <div className="action-menu-section-label">{t.languageLabel}</div>
                <button
                  type="button"
                  className={`action-menu-item ${language === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect('en')}
                  role="menuitem"
                >
                  {t.languageEnglish}
                </button>
                <button
                  type="button"
                  className={`action-menu-item ${language === 'zh' ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect('zh')}
                  role="menuitem"
                >
                  {t.languageChinese}
                </button>
                <div className="action-menu-divider" />
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleOpenAboutFromAppMenu}
                  role="menuitem"
                >
                  {t.about}
                </button>
              </div>
            ) : null}
          </div>
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
              activeId={activeOutlineId}
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
            t={t}
            showToolbar={viewMode !== 'preview'}
          />
        </section>
        <section
          className="preview-panel"
          aria-label={t.previewPanel}
          ref={previewPanelRef}
          style={previewPanelStyle}
        >
          <MarkdownPreview
            content={markdownDocument.content}
            previewRef={previewRef}
            sourcePath={markdownDocument.path}
            readLocalImageFile={fileAccess.readLocalImageFile}
            onOpenMarkdownLink={handleOpenMarkdownLink}
            labels={t.previewLabels}
          />
        </section>
      </section>
      {shortcutToast ? (
        <div className="shortcut-toast" role="status" aria-label={t.shortcutNotification}>
          {shortcutToast.message}
        </div>
      ) : null}
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

function clampPreviewZoom(zoom: number): number {
  return Number(Math.min(Math.max(zoom, MIN_PREVIEW_ZOOM), MAX_PREVIEW_ZOOM).toFixed(2))
}

function scrollPreviewHeadingIntoView(previewPanel: HTMLElement, headingId: string): boolean {
  const heading = window.document.getElementById(headingId)
  if (!(heading instanceof HTMLElement) || !previewPanel.contains(heading)) {
    return false
  }

  const targetTop = Math.max(
    0,
    previewPanel.scrollTop +
      heading.getBoundingClientRect().top -
      previewPanel.getBoundingClientRect().top -
      PREVIEW_HEADING_SCROLL_OFFSET,
  )
  if (typeof previewPanel.scrollTo === 'function') {
    previewPanel.scrollTo({ top: targetTop, behavior: 'smooth' })
  } else {
    previewPanel.scrollTop = targetTop
  }
  return true
}

export default App
