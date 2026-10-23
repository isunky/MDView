import { BookOpen, Check, ChevronDown, Download, Eye, FileInput, FilePlus2, FolderOpen, FolderSearch, EyeOff, X, PencilLine, Save, Search, Settings, SlidersHorizontal, SplitSquareHorizontal } from 'lucide-react'
import type { KeyboardEvent, MouseEvent, RefObject } from 'react'
import type { RecentFile } from '../../domain/recentFiles'
import type { AppMenuId } from '../../hooks/useAppMenu'
import { supportedLanguages, type AppLanguage, type Translation } from '../../i18n'
import type { AppUpdatePhase } from '../../hooks/useAppUpdater'
import type { AppWindowFrame } from '../../platform/windowFrame'
import { AppLogo } from './AppLogo'
import { WindowControls } from './WindowControls'
import { formatShortcut } from '../../platform/keyboardShortcuts'

type ViewMode = 'preview' | 'edit' | 'split'

export function AppToolbar({
  isExporting = false, saveStateLabel, hasUnsavedChanges, failedRecentPaths = [], recentFilesHidden = false, onToggleRecentVisibility, onRemoveRecent, onLocateRecent,
  activeMenu, canRevealFiles, documentPath, documentTitle, isSaving, isWelcomeVisible,
  language, menuBarRef, nativeFileTitle, recentFiles, supportsAppUpdates, t, updatePhase,
  updateActionTitle, viewMode, newTitle, openTitle, saveTitle, saveAsTitle,
  windowFrame,
  onAbout, onCheckUpdates, onClearRecent, onExportDocx, onExportHtml, onExportPdf, onImportDocx,
  onLanguage, onNew, onOpen, onOpenRecent, onOpenReadingSettings, onReveal,
  onSave, onSaveAs, onToggleMenu, onViewMode, onMenuKeyDown, onFind, findTitle, isFindOpen,
}: {
  isExporting?: boolean
  saveStateLabel?: string
  hasUnsavedChanges?: boolean
  failedRecentPaths?: string[]
  recentFilesHidden?: boolean
  onToggleRecentVisibility?: () => void
  onLocateRecent?: (path: string) => void
  onRemoveRecent?: (path: string) => void
  activeMenu: AppMenuId | null
  canRevealFiles: boolean
  documentPath: string | null
  documentTitle: string
  isSaving: boolean
  isWelcomeVisible: boolean
  language: AppLanguage
  menuBarRef: RefObject<HTMLElement | null>
  nativeFileTitle?: string
  recentFiles: RecentFile[]
  supportsAppUpdates: boolean
  t: Translation
  updatePhase: AppUpdatePhase
  updateActionTitle?: string
  viewMode: ViewMode
  windowFrame: AppWindowFrame
  newTitle: string
  openTitle: string
  saveTitle: string
  saveAsTitle: string
  onAbout: () => void
  onCheckUpdates: () => void
  onClearRecent: () => void
  onExportDocx: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onImportDocx?: () => void
  onLanguage: (language: AppLanguage) => void
  onNew: () => void
  onOpen: () => void
  onOpenRecent: (path: string) => void
  onOpenReadingSettings: () => void
  onReveal: (path: string) => void
  onSave: () => void
  onSaveAs: () => void
  onToggleMenu: (menu: AppMenuId) => void
  onViewMode: (mode: ViewMode) => void
  onMenuKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  onFind?: () => void
  findTitle?: string
  isFindOpen?: boolean
}) {
  const nativeFilesEnabled = nativeFileTitle === undefined
  const exportOptions = [
    { format: 'HTML', label: t.exportAsHtml, hint: t.exportHtmlSummary, description: t.exportHtmlHint, onClick: onExportHtml },
    { format: 'PDF', label: t.exportAsPdf, hint: t.exportPdfSummary, description: t.exportPdfHint, onClick: onExportPdf },
    { format: 'Word', label: t.exportAsDocx, hint: t.exportWordSummary, description: t.exportWordHint, onClick: onExportDocx },
  ]
  const handleTitlebarMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (windowFrame.kind === 'native' || event.button !== 0) return
    if ((event.target as HTMLElement).closest(
      '[data-window-interactive="true"], button, a, input, select, textarea, [role="menu"]',
    )) return

    const action = event.detail === 2
      ? windowFrame.toggleMaximize
      : windowFrame.startDragging
    void action().catch(() => undefined)
  }

  return <header
    className={`topbar window-frame-${windowFrame.kind}`}
    onMouseDown={handleTitlebarMouseDown}
  >
    <div className="brand-block">
      <div className="app-mark" aria-hidden="true"><AppLogo /></div>
      <div className="brand-text"><h1>MDView</h1><p title={isWelcomeVisible ? t.welcomeBrand : documentPath ?? documentTitle}><span>{isWelcomeVisible ? t.welcomeBrand : documentTitle}</span>{!isWelcomeVisible && saveStateLabel ? <span className={`document-save-badge${hasUnsavedChanges ? ' dirty' : ''}${viewMode !== 'preview' ? ' compact' : ''}`} role="status" aria-label={saveStateLabel} title={saveStateLabel}><span className="save-state-dot" aria-hidden="true" />{viewMode === 'preview' ? saveStateLabel : null}</span> : null}</p></div>
    </div>
    <nav className="toolbar" aria-label={t.documentActions} ref={menuBarRef} onKeyDown={onMenuKeyDown}>
      <div className="action-menu">
        <button type="button" id="file-menu-trigger" data-menu-trigger="file" onClick={() => onToggleMenu('file')} aria-label={t.fileMenu} title={t.fileMenu} aria-haspopup="menu" aria-controls="file-menu-panel" aria-expanded={activeMenu === 'file'}>
          <FolderOpen aria-hidden="true" /><span>{t.fileMenu}</span><ChevronDown aria-hidden="true" />
        </button>
        {activeMenu === 'file' ? <div className="action-menu-panel" id="file-menu-panel" role="menu" aria-labelledby="file-menu-trigger">
          <button type="button" className="action-menu-item" aria-label={t.createNew} onClick={onNew} title={newTitle} role="menuitem"><FilePlus2 aria-hidden="true" /><span>{t.createNew}</span><kbd aria-hidden="true">{formatShortcut({ key: 'n' })}</kbd></button>
          <button type="button" className="action-menu-item" aria-label={t.openMarkdownFile} onClick={onOpen} disabled={!nativeFilesEnabled} title={nativeFileTitle ?? openTitle} role="menuitem"><FolderOpen aria-hidden="true" /><span>{t.openMarkdownFile}</span><kbd aria-hidden="true">{formatShortcut({ key: 'o' })}</kbd></button>
          {onImportDocx ? <button type="button" className="action-menu-item" onClick={onImportDocx} disabled={!nativeFilesEnabled} title={nativeFileTitle} role="menuitem"><FileInput aria-hidden="true" />{t.importDocx}</button> : null}
          <button type="button" className="action-menu-item" aria-label={t.save} onClick={onSave} disabled={isWelcomeVisible || !nativeFilesEnabled || isSaving} title={nativeFileTitle ?? saveTitle} role="menuitem"><Save aria-hidden="true" /><span>{t.save}</span><kbd aria-hidden="true">{formatShortcut({ key: 's' })}</kbd></button>
          <button type="button" className="action-menu-item" aria-label={t.saveAs} onClick={onSaveAs} disabled={isWelcomeVisible || !nativeFilesEnabled || isSaving} title={nativeFileTitle ?? saveAsTitle} role="menuitem"><Save aria-hidden="true" /><span>{t.saveAs}</span><kbd aria-hidden="true">{formatShortcut({ key: 's', shiftKey: true })}</kbd></button>
          {!isWelcomeVisible ? <>
            <div className="action-menu-divider" />
            <div className="menu-export-heading"><Download aria-hidden="true" /><span>{t.exportMenu}</span>{isExporting ? <small role="status">{t.exportBusy}</small> : null}</div>
            <div className="menu-export-formats" role="group" aria-label={t.exportMenu} aria-busy={isExporting}>
              {exportOptions.map(option => <button
                key={option.format} type="button" className="action-menu-item export-format-option" role="menuitem"
                aria-label={option.label} aria-description={option.description} title={nativeFileTitle ?? option.description}
                disabled={!nativeFilesEnabled || isExporting} onClick={() => {
                  menuBarRef.current?.querySelector<HTMLButtonElement>('[data-menu-trigger="file"]')?.focus()
                  option.onClick()
                }}
              ><span>{option.format}</span><small>{option.hint}</small></button>)}
            </div>
          </> : null}
          <div className="action-menu-divider" /><div className="action-menu-section-label">{t.recentFiles}</div>
          {recentFiles.length > 0 && onToggleRecentVisibility ? <button type="button" className="action-menu-item" role="menuitem" onClick={onToggleRecentVisibility}>{recentFilesHidden ? <Eye /> : <EyeOff />}{recentFilesHidden ? t.showRecentFiles : t.hideRecentFiles}</button> : null}
          {recentFilesHidden ? <div className="action-menu-empty">{t.recentFilesHidden}</div> : recentFiles.length > 0 ? recentFiles.map((file) => <div className="recent-file-menu-row" key={file.path}>
            <button type="button" className="action-menu-item recent-file-item" aria-label={file.title} aria-description={failedRecentPaths.includes(file.path) ? t.recentFileUnavailable : undefined} onClick={() => onOpenRecent(file.path)} disabled={!nativeFilesEnabled} title={file.path} role="menuitem"><span className="recent-file-title">{file.title}{failedRecentPaths.includes(file.path) ? <small className="recent-file-warning">{t.recentFileUnavailable}</small> : null}</span></button>
            {canRevealFiles ? <button type="button" className="recent-file-reveal" onClick={() => failedRecentPaths.includes(file.path) && onLocateRecent ? onLocateRecent(file.path) : onReveal(file.path)} title={failedRecentPaths.includes(file.path) ? t.locateRecentFile(file.title) : t.reveal} aria-label={failedRecentPaths.includes(file.path) ? t.locateRecentFile(file.title) : t.revealInFolder(file.title)} role="menuitem"><FolderSearch aria-hidden="true" /></button> : null}
            {onRemoveRecent ? <button type="button" className="recent-file-remove" onClick={() => onRemoveRecent(file.path)} aria-label={t.removeRecentFile(file.title)} title={t.removeRecentFile(file.title)} role="menuitem"><X aria-hidden="true" /></button> : null}
          </div>) : <div className="action-menu-empty">{t.noRecentFiles}</div>}
          <button type="button" className="action-menu-item action-menu-clear" onClick={onClearRecent} disabled={recentFiles.length === 0} role="menuitem">{t.clearRecentFiles}</button>
        </div> : null}
      </div>
      <div className="action-menu">
        <button type="button" id="reading-menu-trigger" data-menu-trigger="reading" onClick={() => onToggleMenu('reading')} aria-label={t.readingMenu} title={t.readingMenu} aria-haspopup="menu" aria-controls="reading-menu-panel" aria-expanded={activeMenu === 'reading'}><BookOpen aria-hidden="true" /><span>{t.readingMenu}</span><ChevronDown aria-hidden="true" /></button>
        {activeMenu === 'reading' ? <div className="action-menu-panel action-menu-panel-compact" id="reading-menu-panel" role="menu" aria-labelledby="reading-menu-trigger">
          {onFind ? <button type="button" className={`action-menu-item${isFindOpen ? ' active' : ''}`} role="menuitem" onClick={onFind} disabled={isWelcomeVisible} aria-label={t.find} aria-expanded={isFindOpen} aria-controls="document-search-panel" title={findTitle ?? t.find}><Search aria-hidden="true" /><span>{t.find}</span><kbd aria-hidden="true">{formatShortcut({ key: 'f' })}</kbd></button> : null}
          <button type="button" className="action-menu-item" role="menuitem" onClick={onOpenReadingSettings} aria-haspopup="dialog"><SlidersHorizontal aria-hidden="true" /><span>{t.readingSettings}</span></button>
        </div> : null}
      </div>
      <div className="action-menu">
        <button type="button" id="app-menu-trigger" data-menu-trigger="app" onClick={() => onToggleMenu('app')} aria-label={t.appMenu} title={t.appMenu} aria-haspopup="menu" aria-controls="app-menu-panel" aria-expanded={activeMenu === 'app'}><Settings aria-hidden="true" /><span>{t.appMenu}</span><ChevronDown aria-hidden="true" /></button>
        {activeMenu === 'app' ? <div className="action-menu-panel action-menu-panel-compact" id="app-menu-panel" role="menu" aria-labelledby="app-menu-trigger">
          <div className="action-menu-section-label">{t.languageLabel}</div>
          {supportedLanguages.map((option) => <button key={option.id} type="button" lang={option.locale} className={`action-menu-item ${language === option.id ? 'active' : ''}`} onClick={() => onLanguage(option.id)} role="menuitem" aria-current={language === option.id ? 'true' : undefined}><span>{option.name}</span>{language === option.id ? <Check className="menu-selection-check" aria-hidden="true" /> : null}</button>)}
          <div className="action-menu-divider" />
          {supportsAppUpdates ? <button type="button" className="action-menu-item" onClick={onCheckUpdates} disabled={updateActionTitle !== undefined || updatePhase === 'checking'} title={updateActionTitle} role="menuitem">{updatePhase === 'checking' ? t.updateChecking : t.checkForUpdates}</button> : null}
          <button type="button" className="action-menu-item" onClick={onAbout} role="menuitem">{t.about}</button>
        </div> : null}
      </div>
    </nav>
    {!isWelcomeVisible ? <div className="view-controls" role="group" aria-label={t.viewMode} data-window-interactive="true">
      <button type="button" className={viewMode === 'preview' ? 'active' : ''} onClick={() => onViewMode('preview')} aria-pressed={viewMode === 'preview'} aria-label={t.previewLabel} title={t.previewLabel}><Eye aria-hidden="true" /><span>{t.preview}</span></button>
      <button type="button" className={viewMode === 'edit' ? 'active' : ''} onClick={() => onViewMode('edit')} aria-pressed={viewMode === 'edit'} aria-label={t.editLabel} title={t.editLabel}><PencilLine aria-hidden="true" /><span>{t.edit}</span></button>
      <button type="button" className={viewMode === 'split' ? 'active' : ''} onClick={() => onViewMode('split')} aria-pressed={viewMode === 'split'} aria-label={t.splitLabel} title={t.splitLabel}><SplitSquareHorizontal aria-hidden="true" /><span>{t.split}</span></button>
    </div> : null}
    {windowFrame.kind === 'windows-custom' ? <WindowControls
      frame={windowFrame}
      labels={{
        close: t.windowClose,
        maximize: t.windowMaximize,
        minimize: t.windowMinimize,
        restore: t.windowRestore,
      }}
    /> : null}
  </header>
}
