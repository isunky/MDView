import {
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { PanelLeftOpen } from 'lucide-react'
import './App.css'
import { SplitScrollControl } from './components/SplitScrollControl'
import { Toast } from './components/Toast'
import { AppDialogs } from './components/AppDialogs'
import { AppToolbar } from './components/AppToolbar'
import { DocumentOutline } from './components/DocumentOutline'
import { DocumentSearchBar } from './components/DocumentSearchBar'
import { ExternalFileBanner } from './components/ExternalFileBanner'
import { ImageImportNotice } from './components/ImageImportNotice'
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
import { useDocumentExport } from './hooks/useDocumentExport'
import type { FileAccess } from './platform/fileAccess'
import type { DocxImportStatus } from './platform/fileAccess'
import { openExternalLink } from './platform/externalLinks'
import type { AppUpdateClient } from './platform/appUpdates'
import { unsupportedAppUpdateClient } from './platform/unsupportedAppUpdates'
import {
  withShortcutTitle,
} from './platform/keyboardShortcuts'
import { useFileShortcuts } from './hooks/useFileShortcuts'
import { getCursorPosition, getDocumentStatistics } from './domain/documentStatistics'
import type { ReadingViewMode } from './domain/readingSessions'
import { nativeWindowFrame, type AppWindowFrame } from './platform/windowFrame'

type ViewMode = ReadingViewMode

type AppProps = {
  appUpdateClient?: AppUpdateClient
  fileAccess: FileAccess
  initialLanguage?: AppLanguage
  supportsAppUpdates?: boolean
  windowFrame?: AppWindowFrame
}

function App({
  appUpdateClient = unsupportedAppUpdateClient,
  fileAccess,
  initialLanguage,
  supportsAppUpdates = true,
  windowFrame = nativeWindowFrame,
}: AppProps) {
  const [language, setLanguage] = useState<AppLanguage>(() => initialLanguage ?? detectSystemLanguage())
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isReadingSettingsOpen, setIsReadingSettingsOpen] = useState(false)
  const [isDocxImportOpen, setIsDocxImportOpen] = useState(false)
  const [docxImportPhase, setDocxImportPhase] = useState<'checking' | 'idle' | 'installing' | 'converting'>('idle')
  const [docxImportStatus, setDocxImportStatus] = useState<DocxImportStatus | null>(null)
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
    toast,
  } = useTransientToast()
  const {
    handleClearRecentFiles,
    handleContentChange,
    canDiscardUnsavedChanges,
    handleKeepLocalEdits,
    handleNewDocument,
    handleImportedDocument,
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
    documentSessionId,
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
  const closeDocxImport = useCallback(() => {
    if (docxImportPhase === 'installing' || docxImportPhase === 'converting') {
      void fileAccess.docxImport?.cancel()
    }
    setDocxImportPhase('idle')
    setIsDocxImportOpen(false)
  }, [docxImportPhase, fileAccess.docxImport])
  const checkDocxImport = useCallback(async () => {
    const importer = fileAccess.docxImport
    if (!importer) return
    setDocxImportPhase('checking')
    try {
      setDocxImportStatus(await importer.getStatus())
    } catch (error) {
      setDocxImportStatus({ state: 'componentsBroken', canInstallPython: false, message: getErrorMessage(error) })
    } finally {
      setDocxImportPhase('idle')
    }
  }, [fileAccess.docxImport])
  const openDocxImport = useCallback(() => {
    if (!fileAccess.docxImport) return
    closeMenu()
    setIsDocxImportOpen(true)
    if (!docxImportStatus) void checkDocxImport()
  }, [checkDocxImport, closeMenu, docxImportStatus, fileAccess.docxImport])
  const installDocxImport = useCallback(async () => {
    const importer = fileAccess.docxImport
    if (!importer) return
    setDocxImportPhase('installing')
    try {
      setDocxImportStatus(await importer.install())
    } catch (error) {
      setDocxImportStatus({ state: 'componentsBroken', canInstallPython: false, message: getErrorMessage(error) })
    } finally {
      setDocxImportPhase('idle')
    }
  }, [fileAccess.docxImport])
  const selectDocxPython = useCallback(async () => {
    const importer = fileAccess.docxImport
    if (!importer) return
    setDocxImportPhase('checking')
    try {
      setDocxImportStatus(await importer.selectPython())
    } catch (error) {
      setDocxImportStatus({ state: 'pythonUnsupported', canInstallPython: true, message: getErrorMessage(error) })
    } finally {
      setDocxImportPhase('idle')
    }
  }, [fileAccess.docxImport])
  const convertDocx = useCallback(async () => {
    const importer = fileAccess.docxImport
    if (!importer || !canDiscardUnsavedChanges()) return
    setDocxImportPhase('converting')
    try {
      const imported = await importer.importFile()
      if (imported) {
        handleImportedDocument(imported.content, imported.suggestedFilename)
        setIsDocxImportOpen(false)
        setStatusMessage(t.docxImportSuccess)
      }
    } catch (error) {
      setDocxImportStatus({ state: 'componentsBroken', canInstallPython: false, message: getErrorMessage(error) })
    } finally {
      setDocxImportPhase('idle')
    }
  }, [canDiscardUnsavedChanges, fileAccess.docxImport, handleImportedDocument, setStatusMessage, t.docxImportSuccess])
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
  const {
    dismissFailedImages,
    failedFiles: failedImageImports,
    importImages,
    isImportingImages,
    progress: imageImportProgress,
    retryFailedImages,
  } = useImageInsertion({
    content: markdownDocument.content,
    contextKey: documentSessionId,
    documentPath: markdownDocument.path,
    ensureDocumentPath,
    fileAccess,
    messages: {
      failed: t.imageImportFailed,
      invalid: t.imageImportInvalid,
      partial: t.imageImportPartial,
      success: t.imageImportSuccess,
      unsupported: t.imageImportUnsupported,
    },
    onContentTransform: transformDocumentContent,
    onNotify: showAppToast,
  })

  const { exportDocx: handleExportDocx, exportHtml: handleExportHtml, exportPdf: handleExportPdf } = useDocumentExport({
    closeMenu,
    document: markdownDocument,
    fileAccess,
    language,
    previewRef,
    setStatusMessage,
    t,
  })

  async function handleRevealRecentFile(path: string) {
    try {
      await fileAccess.revealFileInFolder(path)
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
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
  const visibleOperationStatus = imageImportProgress
    ? t.imageImportProgress(imageImportProgress.completed, imageImportProgress.total)
    : operationStatus

  return (
    <main
      className={`app-shell view-${viewMode} ${isWelcomeVisible ? 'welcome-open' : ''}`}
      data-mdview-color-theme={effectiveTheme}
      lang={language === 'zh' ? 'zh-CN' : 'en'}
    >
      <AppToolbar
        activeMenu={activeMenu}
        canRevealFiles={canRevealFiles}
        documentPath={markdownDocument.path}
        documentTitle={markdownDocument.title}
        isSaving={isSaving}
        isWelcomeVisible={isWelcomeVisible}
        language={language}
        menuBarRef={menuBarRef}
        nativeFileTitle={nativeFileTitle}
        newTitle={newTitle}
        openTitle={openTitle}
        recentFiles={recentFiles}
        saveAsTitle={saveAsTitle}
        saveTitle={saveTitle}
        supportsAppUpdates={supportsAppUpdates}
        t={t}
        updateActionTitle={updateActionTitle}
        updatePhase={updatePhase}
        viewMode={viewMode}
        windowFrame={windowFrame}
        onAbout={handleOpenAboutFromAppMenu}
        onCheckUpdates={() => void handleCheckForUpdates()}
        onClearRecent={handleClearRecentFiles}
        onExportDocx={() => void handleExportDocx()}
        onExportHtml={() => void handleExportHtml()}
        onExportPdf={() => void handleExportPdf()}
        onImportDocx={fileAccess.docxImport ? openDocxImport : undefined}
        onLanguage={handleLanguageSelect}
        onNew={handleNewDocumentWithPreviewPreload}
        onOpen={() => void handleOpenFileWithPreviewPreload()}
        onOpenRecent={(path) => void handleOpenRecentFileWithPreviewPreload(path)}
        onOpenReadingSettings={handleOpenReadingSettings}
        onReveal={(path) => void handleRevealRecentFile(path)}
        onSave={() => void handleSaveFile()}
        onSaveAs={() => void handleSaveFileAs()}
        onToggleMenu={toggleMenu}
        onViewMode={(mode) => {
          if (mode === 'edit') freezePreview()
          if (mode === 'split') prepareSplitPreview()
          setViewMode(mode)
        }}
      />

      {isWelcomeVisible ? (
        <WelcomeWorkspace
          recentFiles={recentFiles}
          canOpenFiles={fileAccess.supportsNativeFiles}
          statusMessage={welcomeStatus}
          onNew={handleNewDocumentWithPreviewPreload}
          onOpen={handleOpenFileWithPreviewPreload}
          onImportDocx={fileAccess.docxImport ? openDocxImport : undefined}
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
            historyKey={documentSessionId}
            onChange={handleContentChange}
            onImportImages={(files, selection) => void importImages(files, selection)}
            supportsImageImport={fileAccess.supportsImageImport}
            isImportingImages={isImportingImages}
            imageImportBusyLabel={imageImportProgress
              ? t.imageImportProgress(imageImportProgress.completed, imageImportProgress.total)
              : t.imageImportPreparing}
            imageDropLabel={t.imageDropLabel}
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
          <ImageImportNotice
            count={failedImageImports.length}
            dismissLabel={t.imageImportDismiss}
            message={t.imageImportRetryNotice}
            onDismiss={dismissFailedImages}
            onRetry={() => void retryFailedImages(editorSelection)}
            retryLabel={t.imageImportRetry}
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
      </section>
      </>}
      {toast ? (
        <Toast
          label={t.toastNotification}
          placement={toast.placement}
          showPreviewLayer={viewMode !== 'edit'}
        >
          {toast.message}
        </Toast>
      ) : null}
      {!isWelcomeVisible && visibleOperationStatus ? (
        <div className="app-operation-status" role="status">{visibleOperationStatus}</div>
      ) : null}
      <AppDialogs
        availableUpdate={availableUpdate}
        distribution={distribution}
        isAboutOpen={isAboutOpen}
        isDocxImportOpen={isDocxImportOpen}
        docxImportPhase={docxImportPhase}
        docxImportStatus={docxImportStatus}
        isReadingSettingsOpen={isReadingSettingsOpen}
        pendingDraft={pendingDraft}
        readingPreferences={readingPreferences}
        t={t}
        updateErrorMessage={updateErrorMessage}
        updatePhase={updatePhase}
        updateProgress={updateProgress}
        onCheckUpdates={() => void handleCheckForUpdates()}
        onCloseAbout={() => setIsAboutOpen(false)}
        onCloseReadingSettings={() => setIsReadingSettingsOpen(false)}
        onDismissUpdate={dismissUpdateDialog}
        onDiscardDraft={discardPendingDraft}
        onInstallUpdate={() => void handleInstallUpdate()}
        onOpenPortableDownload={() => void openPortableDownload()}
        onResetReadingPreferences={resetReadingPreferences}
        onRestoreDraft={() => void restorePendingDraft()}
        onUpdateReadingPreferences={updateReadingPreferences}
        onCloseDocxImport={closeDocxImport}
        onConvertDocx={() => void convertDocx()}
        onInstallDocx={() => void installDocxImport()}
        onRefreshDocxImport={() => void checkDocxImport()}
        onSelectDocxPython={() => void selectDocxPython()}
        onOpenPythonDownload={() => void openExternalLink('https://www.python.org/downloads/')}
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
