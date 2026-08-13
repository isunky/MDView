import { ChevronDown, Download, Eye, FolderOpen, FolderSearch, PencilLine, Settings, SplitSquareHorizontal } from 'lucide-react'
import type { RefObject } from 'react'
import type { RecentFile } from '../domain/recentFiles'
import type { AppMenuId } from '../hooks/useAppMenu'
import type { AppLanguage, Translation } from '../i18n'
import type { AppUpdatePhase } from '../hooks/useAppUpdater'
import { AppLogo } from './AppLogo'

type ViewMode = 'preview' | 'edit' | 'split'

export function AppToolbar({
  activeMenu, canRevealFiles, documentPath, documentTitle, isSaving, isWelcomeVisible,
  language, menuBarRef, nativeFileTitle, recentFiles, supportsAppUpdates, t, updatePhase,
  updateActionTitle, viewMode, newTitle, openTitle, saveTitle, saveAsTitle,
  onAbout, onCheckUpdates, onClearRecent, onExportDocx, onExportHtml, onExportPdf, onImportDocx,
  onLanguage, onNew, onOpen, onOpenRecent, onOpenReadingSettings, onReveal,
  onSave, onSaveAs, onToggleMenu, onViewMode,
}: {
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
}) {
  const nativeFilesEnabled = nativeFileTitle === undefined
  return <header className="topbar">
    <div className="brand-block">
      <div className="app-mark" aria-hidden="true"><AppLogo /></div>
      <div><h1>MDView</h1><p title={isWelcomeVisible ? t.welcomeBrand : documentPath ?? documentTitle}>{isWelcomeVisible ? t.welcomeBrand : documentTitle}</p></div>
    </div>
    <nav className="toolbar" aria-label={t.documentActions} ref={menuBarRef}>
      <div className="action-menu">
        <button type="button" onClick={() => onToggleMenu('file')} aria-haspopup="menu" aria-expanded={activeMenu === 'file'}>
          <FolderOpen aria-hidden="true" /><span>{t.fileMenu}</span><ChevronDown aria-hidden="true" />
        </button>
        {activeMenu === 'file' ? <div className="action-menu-panel" role="menu">
          <button type="button" className="action-menu-item" onClick={onNew} title={newTitle} role="menuitem">{t.createNew}</button>
          <button type="button" className="action-menu-item" onClick={onOpen} disabled={!nativeFilesEnabled} title={nativeFileTitle ?? openTitle} role="menuitem">{t.openMarkdownFile}</button>
          {onImportDocx ? <button type="button" className="action-menu-item" onClick={onImportDocx} disabled={!nativeFilesEnabled} title={nativeFileTitle} role="menuitem">{t.importDocx}</button> : null}
          <button type="button" className="action-menu-item" onClick={onSave} disabled={isWelcomeVisible || !nativeFilesEnabled || isSaving} title={nativeFileTitle ?? saveTitle} role="menuitem">{t.save}</button>
          <button type="button" className="action-menu-item" onClick={onSaveAs} disabled={isWelcomeVisible || !nativeFilesEnabled || isSaving} title={nativeFileTitle ?? saveAsTitle} role="menuitem">{t.saveAs}</button>
          <div className="action-menu-divider" /><div className="action-menu-section-label">{t.recentFiles}</div>
          {recentFiles.length > 0 ? recentFiles.map((file) => <div className="recent-file-menu-row" key={file.path}>
            <button type="button" className="action-menu-item recent-file-item" onClick={() => onOpenRecent(file.path)} disabled={!nativeFilesEnabled} title={file.path} role="menuitem"><span className="recent-file-title">{file.title}</span></button>
            {canRevealFiles ? <button type="button" className="recent-file-reveal" onClick={() => onReveal(file.path)} title={t.reveal} aria-label={t.revealInFolder(file.title)} role="menuitem"><FolderSearch aria-hidden="true" /></button> : null}
          </div>) : <div className="action-menu-empty">{t.noRecentFiles}</div>}
          <button type="button" className="action-menu-item action-menu-clear" onClick={onClearRecent} disabled={recentFiles.length === 0} role="menuitem">{t.clearRecentFiles}</button>
        </div> : null}
      </div>
      {!isWelcomeVisible ? <div className="action-menu">
        <button type="button" onClick={() => onToggleMenu('export')} aria-haspopup="menu" aria-expanded={activeMenu === 'export'} disabled={!nativeFilesEnabled} title={nativeFileTitle}><Download aria-hidden="true" /><span>{t.exportMenu}</span><ChevronDown aria-hidden="true" /></button>
        {activeMenu === 'export' && nativeFilesEnabled ? <div className="action-menu-panel action-menu-panel-compact" role="menu">
          <button type="button" className="action-menu-item" onClick={onExportHtml} role="menuitem">{t.exportAsHtml}</button>
          <button type="button" className="action-menu-item" onClick={onExportPdf} role="menuitem">{t.exportAsPdf}</button>
          <button type="button" className="action-menu-item" onClick={onExportDocx} role="menuitem">{t.exportAsDocx}</button>
        </div> : null}
      </div> : null}
      <div className="action-menu">
        <button type="button" onClick={() => onToggleMenu('app')} aria-haspopup="menu" aria-expanded={activeMenu === 'app'}><Settings aria-hidden="true" /><span>{t.appMenu}</span><ChevronDown aria-hidden="true" /></button>
        {activeMenu === 'app' ? <div className="action-menu-panel action-menu-panel-compact" role="menu">
          <div className="action-menu-section-label">{t.languageLabel}</div>
          <button type="button" className={`action-menu-item ${language === 'en' ? 'active' : ''}`} onClick={() => onLanguage('en')} role="menuitem">{t.languageEnglish}</button>
          <button type="button" className={`action-menu-item ${language === 'zh' ? 'active' : ''}`} onClick={() => onLanguage('zh')} role="menuitem">{t.languageChinese}</button>
          <div className="action-menu-divider" />
          <button type="button" className="action-menu-item" onClick={onOpenReadingSettings} role="menuitem">{t.readingSettings}</button>
          {supportsAppUpdates ? <button type="button" className="action-menu-item" onClick={onCheckUpdates} disabled={updateActionTitle !== undefined || updatePhase === 'checking'} title={updateActionTitle} role="menuitem">{updatePhase === 'checking' ? t.updateChecking : t.checkForUpdates}</button> : null}
          <button type="button" className="action-menu-item" onClick={onAbout} role="menuitem">{t.about}</button>
        </div> : null}
      </div>
    </nav>
    {!isWelcomeVisible ? <div className="view-controls" role="group" aria-label={t.viewMode}>
      <button type="button" className={viewMode === 'preview' ? 'active' : ''} onClick={() => onViewMode('preview')} aria-label={t.previewLabel}><Eye aria-hidden="true" /><span>{t.preview}</span></button>
      <button type="button" className={viewMode === 'edit' ? 'active' : ''} onClick={() => onViewMode('edit')} aria-label={t.editLabel}><PencilLine aria-hidden="true" /><span>{t.edit}</span></button>
      <button type="button" className={viewMode === 'split' ? 'active' : ''} onClick={() => onViewMode('split')} aria-label={t.splitLabel}><SplitSquareHorizontal aria-hidden="true" /><span>{t.split}</span></button>
    </div> : null}
  </header>
}
