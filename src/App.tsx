import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
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
import { UpdateDialog } from './components/UpdateDialog'
import { AppLogo } from './components/AppLogo'
import { DocumentOutline } from './components/DocumentOutline'
import { MarkdownPreview } from './components/MarkdownPreview'
import { MarkdownEditor } from './components/MarkdownEditor'
import { WelcomeWorkspace } from './components/WelcomeWorkspace'
import { buildExportHtml } from './domain/exportHtml'
import {
  detectSystemLanguage,
  translations,
  type AppLanguage,
} from './i18n'
import {
  MAX_OUTLINE_WIDTH,
  MIN_OUTLINE_WIDTH,
  useOutlineNavigation,
} from './hooks/useOutlineNavigation'
import { useAppMenu } from './hooks/useAppMenu'
import { useAppUpdater } from './hooks/useAppUpdater'
import { useDocumentController } from './hooks/useDocumentController'
import { usePreviewController } from './hooks/usePreviewController'
import { useTransientToast } from './hooks/useTransientToast'
import { tauriFileAccess, type FileAccess } from './platform/fileAccess'
import { tauriAppUpdateClient, type AppUpdateClient } from './platform/appUpdates'
import {
  withShortcutTitle,
} from './platform/keyboardShortcuts'
import { useFileShortcuts } from './hooks/useFileShortcuts'

type ViewMode = 'preview' | 'edit' | 'split'

type AppProps = {
  appUpdateClient?: AppUpdateClient
  fileAccess?: FileAccess
  initialLanguage?: AppLanguage
}

function App({
  appUpdateClient = tauriAppUpdateClient,
  fileAccess = tauriFileAccess,
  initialLanguage,
}: AppProps) {
  const [language, setLanguage] = useState<AppLanguage>(() => initialLanguage ?? detectSystemLanguage())
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const previewPanelRef = useRef<HTMLElement | null>(null)
  const previewRef = useRef<HTMLElement | null>(null)
  const t = translations[language]
  const {
    activeMenu,
    closeMenu,
    menuBarRef,
    toggleMenu,
  } = useAppMenu()
  const {
    showAppToast,
    showPreviewToast,
    toast: shortcutToast,
  } = useTransientToast()
  const {
    handleClearRecentFiles,
    handleContentChange,
    handleNewDocument,
    handleOpenFile,
    handleOpenRecentFile,
    handleSaveFile,
    handleSaveFileAs,
    isWelcomeVisible,
    markdownDocument,
    openMarkdownLinkFile,
    recentFiles,
    setStatusMessage,
    statusMessage,
  } = useDocumentController({
    fileAccess,
    discardUnsavedMessage: t.discardUnsaved,
    recentFileOpenFailedMessage: t.recentFileOpenFailed,
    fileOperationFailedMessage: t.fileOperationFailed,
    onCloseMenu: closeMenu,
    onViewModeChange: setViewMode,
  })
  const {
    checkForUpdates,
    dismiss: dismissUpdateDialog,
    distribution,
    errorMessage: updateErrorMessage,
    installUpdate,
    openPortableDownload,
    phase: updatePhase,
    progress: updateProgress,
    update: availableUpdate,
  } = useAppUpdater({
    client: appUpdateClient,
    checkFailedMessage: t.updateCheckFailed,
    installFailedMessage: t.updateInstallFailed,
    releaseOpenFailedMessage: t.updateReleaseOpenFailed,
    unsupportedMessage: t.updateUnavailable,
  })
  const shortcutPlatform = useFileShortcuts({
    supportsNativeFiles: fileAccess.supportsNativeFiles,
    onCloseMenu: closeMenu,
    onNew: handleNewDocument,
    onOpen: handleOpenFile,
    onSave: handleSaveFile,
    onSaveAs: handleSaveFileAs,
    onSaveSuccess: () => showAppToast(t.saved),
  })
  const {
    freezePreview,
    previewContent,
    previewZoom,
    prepareSplitPreview,
  } = usePreviewController({
    content: markdownDocument.content,
    isEnabled: !isWelcomeVisible,
    isPreview: !isWelcomeVisible && viewMode === 'preview',
    isSplit: viewMode === 'split',
    previewPanelRef,
    onZoomChange: showPreviewToast,
  })
  const {
    activeOutlineId,
    beginOutlineResize,
    closeOutline,
    handleOutlineJump,
    handleOutlineResizeKey,
    isOutlineOpen,
    openOutline,
    outlineItems,
    outlineWidth,
    queueHeadingJump,
  } = useOutlineNavigation({
    content: markdownDocument.content,
    isPreview: !isWelcomeVisible && viewMode === 'preview',
    previewZoom,
    previewPanelRef,
    previewRef,
  })
  const handleOpenMarkdownLink = useCallback(async (path: string, headingId?: string) => {
    if (await openMarkdownLinkFile(path)) {
      queueHeadingJump(headingId)
    }
  }, [openMarkdownLinkFile, queueHeadingJump])

  async function handleExportHtml() {
    closeMenu()

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
    closeMenu()

    try {
      await fileAccess.printExportHtml(buildCurrentExportHtml(), markdownDocument.title)
      setStatusMessage(t.printDialogOpened)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleExportDocx() {
    closeMenu()
    setStatusMessage(t.exportDocxPreparing)

    try {
      const { buildExportDocx } = await import('./domain/exportDocx')
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

  function handleOpenAboutFromAppMenu() {
    closeMenu()
    setIsAboutOpen(true)
  }

  function handleLanguageSelect(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage)
    closeMenu()
  }

  async function handleCheckForUpdates() {
    closeMenu()
    const result = await checkForUpdates()
    if (result === 'latest') {
      showAppToast(t.updateNoUpdate)
    }
  }

  async function handleInstallUpdate() {
    if (markdownDocument.isDirty) {
      showAppToast(t.updateSaveFirst)
      return
    }

    await installUpdate()
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
  const documentActionTitle = isWelcomeVisible ? t.welcomeDocumentRequired : nativeFileTitle
  const updateActionTitle = distribution === 'unsupported' ? t.updateUnavailable : undefined
  const newTitle = withShortcutTitle(t.createNewLabel, { key: 'n' }, shortcutPlatform)
  const openTitle = withShortcutTitle(t.openLabel, { key: 'o' }, shortcutPlatform)
  const saveTitle = withShortcutTitle(t.saveLabel, { key: 's' }, shortcutPlatform)
  const saveAsTitle = withShortcutTitle(t.saveAsLabel, { key: 's', shiftKey: true }, shortcutPlatform)
  const visibleStatus = markdownDocument.isDirty ? t.unsaved : translateStatus(statusMessage, t)
  const previewPanelStyle = { '--preview-zoom': previewZoom } as CSSProperties

  const welcomeStatus = !['saved', 'opened', 'unsaved'].includes(statusMessage)
    ? statusMessage
    : null

  return (
    <main
      className={`app-shell view-${viewMode} ${isWelcomeVisible ? 'welcome-open' : ''}`}
      lang={language === 'zh' ? 'zh-CN' : 'en'}
    >
      <header className="topbar">
        <div className="brand-block">
          <div className="app-mark" aria-hidden="true">
            <AppLogo />
          </div>
          <div>
            <h1>MDView</h1>
            <p title={isWelcomeVisible ? t.welcomeBrand : markdownDocument.path ?? markdownDocument.title}>
              {isWelcomeVisible ? t.welcomeBrand : markdownDocument.title}
            </p>
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
                  disabled={isWelcomeVisible || !fileAccess.supportsNativeFiles}
                  title={documentActionTitle ?? saveTitle}
                  role="menuitem"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleSaveFileAs}
                  disabled={isWelcomeVisible || !fileAccess.supportsNativeFiles}
                  title={documentActionTitle ?? saveAsTitle}
                  role="menuitem"
                >
                  {t.saveAs}
                </button>
              </div>
            ) : null}
          </div>

          {!isWelcomeVisible ? <div className="action-menu">
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
          </div> : null}

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
                  onClick={() => void handleCheckForUpdates()}
                  disabled={distribution === 'unsupported' || updatePhase === 'checking'}
                  title={updateActionTitle}
                  role="menuitem"
                >
                  {updatePhase === 'checking' ? t.updateChecking : t.checkForUpdates}
                </button>
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

        {!isWelcomeVisible ? <div className="view-controls" aria-label={t.viewMode}>
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
            onClick={() => {
              freezePreview()
              setViewMode('edit')
            }}
            aria-label={t.editLabel}
          >
            <PencilLine aria-hidden="true" />
            <span>{t.edit}</span>
          </button>
          <button
            type="button"
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => {
              prepareSplitPreview()
              setViewMode('split')
            }}
            aria-label={t.splitLabel}
          >
            <SplitSquareHorizontal aria-hidden="true" />
            <span>{t.split}</span>
          </button>
        </div> : null}

        {!isWelcomeVisible ? <div className={`save-state ${markdownDocument.isDirty ? 'dirty' : ''}`}>
          {visibleStatus}
        </div> : null}
      </header>

      {isWelcomeVisible ? (
        <WelcomeWorkspace
          recentFiles={recentFiles}
          canOpenFiles={fileAccess.supportsNativeFiles}
          statusMessage={welcomeStatus}
          onNew={handleNewDocument}
          onOpen={handleOpenFile}
          onOpenRecent={handleOpenRecentFile}
          onClearRecent={handleClearRecentFiles}
          t={t}
        />
      ) : <section className={workspaceClasses} aria-label={t.workspace}>
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
              onClose={closeOutline}
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
            onPointerDown={(event) => beginOutlineResize(event.clientX)}
            onKeyDown={handleOutlineResizeKey}
          />
        ) : null}
        {viewMode === 'preview' && !isOutlineOpen ? (
          <button
            type="button"
            className="outline-reopen"
            onClick={openOutline}
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
            content={previewContent}
            previewRef={previewRef}
            sourcePath={markdownDocument.path}
            readLocalImageFile={fileAccess.readLocalImageFile}
            onOpenMarkdownLink={handleOpenMarkdownLink}
            labels={t.previewLabels}
          />
        </section>
        {shortcutToast?.placement === 'preview' && viewMode !== 'edit' ? (
          <div className="zoom-toast-layer">
            <div
              className="shortcut-toast zoom-toast"
              role="status"
              aria-label={t.shortcutNotification}
            >
              {shortcutToast.message}
            </div>
          </div>
        ) : null}
      </section>}
      {shortcutToast?.placement === 'app' ? (
        <div className="shortcut-toast" role="status" aria-label={t.shortcutNotification}>
          {shortcutToast.message}
        </div>
      ) : null}
      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} t={t} />
      <UpdateDialog
        distribution={distribution}
        errorMessage={updateErrorMessage}
        onCheckAgain={() => void handleCheckForUpdates()}
        onClose={dismissUpdateDialog}
        onInstall={() => void handleInstallUpdate()}
        onOpenPortableDownload={() => void openPortableDownload()}
        phase={updatePhase}
        progress={updateProgress}
        t={t}
        update={availableUpdate}
      />
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

export default App
