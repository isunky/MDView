import {
  ChevronRight,
  FilePlus2,
  FileText,
  FolderOpen,
  Trash2,
} from 'lucide-react'
import type { RecentFile } from '../domain/recentFiles'
import type { Translation } from '../i18n'
import { AppLogo } from './AppLogo'

type WelcomeWorkspaceProps = {
  recentFiles: RecentFile[]
  canOpenFiles: boolean
  statusMessage: string | null
  onNew: () => void | Promise<void>
  onOpen: () => void | Promise<void>
  onOpenRecent: (path: string) => void | Promise<void>
  onClearRecent: () => void
  t: Translation
}

export function WelcomeWorkspace({
  recentFiles,
  canOpenFiles,
  statusMessage,
  onNew,
  onOpen,
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
        </div>

        {statusMessage ? (
          <div className="welcome-status" role="alert">
            {statusMessage}
          </div>
        ) : null}

        <section className="welcome-recent" aria-labelledby="welcome-recent-title">
          <div className="welcome-recent-header">
            <h3 id="welcome-recent-title">{t.recentFiles}</h3>
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

          {recentFiles.length > 0 ? (
            <ol className="welcome-recent-list">
              {recentFiles.map((file) => (
                <li key={file.path}>
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
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </button>
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
