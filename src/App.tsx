import {
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  ChevronDown,
  Download,
  Eye,
  FolderOpen,
  FolderSearch,
  PanelLeftOpen,
  PencilLine,
  Settings,
  SplitSquareHorizontal,
} from 'lucide-react'
import './App.css'
import { AboutDialog } from './components/AboutDialog'
import { DraftRecoveryDialog } from './components/DraftRecoveryDialog'
import { ReadingSettingsDialog } from './components/ReadingSettingsDialog'
import { SplitScrollControl } from './components/SplitScrollControl'
import { UpdateDialog } from './components/UpdateDialog'
import { AppLogo } from './components/AppLogo'
import { DocumentOutline } from './components/DocumentOutline'
import { DocumentSearchBar } from './components/DocumentSearchBar'
import { ExternalFileBanner } from './components/ExternalFileBanner'
import { EditorStatusBar } from './components/EditorStatusBar'
import { LazyMarkdownPreview, preloadMarkdownPreview } from './components/lazyMarkdownPreview'
import { MarkdownEditor, type MarkdownEditorHandle, type SelectionRange } from './components/MarkdownEditor'
import { WelcomeWorkspace } from './components/WelcomeWorkspace'
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
import { useDocumentSearch } from './hooks/useDocumentSearch'
import { useImageInsertion } from './hooks/useImageInsertion'
import { usePreviewController } from './hooks/usePreviewController'
import { useReadingSession } from './hooks/useReadingSession'
import { useReadingPreferences } from './hooks/useReadingPreferences'
import { useTransientToast } from './hooks/useTransientToast'
import { useSplitScrollSync } from './hooks/useSplitScrollSync'
import type { FileAccess } from './platform/fileAccess'
import type { AppUpdateClient } from './platform/appUpdates'
import { unsupportedAppUpdateClient } from './platform/unsupportedAppUpdates'
import {
  withShortcutTitle,
} from './platform/keyboardShortcuts'
import { useFileShortcuts } from './hooks/useFileShortcuts'
import { getCursorPosition, getDocumentStatistics } from './domain/documentStatistics'
import type { ReadingViewMode } from './domain/readingSessions'

type ViewMode = ReadingViewMode

type AppProps = {
  appUpdateClient?: AppUpdateClient
  fileAccess: FileAccess
  initialLanguage?: AppLanguage
  supportsAppUpdates?: boolean
}

function App({
  appUpdateClient = unsupportedAppUpdateClient,
  fileAccess,
  initialLanguage,
  supportsAppUpdates = true,
}: AppProps) {
  const [language, setLanguage] = useState<AppLanguage>(() => initialLanguage ?? detectSystemLanguage())
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isReadingSettingsOpen, setIsReadingSettingsOpen] = useState(false)
  const [editorSelection, setEditorSelection] = useState<SelectionRange>({ start: 0, end: 0 })
  const previewPanelRef = useRef<HTMLElement | null>(null)
  const previewRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<MarkdownEditorHandle | null>(null)
  const t = translations[language]
  const {
    effectiveTheme,
    preferences: readingPreferences,
    resetPreferences: resetReadingPreferences,
    updatePreferences: updateReadingPreferences,
  } = useReadingPreferences()
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
    handleKeepLocalEdits,
    handleNewDocument,
    handleOpenFile,
    handleOpenRecentFile,
    handleReloadDiskVersion,
    handleSaveFile,
    handleSaveFileAs,
    ensureDocumentPath,
    isSaving,
    isWelcomeVisible,
    markdownDocument,
    openMarkdownLinkFile,
    pendingDraft,
    recentFiles,
    restorePendingDraft,
    retryExternalFile,
    discardPendingDraft,
    externalFileState,
    setStatusMessage,
    statusMessage,
    transformDocumentContent,
  } = useDocumentController({
    fileAccess,
    discardUnsavedMessage: t.discardUnsaved,
    draftBackupFailedMessage: t.draftBackupFailed,
    externalFileUpdatedMessage: t.externalFileUpdated,
    externalFileConflictMessage: t.externalFileConflict,
    externalFileMissingMessage: t.externalFileMissing,
    externalFileSaveBlockedMessage: t.externalFileSaveBlocked,
    recentFileOpenFailedMessage: t.recentFileOpenFailed,
    fileOperationFailedMessage: t.fileOperationFailed,
    onCloseMenu: closeMenu,
    onViewModeChange: setViewMode,
  })
  const handleNewDocumentWithPreviewPreload = useCallback(() => {
    preloadMarkdownPreview()
    handleNewDocument()
  }, [handleNewDocument])
  const handleOpenFileWithPreviewPreload = useCallback(async () => {
    preloadMarkdownPreview()
    await handleOpenFile()
  }, [handleOpenFile])
  const handleOpenRecentFileWithPreviewPreload = useCallback(async (path: string) => {
    preloadMarkdownPreview()
    await handleOpenRecentFile(path)
  }, [handleOpenRecentFile])
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
    onNew: handleNewDocumentWithPreviewPreload,
    onOpen: handleOpenFileWithPreviewPreload,
    onSave: handleSaveFile,
    onSaveAs: handleSaveFileAs,
    onSaveSuccess: () => showAppToast(t.saved),
  })
  const {
    freezePreview,
    previewContent,
    previewZoom,
    prepareSplitPreview,
    restorePreviewZoom,
  } = usePreviewController({
    content: markdownDocument.content,
    isEnabled: !isWelcomeVisible,
    isPreview: !isWelcomeVisible && viewMode === 'preview',
    isSplit: viewMode === 'split',
    previewPanelRef,
    onZoomChange: showPreviewToast,
  })
  const {
    isSplitScrollSyncEnabled,
    toggleSplitScrollSync,
  } = useSplitScrollSync({
    editorRef,
    isSplit: viewMode === 'split',
    previewContent,
    previewPanelRef,
    previewRef,
    previewZoom,
  })
  const handleToggleSplitScrollSync = useCallback(() => {
    const nextEnabled = !isSplitScrollSyncEnabled
    toggleSplitScrollSync()
    showAppToast(nextEnabled ? t.splitScrollSyncEnabled : t.splitScrollSyncDisabled)
  }, [isSplitScrollSyncEnabled, showAppToast, t, toggleSplitScrollSync])
  const {
    activeOutlineId,
    beginOutlineResize,
    closeOutline,
    handleOutlineJump,
    handleOutlineResizeKey,
    isOutlineOpen,
    openOutline,
    outlineDepth,
    outlineItems,
    outlineWidth,
    queueHeadingJump,
    restoreOutlineLayout,
    setOutlineDepth,
  } = useOutlineNavigation({
    content: markdownDocument.content,
    isPreview: !isWelcomeVisible && viewMode === 'preview',
    previewZoom,
    previewPanelRef,
    previewRef,
  })
  const handleOpenMarkdownLink = useCallback(async (path: string, headingId?: string) => {
    preloadMarkdownPreview()
    if (await openMarkdownLinkFile(path)) {
      queueHeadingJump(headingId)
    }
  }, [openMarkdownLinkFile, queueHeadingJump])
  const handleRestoreReadingSession = useCallback((session: {
    previewZoom: number
    viewMode: ViewMode
    outlineWidth: number
    isOutlineOpen: boolean
  }) => {
    restorePreviewZoom(session.previewZoom)
    restoreOutlineLayout({ width: session.outlineWidth, isOpen: session.isOutlineOpen })
    setViewMode(session.viewMode)
  }, [restoreOutlineLayout, restorePreviewZoom])
  useReadingSession({
    documentPath: markdownDocument.path,
    isOutlineOpen,
    onRestore: handleRestoreReadingSession,
    outlineWidth,
    previewPanelRef,
    previewZoom,
    viewMode,
  })
  const documentSearch = useDocumentSearch({
    content: markdownDocument.content,
    editorRef,
    onContentChange: handleContentChange,
    viewMode,
  })
  const { importImages } = useImageInsertion({
    content: markdownDocument.content,
    documentPath: markdownDocument.path,
    ensureDocumentPath,
    fileAccess,
    messages: {
      failed: t.imageImportFailed,
      invalid: t.imageImportInvalid,
      success: t.imageImportSuccess,
      unsupported: t.imageImportUnsupported,
    },
    onContentTransform: transformDocumentContent,
    onNotify: showAppToast,
  })

  async function handleExportHtml() {
    closeMenu()
    setStatusMessage(t.exportHtmlPreparing)

    try {
      const { html, unresolvedResources } = await buildCurrentExportHtml()
      const savedPath = await fileAccess.exportHtmlFile(
        html,
        markdownDocument.path,
        markdownDocument.title,
      )
      setStatusMessage(savedPath
        ? unresolvedResources.length > 0 ? t.exportHtmlSavedWithWarnings(unresolvedResources.length) : t.exportHtmlSaved
        : t.exportCanceled)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleExportPdf() {
    closeMenu()

    try {
      const { html, unresolvedResources } = await buildCurrentExportHtml()
      await fileAccess.printExportHtml(html, markdownDocument.title)
      setStatusMessage(unresolvedResources.length > 0 ? t.printDialogOpenedWithWarnings(unresolvedResources.length) : t.printDialogOpened)
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

  async function handleRevealRecentFile(path: string) {
    try {
      await fileAccess.revealFileInFolder(path)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function buildCurrentExportHtml(): Promise<{ html: string; unresolvedResources: string[] }> {
    const previewElement = previewRef.current
    if (!previewElement) {
      throw new Error(t.exportPreviewUnavailable)
    }

    const [{ buildExportHtml }, { createLightExportContent }] = await Promise.all([
      import('./domain/exportHtml'),
      import('./domain/exportPreview'),
    ])

    const content = await createLightExportContent(previewElement, {
      sourcePath: markdownDocument.path,
      readLocalImageFile: fileAccess.readLocalImageFile,
      readRemoteImageFile: fileAccess.readRemoteImageFile,
    })
    return {
      unresolvedResources: content.unresolvedResources,
      html: buildExportHtml({
      title: markdownDocument.title,
      lang: language === 'zh' ? 'zh-CN' : 'en',
      contentHtml: content.html,
      }),
    }
  }

  function handleOpenAboutFromAppMenu() {
    closeMenu()
    setIsAboutOpen(true)
  }

  function handleLanguageSelect(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage)
    closeMenu()
  }

  function handleOpenReadingSettings() {
    closeMenu()
    setIsReadingSettingsOpen(true)
  }

  async function handleCheckForUpdates() {
    closeMenu()
    await checkForUpdates()
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
  const canRevealFiles = fileAccess.canRevealFile ?? fileAccess.supportsNativeFiles
  const updateActionTitle = distribution === 'unsupported' ? t.updateUnavailable : undefined
  const newTitle = withShortcutTitle(t.createNewLabel, { key: 'n' }, shortcutPlatform)
  const openTitle = withShortcutTitle(t.openLabel, { key: 'o' }, shortcutPlatform)
  const saveTitle = withShortcutTitle(t.saveLabel, { key: 's' }, shortcutPlatform)
  const saveAsTitle = withShortcutTitle(t.saveAsLabel, { key: 's', shiftKey: true }, shortcutPlatform)
  const previewPanelStyle = { '--preview-zoom': previewZoom } as CSSProperties
  const deferredContent = useDeferredValue(markdownDocument.content)
  const documentStatistics = useMemo(
    () => getDocumentStatistics(deferredContent),
    [deferredContent],
  )
  const cursorPosition = useMemo(
    () => getCursorPosition(markdownDocument.content, editorSelection.end),
    [editorSelection.end, markdownDocument.content],
  )

  const welcomeStatus = !['saved', 'opened', 'unsaved'].includes(statusMessage)
    ? statusMessage
    : null
  const operationStatus = !['saved', 'opened', 'unsaved'].includes(statusMessage)
    ? statusMessage
    : null

  return (
    <main
      className={`app-shell view-${viewMode} ${isWelcomeVisible ? 'welcome-open' : ''}`}
      data-mdview-color-theme={effectiveTheme}
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
                  onClick={handleNewDocumentWithPreviewPreload}
                  title={newTitle}
                  role="menuitem"
                >
                  {t.createNew}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleOpenFileWithPreviewPreload}
                  disabled={!fileAccess.supportsNativeFiles}
                  title={nativeFileTitle ?? openTitle}
                  role="menuitem"
                >
                  {t.openMarkdownFile}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={() => void handleSaveFile()}
                  disabled={isWelcomeVisible || !fileAccess.supportsNativeFiles || isSaving}
                  title={documentActionTitle ?? saveTitle}
                  role="menuitem"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleSaveFileAs}
                  disabled={isWelcomeVisible || !fileAccess.supportsNativeFiles || isSaving}
                  title={documentActionTitle ?? saveAsTitle}
                  role="menuitem"
                >
                  {t.saveAs}
                </button>
                <div className="action-menu-divider" />
                <div className="action-menu-section-label">{t.recentFiles}</div>
                {recentFiles.length > 0 ? (
                  recentFiles.map((file) => (
                    <div className="recent-file-menu-row" key={file.path}>
                      <button
                        type="button"
                        className="action-menu-item recent-file-item"
                        onClick={() => void handleOpenRecentFileWithPreviewPreload(file.path)}
                        disabled={!fileAccess.supportsNativeFiles}
                        title={file.path}
                        role="menuitem"
                      >
                        <span className="recent-file-title">{file.title}</span>
                      </button>
                      {canRevealFiles ? (
                        <button
                          type="button"
                          className="recent-file-reveal"
                          onClick={() => void handleRevealRecentFile(file.path)}
                          title={t.reveal}
                          aria-label={t.revealInFolder(file.title)}
                          role="menuitem"
                        >
                          <FolderSearch aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
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
                  onClick={handleOpenReadingSettings}
                  role="menuitem"
                >
                  {t.readingSettings}
                </button>
                {supportsAppUpdates ? <button
                  type="button"
                  className="action-menu-item"
                  onClick={() => void handleCheckForUpdates()}
                  disabled={distribution === 'unsupported' || updatePhase === 'checking'}
                  title={updateActionTitle}
                  role="menuitem"
                >
                  {updatePhase === 'checking' ? t.updateChecking : t.checkForUpdates}
                </button> : null}
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

        {!isWelcomeVisible ? <div className="view-controls" role="group" aria-label={t.viewMode}>
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

      </header>

      {isWelcomeVisible ? (
        <WelcomeWorkspace
          recentFiles={recentFiles}
          canOpenFiles={fileAccess.supportsNativeFiles}
          statusMessage={welcomeStatus}
          onNew={handleNewDocumentWithPreviewPreload}
          onOpen={handleOpenFileWithPreviewPreload}
          onOpenRecent={handleOpenRecentFileWithPreviewPreload}
          onClearRecent={handleClearRecentFiles}
          t={t}
        />
      ) : <>
        {externalFileState ? <ExternalFileBanner
          state={externalFileState}
          labels={{ conflict: t.externalFileConflict, missing: t.externalFileMissing, keepEdits: t.keepMyEdits, reload: t.reloadDiskVersion, retry: t.retryFile, saveAs: t.saveAs }}
          onKeepEdits={handleKeepLocalEdits}
          onReload={() => {
            if (window.confirm(t.reloadDiskVersion)) handleReloadDiskVersion()
          }}
          onRetry={() => void retryExternalFile()}
          onSaveAs={() => void handleSaveFileAs()}
        /> : null}
        <section className={workspaceClasses} aria-label={t.workspace}>
        <DocumentSearchBar
          activeIndex={documentSearch.activeIndex}
          inputRef={documentSearch.inputRef}
          isOpen={documentSearch.isOpen}
          isReplaceOpen={documentSearch.isReplaceOpen}
          isSourceSearch={documentSearch.isSourceSearch}
          labels={{
            close: t.closeFind,
            find: t.find,
            matchCount: t.findMatchCount,
            next: t.findNext,
            previous: t.findPrevious,
            replace: t.replaceCurrent,
            replaceAll: t.replaceAll,
            replaceCurrent: t.replaceCurrent,
            replacement: t.replacement,
            toggleReplace: t.toggleReplace,
          }}
          matchCount={documentSearch.matchCount}
          onClose={documentSearch.close}
          onMove={documentSearch.move}
          onQueryChange={documentSearch.setQuery}
          onReplaceAll={documentSearch.replaceAll}
          onReplaceCurrent={documentSearch.replaceCurrent}
          onReplacementChange={documentSearch.setReplacement}
          onToggleReplace={() => documentSearch.setIsReplaceOpen((current) => !current)}
          query={documentSearch.query}
          replacement={documentSearch.replacement}
        />
        {isOutlineVisible ? (
          <aside
            className="outline-panel"
            aria-label={t.outlinePanel}
            style={{ width: `${outlineWidth}px` }}
          >
            <DocumentOutline
              items={outlineItems}
              activeId={activeOutlineId}
              maxDepth={outlineDepth}
              onJump={handleOutlineJump}
              onMaxDepthChange={setOutlineDepth}
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
            ref={editorRef}
            value={markdownDocument.content}
            onChange={handleContentChange}
            onImportImages={(files, selection) => void importImages(files, selection)}
            onSelectionChange={setEditorSelection}
            label={t.markdownSource}
            t={t}
            showToolbar={viewMode !== 'preview'}
            toolbarEnd={viewMode === 'split' ? (
              <SplitScrollControl
                disableLabel={t.disableSplitScrollSync}
                enableLabel={t.enableSplitScrollSync}
                enabled={isSplitScrollSyncEnabled}
                onToggle={handleToggleSplitScrollSync}
              />
            ) : undefined}
          />
          {viewMode !== 'preview' ? <EditorStatusBar
            cursorPosition={cursorPosition}
            isDirty={markdownDocument.isDirty}
            isSaving={isSaving}
            labels={{
              characterCount: t.characterCount,
              cursorPosition: t.cursorPosition,
              readingTime: t.readingTime,
              saved: t.saved,
              saving: t.saving,
              unsaved: t.unsaved,
              wordCount: t.wordCount,
            }}
            statistics={documentStatistics}
          /> : null}
        </section>
        <section
          className="preview-panel"
          aria-label={t.previewPanel}
          ref={previewPanelRef}
          style={previewPanelStyle}
        >
          <Suspense fallback={<PreviewLoading label={t.previewLoading} />}>
            <LazyMarkdownPreview
              content={previewContent}
              theme={effectiveTheme}
              previewRef={previewRef}
              sourcePath={markdownDocument.path}
              readLocalImageFile={fileAccess.readLocalImageFile}
              onOpenMarkdownLink={handleOpenMarkdownLink}
              labels={t.previewLabels}
              searchQuery={viewMode === 'preview' ? documentSearch.query : ''}
              activeSearchIndex={documentSearch.activeIndex}
              onSearchMatchCountChange={documentSearch.setPreviewMatchCount}
            />
          </Suspense>
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
      </section>
      </>}
      {shortcutToast?.placement === 'app' ? (
        <div className="shortcut-toast" role="status" aria-label={t.shortcutNotification}>
          {shortcutToast.message}
        </div>
      ) : null}
      {!isWelcomeVisible && operationStatus ? (
        <div className="app-operation-status" role="status">{operationStatus}</div>
      ) : null}
      <DraftRecoveryDialog
        draft={pendingDraft}
        onDiscard={discardPendingDraft}
        onRestore={() => void restorePendingDraft()}
        t={t}
      />
      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} t={t} />
      <ReadingSettingsDialog
        open={isReadingSettingsOpen}
        preferences={readingPreferences}
        onClose={() => setIsReadingSettingsOpen(false)}
        onReset={resetReadingPreferences}
        onUpdate={updateReadingPreferences}
        t={t}
      />
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

function PreviewLoading({ label }: { label: string }) {
  return <div className="preview-loading" role="status">{label}</div>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : translations.en.fileOperationFailed
}

export default App
