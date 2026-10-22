import {
  Eye, EyeOff, X, FolderSearch,
  ChevronRight,
  FilePlus2,
  FileText,
  FolderOpen,
  FileInput,
  Trash2,
} from 'lucide-react'
import type { RecentFile } from '../../domain/recentFiles'
import type { Translation } from '../../i18n'
import { AppLogo } from '../shell/AppLogo'

type WelcomeWorkspaceProps = {
  failedRecentPaths?: string[]
  recentFilesHidden?: boolean
  onToggleRecentVisibility?: () => void
  onRemoveRecent?: (path: string) => void
  onLocateRecent?: (path: string) => void
  onReveal?: (path: string) => void
  recentFiles: RecentFile[]
  canOpenFiles: boolean
  statusMessage: string | null
  onNew: () => void | Promise<void>
  onOpen: () => void | Promise<void>
  onImportDocx?: () => void | Promise<void>
  onOpenRecent: (path: string) => void | Promise<void>
  onClearRecent: () => void
  t: Translation
}

export function WelcomeWorkspace({
  failedRecentPaths = [], recentFilesHidden = false, onToggleRecentVisibility, onRemoveRecent, onReveal, onLocateRecent,
  recentFiles,
  canOpenFiles,
  statusMessage,
  onNew,
  onOpen,
  onImportDocx,
  onOpenRecent,
  onClearRecent,
  t,
}: WelcomeWorkspaceProps) {
  return (
    <section className="welcome-workspace" aria-labelledby="welcome-title">
      <div className="welcome-content">
        <header className="welcome-intro">
          <div className="welcome-logo" aria-hidden="true">
            <AppLogo />
          </div>
          <div>
            <h2 id="welcome-title">{t.welcomeTitle}</h2>
            <p>{t.welcomeDescription}</p>
          </div>
        </header>

        <div className="welcome-actions">
          <button
            type="button"
            className="welcome-action primary"
            onClick={() => void onOpen()}
            disabled={!canOpenFiles}
            title={canOpenFiles ? t.openLabel : t.nativeFileUnavailable}
          >
            <FolderOpen aria-hidden="true" />
            <span>{t.openMarkdownFile}</span>
          </button>
          <button
            type="button"
            className="welcome-action"
            onClick={() => void onNew()}
            aria-label={t.createNewLabel}
          >
            <FilePlus2 aria-hidden="true" />
            <span>{t.createNew}</span>
          </button>
          {onImportDocx ? <button
            type="button"
            className="welcome-action"
            onClick={() => void onImportDocx()}
          >
            <FileInput aria-hidden="true" />
            <span>{t.importDocx}</span>
          </button> : null}
        </div>

        {statusMessage ? (
          <div className="welcome-status" role="alert">
            {statusMessage}
          </div>
        ) : null}

        <section className="welcome-recent" aria-labelledby="welcome-recent-title">
          <div className="welcome-recent-header">
            <h3 id="welcome-recent-title">{t.recentFiles}</h3>
            {recentFiles.length > 0 && onToggleRecentVisibility ? <button type="button" className="welcome-clear" onClick={onToggleRecentVisibility}
              aria-label={recentFilesHidden ? t.showRecentFiles : t.hideRecentFiles} title={recentFilesHidden ? t.showRecentFiles : t.hideRecentFiles}>
              {recentFilesHidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </button> : null}
            {recentFiles.length > 0 ? (
              <button
                type="button"
                className="welcome-clear"
                onClick={onClearRecent}
                aria-label={t.clearRecentFiles}
                title={t.clearRecentFiles}
              >
                <Trash2 aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {recentFilesHidden ? <p className="welcome-empty">{t.recentFilesHidden}</p> : recentFiles.length > 0 ? (
            <ol className="welcome-recent-list">
              {recentFiles.map((file) => (
                <li key={file.path} className="welcome-recent-row">
                  <button
                    type="button"
                    className="welcome-recent-item"
                    onClick={() => void onOpenRecent(file.path)}
                    disabled={!canOpenFiles}
                    aria-label={t.openRecentFile(file.title)}
                    title={file.path}
                  >
                    <FileText aria-hidden="true" />
                    <span className="welcome-recent-meta">
                      <strong>{file.title}</strong>
                      <span>{getParentPath(file.path)}</span>
                      {failedRecentPaths.includes(file.path) ? <small className="recent-file-warning">{t.recentFileUnavailable}</small> : null}
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                  {onReveal ? <button type="button" className="welcome-clear" onClick={() => failedRecentPaths.includes(file.path) && onLocateRecent ? onLocateRecent(file.path) : onReveal(file.path)} aria-label={failedRecentPaths.includes(file.path) ? t.locateRecentFile(file.title) : t.revealInFolder(file.title)} title={failedRecentPaths.includes(file.path) ? t.locateRecentFile(file.title) : t.reveal}><FolderSearch aria-hidden="true" /></button> : null}
                  {onRemoveRecent ? <button type="button" className="welcome-clear" onClick={() => onRemoveRecent(file.path)} aria-label={t.removeRecentFile(file.title)} title={t.removeRecentFile(file.title)}><X aria-hidden="true" /></button> : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="welcome-empty">
              <FileText aria-hidden="true" />
              <strong>{t.noRecentFiles}</strong>
              <span>{t.welcomeEmptyHint}</span>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function getParentPath(path: string): string {
  const separatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return separatorIndex > 0 ? path.slice(0, separatorIndex) : path
}
