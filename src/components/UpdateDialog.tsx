import { useEffect } from 'react'
import { CircleCheck, Download, ExternalLink, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { appInfo } from '../appInfo'
import type { Translation } from '../i18n'
import type { AppDistribution, AppUpdateCandidate, AppUpdateProgress } from '../platform/appUpdates'
import type { AppUpdatePhase } from '../hooks/useAppUpdater'

type UpdateDialogProps = {
  distribution: AppDistribution
  errorMessage: string | null
  onCheckAgain: () => void
  onClose: () => void
  onInstall: () => void
  onOpenPortableDownload: () => void
  phase: AppUpdatePhase
  progress: AppUpdateProgress | null
  t: Translation
  update: AppUpdateCandidate | null
}

export function UpdateDialog({
  distribution,
  errorMessage,
  onCheckAgain,
  onClose,
  onInstall,
  onOpenPortableDownload,
  phase,
  progress,
  t,
  update,
}: UpdateDialogProps) {
  const isBusy = phase === 'checking' || phase === 'downloading' || phase === 'installing'
  const isInstallInProgress = phase === 'downloading' || phase === 'installing'
  const isOpen = phase !== 'idle'

  useEffect(() => {
    if (!isOpen || isInstallInProgress) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInstallInProgress, isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const percentage = progress?.totalBytes && progress.totalBytes > 0
    ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))
    : null

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (!isInstallInProgress && event.currentTarget === event.target) {
          onClose()
        }
      }}
    >
      <section className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <button
          type="button"
          className="about-close"
          onClick={onClose}
          aria-label={t.closeUpdateDialog}
          disabled={isInstallInProgress}
        >
          <X aria-hidden="true" />
        </button>

        <div className="update-dialog-header">
          <div className="update-dialog-icon" aria-hidden="true">
            {isBusy ? (
              <LoaderCircle className="update-spinner" />
            ) : phase === 'latest' ? (
              <CircleCheck />
            ) : (
              <RefreshCw />
            )}
          </div>
          <div>
            <h2 id="update-title">{t.updateTitle}</h2>
            <p>
              {phase === 'checking'
                ? t.updateChecking
                : phase === 'latest'
                  ? t.updateNoUpdate
                  : t.updateSubtitle}
            </p>
          </div>
        </div>

        {phase === 'checking' ? <p className="update-dialog-message">{t.updateChecking}</p> : null}

        {phase === 'error' ? (
          <div className="update-dialog-error" role="alert">
            <p>{errorMessage}</p>
            <button type="button" className="update-secondary-action" onClick={onCheckAgain}>
              {t.updateTryAgain}
            </button>
          </div>
        ) : null}

        {phase === 'latest' ? (
          <>
            <dl className="update-meta update-meta-single" aria-live="polite">
              <div>
                <dt>{t.updateCurrentVersion}</dt>
                <dd>{appInfo.version}</dd>
              </div>
            </dl>
            <div className="update-dialog-actions">
              <button type="button" className="update-secondary-action" onClick={onClose}>
                {t.updateClose}
              </button>
            </div>
          </>
        ) : null}

        {update && (phase === 'available' || phase === 'downloading' || phase === 'installing') ? (
          <>
            <dl className="update-meta">
              <div>
                <dt>{t.updateCurrentVersion}</dt>
                <dd>{update.currentVersion}</dd>
              </div>
              <div>
                <dt>{t.updateNewVersion}</dt>
                <dd>{update.version}</dd>
              </div>
            </dl>
            {update.notes ? <p className="update-notes">{update.notes}</p> : null}

            {phase === 'downloading' || phase === 'installing' ? (
              <div className="update-progress" aria-live="polite">
                <div className="update-progress-label">
                  <span>{phase === 'installing' ? t.updateInstalling : t.updateDownloading}</span>
                  {percentage !== null ? <strong>{percentage}%</strong> : null}
                </div>
                <progress value={percentage ?? undefined} max="100" />
                {phase === 'installing' ? <p>{t.updateClosingForInstall}</p> : null}
              </div>
            ) : (
              <div className="update-dialog-actions">
                {distribution === 'windows-portable' ? (
                  <button type="button" className="update-primary-action" onClick={onOpenPortableDownload}>
                    <ExternalLink aria-hidden="true" />
                    {t.updateDownloadPortable}
                  </button>
                ) : (
                  <button type="button" className="update-primary-action" onClick={onInstall}>
                    <Download aria-hidden="true" />
                    {t.updateInstall}
                  </button>
                )}
                <button type="button" className="update-secondary-action" onClick={onClose}>
                  {t.updateLater}
                </button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}
